import { Pool } from "pg";
import { createRepository, Instruction } from "../src/repository";

describe("Event Writer", () => {
  const dbPool: Pool = new Pool({
    host: "localhost",
    user: "developer",
    password: "secret",
    database: "edr_e2e",
    port: 5432,
  });

  const repository = createRepository(dbPool);

  beforeEach(async () => {
    await dbPool.query("TRUNCATE versions");
    await dbPool.query("TRUNCATE events");
  });

  afterAll(async () => {
    await dbPool.end();
  });

  test("save event", async () => {
    /*
     * The `Repository` should save an `Instruction` record to the "events" table.
     */
    expect.assertions(3);

    const instruction: Instruction<unknown> = {
      aggregateId: "123",
      event: "test-event",
      version: 0,
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

  test("save version", async () => {
    /*
     * Before saving an `Instruction` to the "events" table, the save operation
     * should acquire a new version candidate.
     */
    expect.assertions(2);

    const instruction: Instruction<unknown> = {
      aggregateId: "123",
      event: "test-event",
      version: 0,
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

  test("incremental versions on multiple saves", async () => {
    /*
     * It's the clients responsibility to keep track of the version when
     * updating an aggregate. The save operation should be accepted as long
     * as the client is updating with a valid version number.
     */
    expect.assertions(2);

    const instruction0: Instruction<unknown> = {
      aggregateId: "123",
      event: "test-event",
      version: 0,
      committer: "test-user",
      data: { payload: "test-data" },
    };

    const instruction1: Instruction<unknown> = { ...instruction0, version: 1 };

    await repository.save(instruction0);
    await repository.save(instruction1);

    const { rowCount, rows } = await dbPool.query(
      'SELECT * FROM "versions" WHERE "aggregate_id" = $1',
      ["123"]
    );

    expect(rowCount).toBe(1);
    expect(rows[0].version).toBe(1);
  });

  test("reject old base version", async () => {
    /*
     * The save operation should be rejected if the client tries to update
     * the aggregate with an outdated version number.
     */
    expect.assertions(1);

    const instruction: Instruction<unknown> = {
      aggregateId: "123",
      event: "test-event",
      version: 0,
      committer: "test-user",
      data: { payload: "test-data" },
    };

    await repository.save(instruction);

    // This instruction has already added an event to the log.
    await expect(repository.save(instruction)).rejects.toThrow();
  });

  test("reject new aggregates with version !== 0", async () => {
    /*
     * The save operation should be rejected if the client is trying to create
     * a new aggregate with a version number other than 0.
     */
    expect.assertions(1);

    const instruction: Instruction<unknown> = {
      aggregateId: "123",
      event: "test-event",
      version: 1,
      committer: "test-user",
      data: { payload: "test-data" },
    };

    await expect(repository.save(instruction)).rejects.toThrow();
  });

  test("accept valid instructions after previous rejection", async () => {
    /*
     * The fact that the version number is always incremented regardless of
     * whether the instruction is valid or not should not affect future
     * save operations.
     */
    expect.assertions(4);

    const valid0: Instruction<unknown> = {
      aggregateId: "123",
      event: "test-event",
      version: 0,
      committer: "test-user",
      data: { payload: "test-data" },
    };

    await repository.save(valid0);

    const invalid: Instruction<unknown> = { ...valid0 }; // This has already been recorded!
    await expect(repository.save(invalid)).rejects.toThrow();

    const valid1: Instruction<unknown> = { ...valid0, version: 1 };
    await repository.save(valid1);

    const { rowCount, rows } = await dbPool.query(
      'SELECT * FROM "events" WHERE "aggregate_id" = $1 ORDER BY "sequence_number";',
      [valid1.aggregateId]
    );

    expect(rowCount).toBe(2);
    expect(rows[0].version).toBe(0);
    expect(rows[1].version).toBe(1);
  });

  test("version is coupled to event type", async () => {
    /*
     * To facilitate concurrency, the aggregate version should be coupled to
     * the event type. Collisions should occur only within the scope of a
     * certain event.
     */
    expect.assertions(5);

    const createOrder: Instruction<unknown> = {
      aggregateId: "123",
      event: "ORDER_CREATED",
      version: 0,
      committer: "test-user",
      data: { drink: "milk", food: "pasta" },
    };

    await repository.save(createOrder);

    const updateDrinkValid: Instruction<unknown> = {
      ...createOrder,
      event: "ORDER_DRINK_WAS_UPDATED",
      version: 1,
      data: { drink: "wine" },
    };

    await repository.save(updateDrinkValid);

    // Create a new instruction based on an outdated version. This should be
    // rejected!
    const updateDrinkInvalid: Instruction<unknown> = {
      ...updateDrinkValid,
      version: 1,
      data: { drink: "water" },
    };

    await expect(repository.save(updateDrinkInvalid)).rejects.toThrow();

    // Update the food based on an outdated version.
    // There is no conflict here, so this should be accepted.
    const updateFood: Instruction<unknown> = {
      ...createOrder,
      event: "ORDER_FOOD_WAS_UPDATED",
      version: 1,
      data: { food: "fish" },
    };

    await repository.save(updateFood);

    const { rowCount, rows } = await dbPool.query(
      'SELECT * FROM "events" WHERE "aggregate_id" = $1 ORDER BY "sequence_number";',
      [createOrder.aggregateId]
    );

    expect(rowCount).toBe(3);
    expect(JSON.parse(rows[0].data)).toEqual({ drink: "milk", food: "pasta" });
    expect(JSON.parse(rows[1].data)).toEqual({ drink: "wine" });
    expect(JSON.parse(rows[2].data)).toEqual({ food: "fish" });
  });
});
