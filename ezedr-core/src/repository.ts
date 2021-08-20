/**
 * Type alias for a version associated to an aggregate. Implemented as a `number`.
 */
export type Version = number;

/**
 * Optional parameters to filter the search in the event log.
 *
 * @param fromVersion Start reading the log from this version. This parameter
 * could come handy when combining this function with aggregate snapshots.
 * @param limit is useful to paginate the result set.
 */
export type ReadOpts = {
  limit?: number;
  fromVersion?: Version;
};

/**
 * This error is thrown when the client is trying to write an event that
 * violates the optimistic concurrency rule set.
 */
export class EdrConcurrencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EdrConcurrencyError";
  }
}

/**
 * The response after a successful save operation.
 */
export type SaveResponse = {
  eventId: string;
  streamId: string;
  tenant: string;
  currentVersion: number;
};

/**
 * All that is needed to append an event to a stream.
 */
export type SaveInstruction = {
  eventId: string;
  streamId: string;
  tenant: string;
  eventName: string;
  baseVersion: number;
  committer: string;
  payload?: string;
  eventChain?: string[];
  info?: string;
};

/**
 * To initialize a new stream we need a `streamId` and a `tenant`.
 *
 * The `streamId` must be unique and it is the identifier of the stream.
 *
 * The `tenant` may be used for ownership or for grouping streams.
 */
export type InitStreamInstruction = {
  streamId: string;
  tenant: string;
};

/**
 * The response returned after creating a new stream.
 * It contains `streamId`, `tenant` and `version`.
 */
export type InitStreamResponse = InitStreamInstruction & {
  version: number;
};

/**
 * Create a new stream.
 */
export interface InitStream {
  /**
   * Create a new stream.
   *
   * @param instr a `InitStreamInstruction` which contains `streamId` and
   * `tenant`.
   *
   * @returns Promise containing `streamId`, `tenant` and `version`.
   */
  initStream: (instr: InitStreamInstruction) => Promise<InitStreamResponse>;
}

/**
 * Append event to stream.
 */
export interface SaveToStream {
  /**
   * Save an instruction to append an event to a stream.
   *
   * @param instr The instruction to save the event.
   *
   * @returns Promise with a response that contains all information necessary to
   * identify and use the event.
   */
  save: (instr: SaveInstruction) => Promise<SaveResponse>;
}

/**
 * Read an event stream.
 */
export interface ReadStream {
  /**
   * Read an event stream. Use the options to limit the result set.
   *
   * @param streamId
   * @param tenant
   * @param readStreamOpts limit the result set by providing `limit` (size) and
   * `fromVersion`.
   *
   * @returns Promise with `ReadStreamResult`.
   */
  readStream(
    streamId: string,
    tenant: string,
    readStreamOpts?: ReadOpts
  ): Promise<ReadStreamResult>;
}

/**
 * Represents an event record in the database.
 */
export type EventRow = {
  eventId: string;
  type: string;
  version: number;
  committer: string;
  timestamp: number;
  payload?: string;
  info?: string;
};

/**
 * The result from reading a stream. Contains meta information about the stream,
 * if the result set represents a slice of the stream and all the events
 * associated with that slice.
 */
export type ReadStreamResult = {
  streamId: string;
  tenant: string;
  page: {
    fromVersion: number;
    limit?: number;
  };
  events: EventRow[];
};

/**
 * The `Repository` contains all methods needed to create, write to and read
 * from a stream.
 */
export type Repository = InitStream & SaveToStream & ReadStream;
