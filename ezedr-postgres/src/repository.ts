import { Pool, QueryResult } from "pg";
import { readAggregate } from "./reader";
import {
  AggregateId,
  CommitResponse,
  Instruction,
  ListResult,
  ReadOpts,
  Repository,
} from "@jaklec/ezedr-core";

import { write } from "./writer";

/**
 * Wrapper around Postgres connection pool.
 */
export interface Client {
  query(query: string, params?: unknown[]): Promise<QueryResult>;
}

/**
 * Factory function to create database client intended for use with repository.
 *
 * @param pool Postgres connection pool
 *
 * @returns wrapper around postgres connection pool `Client`.
 */
export function createClient(pool: Pool): Client {
  return {
    query: (query, params) => pool.query(query, params),
  };
}

/**
 * Factory function to create a Postgres `Repository`.
 *
 * @param client Database client
 *
 * @returns Repository
 */
export function createRepository(client: Client): Repository {
  return {
    save: async <T>(instr: Instruction<T>): Promise<CommitResponse> =>
      write(client, instr),
    readAggregate: async (
      aggregateId: AggregateId,
      readOpts?: ReadOpts
    ): Promise<ListResult> => readAggregate(client, aggregateId, readOpts),
  };
}
