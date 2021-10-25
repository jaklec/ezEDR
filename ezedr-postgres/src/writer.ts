import {
  InitStreamInstruction,
  InitStreamResponse,
  SaveInstruction,
  SaveResponse,
  Version
} from "@jaklec/ezedr-core";
import { Client } from "./repository";

/**
 * Initialize/create a new stream. This basically means initialize a new stream
 * with `currentVersion` set to -1.
 *
 * @param client Postgres connection pool
 * @param instr `InitStreamInstruction` which contains `streamId` and `tenant`
 *
 * @returns `streamId`, `tenant` and `version`
 */
export async function initStream(
  client: Client,
  instr: InitStreamInstruction
): Promise<InitStreamResponse> {
  const { streamId, tenant } = instr;
  const rs = await client.query(
    `INSERT INTO "streams"("stream_id", "tenant_id", "version_seq") VALUES($1,$2,$3) RETURNING streams.version_seq`,
    [streamId, tenant, -1]
  );
  return {
    streamId,
    tenant,
    version: rs.rows[0].version_seq,
  };
}

/**
 * Write events to the event log using optimistic concurrency.
 *
 * The client is responsible for providing the aggregate id and the current
 * version. This version number is regarded as the `baseVersion` internally and
 * must be reflected in the `events` table in the database.
 *
 * The version in the `versions` table is incremented from current value and
 * updated regardless of whether the commit succeeds or not. The returned value
 * is to be regarded as a candidate for the new event in the log.
 *
 * Any failure to commit the event will result in a jump in the version
 * sequence. This is fine and will not affect the algorithm.
 *
 * @param client Postgres connection pool
 * @param instr `SaveInstruction` which contains all data necessary to log an event
 *
 * @returns Promise with `SaveResponse` which contains all information needed to
 * identify and work with the event (`eventId`, `streamId`, `tenant`,
 * `currentVersion`)
 */
export async function write(
  client: Client,
  instr: SaveInstruction
): Promise<SaveResponse> {
  const baseVersion = normalizeBaseVersion(instr.baseVersion);

  const version = await nextVersion(client, {
    streamId: instr.streamId,
    tenant: instr.tenant,
  });

  return writeEvent(client, {
    ...instr,
    baseVersion,
    version,
  });
}

/**
 * If the `baseVersion` is not defined or less than 0, we should set it to -1.
 *
 * @param version version number candidate
 *
 * @returns normalized version number.
 */
function normalizeBaseVersion(version?: Version): Version {
  return version !== undefined && version >= 0 ? version : -1;
}

/**
 * Increment and get the next version associated with a stream.
 *
 * @param client Postgres connection pool
 * @param opts contains `streamId` and `tenant`
 *
 * @returns a Promise with the new version number.
 */
async function nextVersion(
  client: Client,
  opts: { streamId: string; tenant: string }
): Promise<Version> {
  const rs = await client.query(
    `UPDATE "streams" SET version_seq = streams.version_seq + 1 WHERE "stream_id" = $1 AND "tenant_id" = $2 RETURNING streams.version_seq`,
    [opts.streamId, opts.tenant]
  );
  const firstRow = rs.rows[0];
  if (firstRow) {
    return firstRow.version_seq;
  }

  throw new Error(
    "Failed to update stream version. Check that it exists and that your are providing correct base version information!"
  );
}

/**
 * Append an event to a stream.
 *
 * @param client Postgres connection pool
 * @param opts all information needed to persist an
 * event record to the log.
 *
 * @returns Promise with `SaveResponse` which contains all information needed to
 * identify and work with the event (`eventId`, `streamId`, `tenant`,
 * `currentVersion`)
 */
async function writeEvent(
  client: Client,
  opts: {
    eventId: string;
    streamId: string;
    tenant: string;
    baseVersion: number;
    version: number;
    committer: string;
    eventName: string;
    payload?: string;
    info?: string;
  }
): Promise<SaveResponse> {
  return client
    .query(
      `INSERT INTO "events" ("event_id", "stream_id", "tenant_id", "base_version", "version", "event", "committer", "payload", "info", "timestamp")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING "event_id", "stream_id", "tenant_id", "version"`,
      [
        opts.eventId,
        opts.streamId,
        opts.tenant,
        opts.baseVersion,
        opts.version,
        opts.eventName,
        opts.committer,
        opts.payload,
        opts.info,
        Date.now(),
      ]
    )
    .then((res) => res.rows[0])
    .then((row) => ({
      eventId: row.event_id,
      streamId: row.stream_id,
      tenant: row.tenant_id,
      currentVersion: row.version,
    }));
}
