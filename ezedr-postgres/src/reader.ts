import { Client } from "./repository";
import { ReadOpts, ReadStreamResult, EventRow } from "@jaklec/ezedr-core";

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
export async function readStream(
  client: Client,
  streamId: string,
  tenant: string,
  readOpts?: ReadOpts
): Promise<ReadStreamResult> {
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
