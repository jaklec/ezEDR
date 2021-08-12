import { AggregateId } from "@jaklec/ezedr-core";
import { FastifyReply, FastifyRequest } from "fastify";
import { SaveAggregateDefaultOptions } from "./handlerOptions";

export type CreateAggregateHandlerOptions = SaveAggregateDefaultOptions & {
  idGenerator: (a?: unknown) => string;
};

type CreateAggregateHandler = (
  request: FastifyRequest<{
    Body: {
      aggregateId?: AggregateId;
      event: string;
      committer: string;
      data: string;
    };
  }>,
  reply: FastifyReply
) => Promise<void>;

/**
 * Create a new aggregate. This means calling the `save` method on the
 * `Repository`.
 *
 * This factory function will create a handler to be used with any Fastify
 * route.
 *
 * @param options any resources needed by the handler defined by
 * `CreateAggregateHandlerOptions`.
 *
 * @returns `CreateAggregateHandler`
 */
export function createAggregateHandler(
  options: CreateAggregateHandlerOptions
): CreateAggregateHandler {
  return async (request, reply) => {
    const { aggregateId: candidateId, event, committer, data } = request.body;

    const { aggregateId, currentVersion } = await options.repository.save({
      aggregateId: candidateId ?? options.idGenerator(),
      event,
      committer,
      data,
    });

    reply
      .status(201)
      .header("location", `${request.url}/${aggregateId}`)
      .header("x-current-version", currentVersion)
      .send();
  };
}
