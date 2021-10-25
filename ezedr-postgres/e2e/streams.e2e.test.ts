import assert from "assert";
import { NoSuchResourceError } from "@jaklec/ezedr-core";
import { Pool } from "pg";
import { Client, createClient, createRepository } from "../src/repository";

describe("e2e: Reading streams meta data", () => {
  const dbPool: Pool = new Pool({
    host: "localhost",
    user: "developer",
    password: "secret",
    database: "edr_e2e",
    port: 5432,
  });

  const client: Client = createClient(dbPool);

  const repository = createRepository(client);

  beforeEach(async () => {
    await dbPool.query("TRUNCATE streams");
  });

  after(async () => {
    await dbPool.end();
  });

  it("Read stream info", async () => {
    await dbPool.query(
      'INSERT INTO streams("stream_id", "tenant_id", "version_seq") VALUES ($1,$2,$3)',
      ["s0", "t0", "42"]
    );

    const streamInfo = await repository.readStream("s0", "t0");

    assert.deepStrictEqual(streamInfo, {
      streamId: "s0",
      tenant: "t0",
      currentVersion: 42,
    });
  });

  it("Stream does not exist", async () => {
    await assert.rejects(
      repository.readStream("i-do-not-exist", "default"),
      (err: unknown) => {
        if (!(err instanceof NoSuchResourceError)) {
          throw new Error("Unexpected error category.");
        }
        return true;
      }
    );
  });
});
