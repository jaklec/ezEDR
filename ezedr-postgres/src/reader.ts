import { Client } from "./repository";
import { AggregateId, ListResult, ReadOpts } from "@jaklec/ezedr-server";

/**
 * Read all log entries that builds the aggregate. This function could be used
 * to build views of the the current state for an aggregate or displaying audit
 * logs.
 *
 * @param client `Client` postgres connection pool
 * @param aggregateId `AggregateId`
 * @param readOpts Optional options to filter the search.
 *
 * @returns Promise with all events associated with the aggregate with some meta
 * information.
 */
export async function readAggregate(
  client: Client,
  aggregateId: AggregateId,
  readOpts?: ReadOpts
): Promise<ListResult> {
  let i = 1;
  let sqlQuery = `SELECT * FROM "events" WHERE "aggregate_id" = $${i}`;

  const params: unknown[] = [aggregateId];

  if (readOpts?.fromVersion) {
    sqlQuery += ` AND "version" >= $${++i}`;
    params.push(readOpts.fromVersion);
  }

  sqlQuery += ' ORDER BY "version" ASC';

  if (readOpts?.pagination?.limit) {
    sqlQuery += ` LIMIT $${++i}`;
    params.push(readOpts.pagination.limit);
  }

  if (readOpts?.pagination?.offset) {
    sqlQuery += ` OFFSET $${++i}`;
    params.push(readOpts.pagination.offset);
  }

  return client.query(sqlQuery, params).then((res) => {
    const events = res.rows.map((row) => ({
      version: row.version,
      event: row.event,
      data: row.data,
      committer: row.committer,
      timestamp: row.timestamp,
    }));

    return {
      aggregateId,
      fromVersion: readOpts?.fromVersion || 0,
      events,
    };
  });
}
