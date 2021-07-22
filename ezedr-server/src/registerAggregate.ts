import {
  AggregateId,
  CommitResponse,
  Instruction,
  Repository,
} from "@jaklec/ezedr-core";

type RegisterAggregateCommand = {
  aggregateId?: AggregateId;
  event: string;
  committer: string;
  data: string;
};

type RegisterAggregateOptions = {
  repository: Repository;
  idGenerator: (a?: unknown) => string;
};

type RegisterAggregate = (
  cmd: RegisterAggregateCommand,
  opts: RegisterAggregateOptions
) => Promise<CommitResponse>;

/**
 * Register a new aggregate. This means calling the `save` method on the
 * `Repository`.
 *
 * @param cmd `RegisterNewAggregateCommand` is a command to register the aggregate
 * with the `Repository`. The parameter `aggregateId` is optional and a new id
 * is generated if it is left out.
 *
 * @param opts `RegisterNewAggregateOptions` contains necessary tools to register the
 * aggregate. Most notably it contains the `Repository` implementation and a
 * function to generate new `AggregateId`'s.
 *
 * @returns A promise with the `CommitResponse`.
 */
const registerAggregate: RegisterAggregate = (cmd, opts) => {
  const instr: Instruction<string> = {
    aggregateId: cmd.aggregateId ?? opts.idGenerator(),
    committer: cmd.committer,
    event: cmd.event,
    data: cmd.data,
  };
  return opts.repository.save(instr);
};

export {
  registerAggregate,
  RegisterAggregate,
  RegisterAggregateCommand,
  RegisterAggregateOptions,
};
