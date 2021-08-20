import { Pool } from "pg";
import {
  InitStreamResponse,
  Repository,
  SaveInstruction,
} from "@jaklec/ezedr-core";
import { Client, createClient, createRepository } from "../src/repository";

// function createRepository(client: Client): Repository {
//   return {
//     initStream: async (
//       instr: InitStreamInstruction
//     ): Promise<InitStreamResponse> => {
//       return initStream(client, instr);
//     },
//     save: async (instr: SaveInstruction): Promise<SaveResponse> => {
//       return write2(client, instr);
//     },
//   };
// }

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

  afterAll(async () => {
    await dbPool.end();
  });

  test("reject event without valid stream", async () => {
    expect.assertions(2);

    await expect(repository.save(event)).rejects.toThrow();

    const { rowCount } = await dbPool.query(
      'SELECT * FROM "events" WHERE "event_id" = $1',
      [event.eventId]
    );

    expect(rowCount).toBe(0);
  });

  describe("valid stream", () => {
    let stream: InitStreamResponse;

    beforeEach(async () => {
      stream = await repository.initStream({
        streamId,
        tenant,
      });
    });

    test("create new stream", async () => {
      expect.assertions(1);

      const { rowCount } = await dbPool.query(
        'SELECT * FROM "streams" WHERE "stream_id" = $1',
        ["s0"]
      );

      expect(rowCount).toBe(1);
    });

    test("fail to create the same stream twice", async () => {
      await expect(
        repository.initStream({ streamId, tenant }) // already created above
      ).rejects.toThrow();
    });

    test("add event to stream", async () => {
      expect.assertions(7);

      await repository.save(event);

      const { rowCount, rows } = await dbPool.query(
        'SELECT * FROM "events" WHERE "event_id" = $1',
        [event.eventId]
      );

      expect(rowCount).toBe(1);
      expect(rows[0].tenant_id).toBe(event.tenant);
      expect(rows[0].stream_id).toBe(event.streamId);
      expect(rows[0].committer).toBe(event.committer);
      expect(rows[0].payload).toBe(event.payload);
      expect(rows[0].base_version).toBe(event.baseVersion);
      expect(rows[0].version).toBe(0);
    });

    test("increment version sequence during save", async () => {
      await repository.save(event);

      const { rows } = await dbPool.query(
        'SELECT * FROM "streams" WHERE "stream_id" = $1',
        [streamId]
      );

      expect(rows[0].version_seq).toBe(stream.version + 1);
    });

    test("reject events based on old version", async () => {
      await repository.save(event);
      const outdatedEvent = { ...event }; // make a deep copy
      await expect(repository.save(outdatedEvent)).rejects.toThrow();
    });

    test("rejected events should not stop future saves", async () => {
      expect.assertions(2);
      await repository.save(event);
      await expect(repository.save({ ...event })).rejects.toThrow();

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
      expect(rowCount).toBe(2);
    });

    test("using a baseVersion between valid events should be rejected", async () => {
      expect.assertions(2);
      // First we create a gap in the version sequence
      await repository.save(event); // version=0
      await expect(repository.save({ ...event })).rejects.toThrow(); // version=1 disqualified

      // version=2
      await repository.save({
        ...event,
        eventId: "e1",
        baseVersion: 0,
      });

      // Now, let's try to save an event based on version=1
      await expect(
        // version=2
        repository.save({
          ...event,
          eventId: "e1",
          baseVersion: 1,
        })
      ).rejects.toThrow();
    });
  });
});
