import { AggregateId, CommitResponse, Instruction } from ".";
import { Client } from "./postgres-repository";

type Version = number;

/**
 * Write events to the log using optimistic concurrency.
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
 * A precondition for the algorithm to work is that there is a unique constraint
 * in the database on `aggregateId`, `baseVersion` and `event`.
 *
 * @param client Postgres connection pool
 * @param instr `Instruction` which contains all data necessary to create a log
 * record.
 *
 * @returns Promise with `CommitResponse` which contains aggregate id and
 * current version number.
 */
export async function write<T>(
  client: Client,
  instr: Instruction<T>
): Promise<CommitResponse> {
  const { aggregateId, event, committer, data } = instr;

  const version = await writeVersion(client, {
    aggregateId,
    version: instr.version,
  });

  const baseVersion: number = instr.version;

  return writeEvent(client, {
    aggregateId,
    event,
    baseVersion,
    version,
    committer,
    data,
  });
}

/**
 * Write the version to the `versions` table.
 * This function is accepting any version greater than or equal
 * to 0. If the version is 0 a new record is created. Otherwise the existing version
 * is incremented. The value return should be considered a version number of a
 * commit candidate.
 *
 * @param client Postgres connection pool
 * @param opts `AggregateId` and `Version` of the event.
 *
 * @returns Promise with new version number
 */
async function writeVersion(
  client: Client,
  opts: {
    aggregateId: AggregateId;
    version: Version;
  }
): Promise<Version> {
  const { aggregateId, version } = opts;

  if (version < 0) {
    throw new Error(
      "Invalid version - numbers less than zero are not allowed."
    );
  }

  if (version === 0) {
    const rs = await client.query(
      `INSERT INTO "versions"("aggregate_id","version") VALUES($1,$2) RETURNING versions.version`,
      [aggregateId, version]
    );
    return rs.rows[0].version;
  } else {
    const rs_1 = await client.query(
      `UPDATE "versions" SET version = versions.version + 1 WHERE "aggregate_id" = $1 RETURNING versions.version`,
      [aggregateId]
    );
    return rs_1.rows[0].version;
  }
}

/**
 * Write an event to the log.
 *
 * @param client Postgres connection pool
 * @param opts `EventOptions` contains all information needed to persist an
 * event record to the log.
 *
 * @returns Promise with a `CommitResponse`.
 */
async function writeEvent<T>(
  client: Client,
  opts: {
    aggregateId: AggregateId;
    event: string;
    baseVersion: Version;
    version: Version;
    committer: string;
    data: T;
  }
): Promise<CommitResponse> {
  return client
    .query(
      `INSERT INTO "events" ("aggregate_id", "event", "base_version", "version", "timestamp", "committer", "data")
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING "aggregate_id", "version", "timestamp"`,
      [
        opts.aggregateId,
        opts.event,
        opts.baseVersion,
        opts.version,
        Date.now(),
        opts.committer,
        opts.data,
      ]
    )
    .then((res) => res.rows[0])
    .then((row) => ({
      aggregateId: row.aggregate_id,
      currentVersion: row.version,
      timestamp: row.timestamp,
    }))
    .catch((err) => {
      if (err.code === "23505" /* duplicate key violation */) {
        throw new Error(`Concurrency Error: ${err.message} - ${err.detail}`);
        // throw new EdrConcurrencyError(`${err.message} - ${err.detail}`);
      } else {
        throw err;
      }
    });
}
