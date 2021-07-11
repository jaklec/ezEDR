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
 * An instruction to write an event to the log.
 * This is typically somewhere between a `command` and an `event` in event
 * sourcing.
 */
export type Instruction<T> = {
  aggregateId: AggregateId;
  event: Event;
  version: number;
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
 * @interface
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
}

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
