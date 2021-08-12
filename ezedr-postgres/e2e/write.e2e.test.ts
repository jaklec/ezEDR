import { Pool } from "pg";
import { Instruction, Repository } from "@jaklec/ezedr-core";
import { Client, createClient, createRepository } from "../src/repository";

/*
 * End to end test for writing to the log.
 */
describe("e2e: Event Writer", () => {
  const dbPool: Pool = new Pool({
    host: "localhost",
    user: "developer",
    password: "secret",
    database: "edr_e2e",
    port: 5432,
  });

  const client: Client = createClient(dbPool);

  const repository: Repository = createRepository(client);

  beforeEach(async () => {
    await dbPool.query("TRUNCATE versions");
    await dbPool.query("TRUNCATE events");
  });

  afterAll(async () => {
    await dbPool.end();
  });

  /*
   * The `Repository` should save an `Instruction` record to the "events" table.
   */
  test("save event", async () => {
    expect.assertions(3);

    const instruction: Instruction<unknown> = {
      aggregateId: "123",
      event: "test-event",
      committer: "test-user",
      data: { payload: "test-data" },
    };

    await repository.save(instruction);

    const { rowCount, rows } = await dbPool.query(
      'SELECT * FROM "events" WHERE "aggregate_id" = $1',
      [instruction.aggregateId]
    );

    expect(rowCount).toBe(1);
    expect(rows[0].committer).toBe("test-user");
    expect(JSON.parse(rows[0].data)).toEqual({ payload: "test-data" });
  });

  /*
   * Before saving an `Instruction` to the "events" table, the save operation
   * should acquire a new version candidate.
   */
  test("save version", async () => {
    expect.assertions(2);

    const instruction: Instruction<unknown> = {
      aggregateId: "123",
      event: "test-event",
      committer: "test-user",
      data: { payload: "test-data" },
    };

    await repository.save(instruction);

    const { rowCount, rows } = await dbPool.query(
      'SELECT * FROM "versions" WHERE "aggregate_id" = $1',
      ["123"]
    );

    expect(rowCount).toBe(1);
    expect(rows[0].version).toBe(0);
  });

  /*
   * It's the clients responsibility to keep track of the version when
   * updating an aggregate. The save operation should be accepted as long
   * as the client is updating with a valid version number.
   */
  test("incremental versions on multiple saves", async () => {
    expect.assertions(2);

    const instruction0: Instruction<unknown> = {
      aggregateId: "123",
      event: "test-event",
      baseVersion: -1,
      committer: "test-user",
      data: { payload: "test-data" },
    };

    const instruction1: Instruction<unknown> = {
      ...instruction0,
      baseVersion: 0,
    };

    await repository.save(instruction0);
    await repository.save(instruction1);

    const { rowCount, rows } = await dbPool.query(
      'SELECT * FROM "versions" WHERE "aggregate_id" = $1',
      ["123"]
    );

    expect(rowCount).toBe(1);
    expect(rows[0].version).toBe(1);
  });

  /*
   * There is no base version when we are creating a new aggregate. Let's set
   * the base version number to -1 to avoid null values.
   */
  test("set initial base version to -1", async () => {
    const instruction: Instruction<unknown> = {
      aggregateId: "123",
      event: "test-event",
      committer: "test-user",
      data: { payload: "test-data" },
    };

    await repository.save(instruction);

    const { rows } = await dbPool.query(
      'SELECT * FROM "events" WHERE "aggregate_id" = $1',
      ["123"]
    );

    expect(rows[0].base_version).toBe(-1);
  });

  /*
   * The save operation should be rejected if the client tries to update
   * the aggregate with an outdated version number.
   */
  test("reject old base version", async () => {
    expect.assertions(1);

    const instruction: Instruction<unknown> = {
      aggregateId: "123",
      event: "test-event",
      baseVersion: -1,
      committer: "test-user",
      data: { payload: "test-data" },
    };

    await repository.save(instruction);

    // This instruction has already added an event to the log.
    await expect(repository.save(instruction)).rejects.toThrow();
  });

  /*
   * The save operation should be rejected if the client is trying to create
   * a new aggregate with a version number other than 0.
   */
  test("reject new aggregates with base version >= 0", async () => {
    expect.assertions(1);

    const instruction: Instruction<unknown> = {
      aggregateId: "123",
      event: "test-event",
      baseVersion: 0,
      committer: "test-user",
      data: { payload: "test-data" },
    };

    await expect(repository.save(instruction)).rejects.toThrow();
  });

  /*
   * The fact that the version number is always incremented regardless of
   * whether the instruction is valid or not should not affect future
   * save operations.
   */
  test("accept valid instructions after previous rejection", async () => {
    expect.assertions(4);

    const valid0: Instruction<unknown> = {
      aggregateId: "123",
      event: "test-event",
      committer: "test-user",
      data: { payload: "test-data" },
    };

    try {
      await repository.save(valid0);

      const invalid: Instruction<unknown> = { ...valid0 }; // This has already been recorded!
      await expect(repository.save(invalid)).rejects.toThrow();

      const valid1: Instruction<unknown> = { ...valid0, baseVersion: 0 };
      await repository.save(valid1);

      const { rowCount, rows } = await dbPool.query(
        'SELECT * FROM "events" WHERE "aggregate_id" = $1 ORDER BY "sequence_number";',
        [valid1.aggregateId]
      );

      expect(rowCount).toBe(2);
      expect(rows[0].version).toBe(0);
      expect(rows[1].version).toBe(1);
    } catch (err) {
      console.log(err);
    }
  });

  /*
   * To facilitate concurrency, the aggregate version should be coupled to
   * the event type. Collisions should occur only within the scope of a
   * certain event.
   */
  test.only("version is coupled to event type", async () => {
    expect.assertions(5);

    try {
      const createOrder: Instruction<unknown> = {
        aggregateId: "123",
        event: "ORDER_CREATED",
        committer: "test-user",
        data: { drink: "milk", food: "pasta" },
      };

      await repository.save(createOrder);

      const updateDrinkValid: Instruction<unknown> = {
        ...createOrder,
        event: "ORDER_DRINK_WAS_UPDATED",
        baseVersion: 1,
        data: { drink: "wine" },
      };

      await repository.save(updateDrinkValid);

      // Create a new instruction based on an outdated version. This should be
      // rejected!
      const updateDrinkInvalid: Instruction<unknown> = {
        ...updateDrinkValid,
        baseVersion: 1,
        data: { drink: "water" },
      };

      await expect(repository.save(updateDrinkInvalid)).rejects.toThrow();

      // Update the food based on an outdated version.
      // There is no conflict here, so this should be accepted.
      const updateFood: Instruction<unknown> = {
        ...createOrder,
        event: "ORDER_FOOD_WAS_UPDATED",
        baseVersion: 1,
        data: { food: "fish" },
      };

      await repository.save(updateFood);

      const { rowCount, rows } = await dbPool.query(
        'SELECT * FROM "events" WHERE "aggregate_id" = $1 ORDER BY "sequence_number";',
        [createOrder.aggregateId]
      );

      expect(rowCount).toBe(3);
      expect(JSON.parse(rows[0].data)).toEqual({
        drink: "milk",
        food: "pasta",
      });
      expect(JSON.parse(rows[1].data)).toEqual({ drink: "wine" });
      expect(JSON.parse(rows[2].data)).toEqual({ food: "fish" });
    } catch (err) {
      console.log(err);
    }
  });

  /*
   * Always returning the current version of the aggregate after a write
   * operation makes writing clients easier!
   */
  test("return id and current version of the aggregate", async () => {
    expect.assertions(1);

    const instruction: Instruction<unknown> = {
      aggregateId: "123",
      event: "test-event",
      committer: "test-user",
      data: { payload: "test-data" },
    };

    const result = await repository.save(instruction);

    expect(result).toMatchObject({
      aggregateId: "123",
      currentVersion: 0,
    });
  });
});
