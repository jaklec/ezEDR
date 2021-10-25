import { Client } from "./repository";
import {
  ReadOpts,
  ReadEventsResult,
  EventRow,
  ReadStreamResult,
  NoSuchResourceError,
} from "@jaklec/ezedr-core";
import { QueryResult } from "pg";

/**
 * Read all events posted to a stream. This function could be used
 * to build views of the the current state for an aggregate or displaying audit
 * logs.
 *
 * @param client `Client` postgres connection pool
 * @param streamId The id of the stream
 * @param tenant The 'owner' of the stream
 * @param readOpts Optional options to filter the search.
 *
 * @returns Promise with all events associated with the stream with some meta
 * information.
 */
export async function readEvents(
  client: Client,
  streamId: string,
  tenant: string,
  readOpts?: ReadOpts
): Promise<ReadEventsResult> {
  let i = 1;
  let sqlQuery = `SELECT * FROM "events" WHERE "stream_id" = $${i} AND "tenant_id" = $${++i}`;

  const params: unknown[] = [streamId, tenant];

  if (readOpts?.fromVersion) {
    sqlQuery += ` AND "version" >= $${++i}`;
    params.push(readOpts.fromVersion);
  }

  sqlQuery += ' ORDER BY "version" ASC';

  if (readOpts?.limit) {
    sqlQuery += ` LIMIT $${++i}`;
    params.push(readOpts.limit);
  }

  return client.query(sqlQuery, params).then((res) => {
    const events: EventRow[] = res.rows.map((row) => ({
      eventId: row.event_id,
      version: row.version,
      timestamp: row.timestamp,
      committer: row.committer,
      type: row.event,
      payload: row.payload,
      info: row.info,
    }));

    return {
      streamId,
      tenant,
      page: {
        fromVersion: readOpts?.fromVersion || 0,
        limit: readOpts?.limit,
      },
      events,
    };
  });
}

/**
 * Read stream meta data.
 * @param client `Client` wrapper
 * @param streamId
 * @param tenant
 * @returns Promise with `ReadStreamResult`
 * @throws `NoSuchResourceError` when stream doesn't exist.
 */
export async function readStream(
  client: Client,
  streamId: string,
  tenant: string
): Promise<ReadStreamResult> {
  return client
    .query("SELECT * FROM streams WHERE stream_id = $1 AND tenant_id = $2", [
      streamId,
      tenant,
    ])
    .then((res: QueryResult) => {
      if (res.rows.length > 0) {
        const row = res.rows[0];
        return {
          streamId: row.stream_id,
          tenant: row.tenant_id,
          currentVersion: row.version_seq,
        };
      } else {
        throw new NoSuchResourceError("Could not find stream.");
      }
    });
}
