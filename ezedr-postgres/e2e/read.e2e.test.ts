import assert from "assert";
import { SaveInstruction } from "@jaklec/ezedr-core";
import { Pool, QueryResult } from "pg";
import { Client, createClient, createRepository } from "../src/repository";

describe("e2e: Event Reader", () => {
  const dbPool: Pool = new Pool({
    host: "localhost",
    user: "developer",
    password: "secret",
    database: "edr_e2e",
    port: 5432,
  });

  const client: Client = createClient(dbPool);

  const repository = createRepository(client);

  const orderCreated = {
    eventName: "ORDER_WAS_CREATED",
    baseVersion: -1,
    committer: "test-user",
    payload: JSON.stringify({ drink: "milk", food: "pasta" }),
    info: "protocol: json",
  };
  const drinkUpdated = {
    eventName: "ORDER_DRINK_WAS_UPDATED",
    baseVersion: 0,
    committer: "test-user",
    payload: JSON.stringify({ drink: "wine" }),
    info: "protocol: json",
  };
  const foodUpdated = {
    eventName: "ORDER_FOOD_WAS_UPDATED",
    baseVersion: 1,
    committer: "test-user",
    payload: JSON.stringify({ food: "sushi" }),
    info: "protocol: json",
  };

  beforeEach(async () => {
    await dbPool.query("TRUNCATE events");
  });

  after(async () => {
    await dbPool.end();
  });

  /*
   * Reading an aggregate is reading all the events in order. It's up to the
   * client to aggregate all the events to the final state. The `readAggregate`
   * method should read all events associated with a certain aggregate.
   */
  it("Read all event associated with an aggregate", async () => {
    try {
      // Insert three events into the log
      await insertEventRecord(dbPool, {
        ...orderCreated,
        eventId: "e0",
        streamId: "s0",
        tenant: "default",
      });
      await insertEventRecord(dbPool, {
        ...orderCreated,
        eventId: "e1",
        streamId: "s1",
        tenant: "default",
      });
      await insertEventRecord(dbPool, {
        ...drinkUpdated,
        eventId: "e2",
        streamId: "s0",
        tenant: "default",
      });

      // Execute!
      const events = await repository.readEvents("s0", "default");

      // We should only have two events at this point
      assert.strictEqual(events.streamId, "s0");
      assert.strictEqual(events.events.length, 2);
    } catch (err) {
      console.log(err);
    }
  });

  /*
   * Events should appear in ascending order with respect to the aggregate
   * version to make the data aggregation smoother.
   */
  it("Events should appear in ascending order", async () => {
    await insertEventRecord(dbPool, {
      ...orderCreated,
      eventId: "e0",
      streamId: "s0",
      tenant: "default",
    });
    await insertEventRecord(dbPool, {
      ...drinkUpdated,
      eventId: "e2",
      streamId: "s0",
      tenant: "default",
    });
    const events = await repository.readEvents("s0", "default");

    assert.strictEqual(events.events[0].version, 0);
    assert.strictEqual(events.events[1].version, 1);
  });

  /*
   * If an aggregate is built up from a large amount of events, it could make
   * sense to optimize the reading operation by using snapshots. In such
   * scenario, the client would probably want to start reading from a certain
   * version.
   */
  it("Start reading from version", async () => {
    await insertEventRecord(dbPool, {
      ...orderCreated,
      eventId: "e0",
      streamId: "s0",
      tenant: "default",
    });
    await insertEventRecord(dbPool, {
      ...drinkUpdated,
      eventId: "e2",
      streamId: "s0",
      tenant: "default",
    });
    const events = await repository.readEvents("s0", "default", {
      fromVersion: 1,
    });

    assert.strictEqual(events.events.length, 1);
    assert.strictEqual(events.events[0].version, 1);
  });

  /*
   * If the client wants to read the entire log (without snapshots) for am
   * aggregate with a very long history of events, it could be wise to use
   * pagination.
   */
  it("Pagination", async () => {
    await insertEventRecord(dbPool, {
      ...orderCreated,
      eventId: "e0",
      streamId: "s0",
      tenant: "default",
    });
    await insertEventRecord(dbPool, {
      ...drinkUpdated,
      eventId: "e2",
      streamId: "s0",
      tenant: "default",
    });
    await insertEventRecord(dbPool, {
      ...foodUpdated,
      eventId: "e3",
      streamId: "s0",
      tenant: "default",
    });

    const page0 = await repository.readEvents("s0", "default", {
      limit: 2,
    });

    assert.strictEqual(page0.events.length, 2);
    assert.strictEqual(page0.events[0].version, 0);
    assert.strictEqual(page0.events[1].version, 1);

    const page1 = await repository.readEvents("s0", "default", {
      limit: 2,
      fromVersion: 2,
    });

    assert.strictEqual(page1.events.length, 1); // We have drained the log at this point
    assert.strictEqual(page1.events[0].version, 2);
  });
});

function insertEventRecord(
  client: Pool,
  data: SaveInstruction
): Promise<QueryResult> {
  return client.query(
    `INSERT INTO "events" (
        "event_id", 
        "stream_id", 
        "tenant_id",
        "event",
        "base_version", 
        "version", 
        "timestamp", 
        "committer", 
        "payload",
        "info") 
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      data.eventId,
      data.streamId,
      data.tenant,
      data.eventName,
      data.baseVersion,
      data.baseVersion + 1,
      Date.now(),
      data.committer,
      data.payload,
      data.info,
    ]
  );
}
