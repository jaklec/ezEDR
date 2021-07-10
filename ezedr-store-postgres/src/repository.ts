import { Pool, QueryResult } from "pg";

export type AggregateId = string;
export type Event = string;

export type Instruction<T> = {
  aggregateId: AggregateId;
  event: Event;
  version: number;
  committer: string;
  data?: T;
  eventChain?: string[];
};

export type CommitResponse = {
  aggregateId: AggregateId;
  currentVersion: number;
  snapshotVersion: number;
  timestamp: number;
};

export interface Repository {
  save: <T>(instr: Instruction<T>) => Promise<CommitResponse>;
}

export const createRepository = (client: Pool): Repository => ({
  save: async <T>(instr: Instruction<T>): Promise<CommitResponse> => {
    const saveVersion = async () => {
      if (instr.version === 0) {
        return client
          .query(
            `INSERT INTO "versions"("aggregate_id","version") VALUES($1,$2) RETURNING versions.version`,
            [instr.aggregateId, instr.version]
          )
          .then((rs) => rs.rows[0].version);
      } else {
        return client
          .query(
            `UPDATE "versions" SET version = versions.version + 1 WHERE "aggregate_id" = $1 RETURNING versions.version`,
            [instr.aggregateId]
          )
          .then((rs) => rs.rows[0].version);
      }
    };

    const version: number = await saveVersion();
    const baseVersion: number = instr.version;

    return client
      .query(
        `INSERT INTO "events" ("aggregate_id", "event", "base_version", "version", "timestamp", "committer", "data")
                    VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING "aggregate_id", "version", "snapshot_version" "timestamp"`,
        [
          instr.aggregateId,
          instr.event,
          baseVersion,
          version,
          Date.now(),
          instr.committer,
          instr.data,
        ]
      )
      .then((res: QueryResult): CommitResponse => {
        const r = res.rows[0];
        return {
          aggregateId: r.aggregate_id,
          currentVersion: r.version,
          snapshotVersion: r.snapshot_version,
          timestamp: r.timestamp,
        };
      });
  },
});
