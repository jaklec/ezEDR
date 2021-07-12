/**
 * Type alias for the ID of an Aggregate implemented as a `string`.
 */
export type AggregateId = string;

/**
 * Type alias for an event definition or event name implemented as a `string`.
 * This should typically be a unique name representing the event in past tense.
 */
export type Event = string;

/**
 * Type alias for a version associated to an aggregate. Implemented as a `number`.
 */
export type Version = number;

/**
 * An instruction to write an event to the log.
 * This is typically somewhere between a `command` and an `event` in event
 * sourcing.
 */
export type Instruction<T> = {
  aggregateId: AggregateId;
  event: Event;
  baseVersion?: number;
  committer: string;
  data?: T;
  eventChain?: string[];
};

/**
 * A minimal response after a successful write to the log.
 */
export type CommitResponse = {
  aggregateId: AggregateId;
  currentVersion: number;
  timestamp: number;
};

/**
 * A repository for easy writes and reads from the log.
 */
export interface Repository {
  /**
   * Save an event to the log using an `Instruction` that represents the event,
   * the aggregate and its current version.
   *
   * @param instr An `Instruction<T>` to save an event to the log.
   * @returns A promise with `CommitResponse`
   */
  save: <T>(instr: Instruction<T>) => Promise<CommitResponse>;

  /**
   * Read events associated to an aggregate. The result is a (optionally
   * paginated) list with some extra meta data added.
   *
   * This function could be used to build views of the the current state for an
   * aggregate or displaying audit logs.
   *
   * @param aggregateId The `AggregateId` that identifies the aggregate.
   * @param readOpts optional configuration to enable pagination by setting the
   * page size (`limit`) and page number (`offset`). It's also possible to set
   * `fromVersion` which can be useful with snapshots.
   */
  readAggregate: (
    aggregateId: AggregateId,
    readOpts?: ReadOpts
  ) => Promise<ListResult>;
}

/**
 * List of all events associated with the aggregate.
 */
export type ListResult = {
  aggregateId: AggregateId;
  fromVersion: number;
  events: EventRecord[];
};

type EventRecord = {
  version: Version;
  event: string;
  data?: string;
  committer: string;
  timestamp: number;
};

/**
 * Optional parameters to filter the search in the event log.
 *
 * @param fromVersion Start reading the log from this version. This parameter
 * could come handy when combining this function with aggregate snapshots.
 * @param pagination Contains two parameters, `limit` and `offset`, that can be
 * used to paginate the result set.
 */
export type ReadOpts = {
  pagination?: PaginationOpts;
  fromVersion?: Version;
};

type PaginationOpts = {
  limit?: number;
  offset?: number;
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
