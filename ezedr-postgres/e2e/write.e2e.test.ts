import assert from "assert";
import { Pool } from "pg";
import {
  InitStreamResponse,
  Repository,
  SaveInstruction,
} from "@jaklec/ezedr-core";
import { Client, createClient, createRepository } from "../src/repository";

describe("e2e: Event Writer 2", () => {
  const dbPool: Pool = new Pool({
    host: "localhost",
    user: "developer",
    password: "secret",
    database: "edr_e2e",
    port: 5432,
  });

  const client: Client = createClient(dbPool);

  const repository: Repository = createRepository(client);

  const streamId = "s0";
  const tenant = "t0";
  const event: SaveInstruction = {
    eventId: "event-id",
    streamId,
    tenant,
    committer: "test-user",
    baseVersion: -1,
    eventName: "test-event",
    payload: '{"foo":"bar"}',
    info: "json",
  };
  Object.freeze(event);

  beforeEach(async () => {
    await dbPool.query("TRUNCATE events");
    await dbPool.query("TRUNCATE streams");
  });

  after(async () => {
    await dbPool.end();
  });

  it("reject event without valid stream", async () => {
    await assert.rejects(repository.save(event));

    const { rowCount } = await dbPool.query(
      'SELECT * FROM "events" WHERE "event_id" = $1',
      [event.eventId]
    );

    assert.strictEqual(rowCount, 0);
  });

  describe("valid stream", () => {
    let stream: InitStreamResponse;

    beforeEach(async () => {
      stream = await repository.initStream({
        streamId,
        tenant,
      });
    });

    it("create new stream", async () => {
      const { rowCount } = await dbPool.query(
        'SELECT * FROM "streams" WHERE "stream_id" = $1',
        ["s0"]
      );

      assert.strictEqual(rowCount, 1);
    });

    it("fail to create the same stream twice", async () => {
      await assert.rejects(repository.initStream({ streamId, tenant }));
    });

    it("add event to stream", async () => {
      await repository.save(event);

      const { rowCount, rows } = await dbPool.query(
        'SELECT * FROM "events" WHERE "event_id" = $1',
        [event.eventId]
      );

      assert.strictEqual(rowCount, 1);
      assert.strictEqual(rows[0].tenant_id, event.tenant);
      assert.strictEqual(rows[0].stream_id, event.streamId);
      assert.strictEqual(rows[0].committer, event.committer);
      assert.strictEqual(rows[0].payload, event.payload);
      assert.strictEqual(rows[0].base_version, event.baseVersion);
      assert.strictEqual(rows[0].version, 0);
    });

    it("increment version sequence during save", async () => {
      await repository.save(event);

      const { rows } = await dbPool.query(
        'SELECT * FROM "streams" WHERE "stream_id" = $1',
        [streamId]
      );

      assert.strictEqual(rows[0].version_seq, stream.version + 1);
    });

    it("reject events based on old version", async () => {
      await repository.save(event);
      const outdatedEvent = { ...event }; // make a deep copy
      await assert.rejects(repository.save(outdatedEvent));
    });

    it("rejected events should not stop future saves", async () => {
      await repository.save(event);
      await assert.rejects(repository.save({ ...event }));

      const validEvent = {
        ...event,
        eventId: "e1",
        baseVersion: event.baseVersion + 1,
      };
      await repository.save(validEvent);
      const { rowCount } = await dbPool.query(
        'SELECT * FROM "events" WHERE "stream_id" = $1',
        [event.streamId]
      );
      assert.strictEqual(rowCount, 2);
    });

    it("using a baseVersion between valid events should be rejected", async () => {
      // First we create a gap in the version sequence
      await repository.save(event); // version=0
      await assert.rejects(repository.save({ ...event })); // version=1 disqualified

      // version=2
      await repository.save({
        ...event,
        eventId: "e1",
        baseVersion: 0,
      });

      // Now, let's try to save an event based on version=1
      await assert.rejects(
        repository.save({
          ...event,
          eventId: "e1",
          baseVersion: 1,
        })
      );
    });
  });
});
