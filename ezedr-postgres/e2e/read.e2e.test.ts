import { Pool, QueryResult } from "pg";
import { AggregateId, Repository, Version } from "@jaklec/ezedr-server";
import { Client, createClient, createRepository } from "../src/repository";

/*
 * End to end test for reading operations against the log.
 */
describe("e2e: Event Reader", () => {
  const dbPool: Pool = new Pool({
    host: "localhost",
    user: "developer",
    password: "secret",
    database: "edr_e2e",
    port: 5432,
  });

  const client: Client = createClient(dbPool);

  const repository: Repository = createRepository(client);

  const orderCreated = {
    event: "ORDER_WAS_CREATED",
    baseVersion: -1,
    version: 0,
    committer: "test-user",
    data: JSON.stringify({ drink: "milk", food: "pasta" }),
  };
  const drinkUpdated = {
    event: "ORDER_DRINK_WAS_UPDATED",
    baseVersion: 0,
    version: 1,
    committer: "test-user",
    data: JSON.stringify({ drink: "wine" }),
  };
  const foodUpdated = {
    event: "ORDER_FOOD_WAS_UPDATED",
    baseVersion: 1,
    version: 2,
    committer: "test-user",
    data: JSON.stringify({ food: "sushi" }),
  };

  beforeEach(async () => {
    await dbPool.query("TRUNCATE events");
  });

  afterAll(async () => {
    await dbPool.end();
  });

  /*
   * Reading an aggregate is reading all the events in order. It's up to the
   * client to aggregate all the events to the final state. The `readAggregate`
   * method should read all events associated with a certain aggregate.
   */
  test("Read all event associated with an aggregate", async () => {
    expect.assertions(2);

    // Insert three events into the log
    await insertEventRecord(dbPool, {
      ...orderCreated,
      aggregateId: "123",
      timestamp: Date.now(),
    });
    await insertEventRecord(dbPool, {
      ...orderCreated,
      aggregateId: "456",
      timestamp: Date.now(),
    });
    await insertEventRecord(dbPool, {
      ...drinkUpdated,
      aggregateId: "123",
      timestamp: Date.now(),
    });

    // Execute!
    const events = await repository.readAggregate("123");

    // We should only have two events at this point
    expect(events.aggregateId).toBe("123");
    expect(events.events.length).toBe(2);
  });

  /*
   * Events should appear in ascending order with respect to the aggregate
   * version to make the data aggregation smoother.
   */
  test("Events should appear in ascending order", async () => {
    expect.assertions(2);

    await insertEventRecord(dbPool, {
      ...orderCreated,
      aggregateId: "123",
      timestamp: Date.now(),
    });
    await insertEventRecord(dbPool, {
      ...drinkUpdated,
      aggregateId: "123",
      timestamp: Date.now(),
    });

    const events = await repository.readAggregate("123");

    expect(events.events[0].version).toBe(0);
    expect(events.events[1].version).toBe(1);
  });

  /*
   * If an aggregate is built up from a large amount of events, it could make
   * sense to optimize the reading operation by using snapshots. In such
   * scenario, the client would probably want to start reading from a certain
   * version.
   */
  test("Start reading from version", async () => {
    expect.assertions(2);

    await insertEventRecord(dbPool, {
      ...orderCreated,
      aggregateId: "123",
      timestamp: Date.now(),
    });
    await insertEventRecord(dbPool, {
      ...drinkUpdated,
      aggregateId: "123",
      timestamp: Date.now(),
    });

    const events = await repository.readAggregate("123", { fromVersion: 1 });

    expect(events.events.length).toBe(1);
    expect(events.events[0].version).toBe(1);
  });

  /*
   * If the client wants to read the entire log (without snapshots) for am
   * aggregate with a very long history of events, it could be wise to use
   * pagination.
   */
  test("Pagination", async () => {
    expect.assertions(5);

    await insertEventRecord(dbPool, {
      ...orderCreated,
      aggregateId: "123",
      timestamp: Date.now(),
    });
    await insertEventRecord(dbPool, {
      ...drinkUpdated,
      aggregateId: "123",
      timestamp: Date.now(),
    });
    await insertEventRecord(dbPool, {
      ...foodUpdated,
      aggregateId: "123",
      timestamp: Date.now(),
    });

    const page0 = await repository.readAggregate("123", {
      pagination: { limit: 2 },
    });

    expect(page0.events.length).toBe(2);
    expect(page0.events[0].version).toBe(0);
    expect(page0.events[1].version).toBe(1);

    const page1 = await repository.readAggregate("123", {
      pagination: { limit: 2, offset: 2 },
    });

    expect(page1.events.length).toBe(1); // We have drained the log at this point
    expect(page1.events[0].version).toBe(2);
  });
});

type EventData = {
  aggregateId: AggregateId;
  event: string;
  baseVersion: Version;
  version: Version;
  timestamp: number;
  committer: string;
  data: string;
};

function insertEventRecord(
  client: Pool,
  data: EventData
): Promise<QueryResult> {
  return client.query(
    `INSERT INTO "events" (
        "aggregate_id", 
        "event", 
        "base_version", 
        "version", 
        "timestamp", 
        "committer", 
        "data") 
                 VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      data.aggregateId,
      data.event,
      data.baseVersion,
      data.version,
      data.timestamp,
      data.committer,
      data.data,
    ]
  );
}
