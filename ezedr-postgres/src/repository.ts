import { Pool, QueryResult } from "pg";
import { readEvents, readStream } from "./reader";
import {
  InitStreamInstruction,
  InitStreamResponse,
  ReadEventsResult,
  ReadStreamResult,
  Repository,
  SaveInstruction,
  SaveResponse,
} from "@jaklec/ezedr-core";

import { initStream, write } from "./writer";

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
    initStream: async (
      instr: InitStreamInstruction
    ): Promise<InitStreamResponse> => initStream(client, instr),
    save: async (instr: SaveInstruction): Promise<SaveResponse> =>
      write(client, instr),
    readEvents: async (streamId, tenant, opts): Promise<ReadEventsResult> =>
      readEvents(client, streamId, tenant, opts),
    readStream: async (streamId, tenant): Promise<ReadStreamResult> =>
      readStream(client, streamId, tenant),
  };
}
