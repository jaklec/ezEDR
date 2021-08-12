import { Instruction } from "@jaklec/ezedr-core";
import { FastifyReply, FastifyRequest, RequestHeadersDefault } from "fastify";
import { SaveAggregateDefaultOptions } from "./handlerOptions";

type PatchAggregateHandler = (
  request: FastifyRequest<{
    Params: {
      id: string;
    };
    Body: {
      event: string;
      committer: string;
      data: string;
    };
    Headers: RequestHeadersDefault & {
      "x-base-version": string;
    };
  }>,
  reply: FastifyReply
) => Promise<void>;

/**
 * Patch an aggregate by appending new events to the log.
 *
 * This factory function will create a handler to be used with any Fastify
 * route.
 *
 * @param options any resources needed by the handler defined by
 * `PatchHandlerOptions`.
 *
 * @returns `PatchAggregateHandler`
 */
export function patchHandler(
  options: SaveAggregateDefaultOptions
): PatchAggregateHandler {
  return async (request, reply) => {
    const aggregateId = request.params.id;
    const { data, committer, event } = request.body;
    const baseVersion = parseInt(request.headers["x-base-version"]);

    const instr: Instruction<string> = {
      aggregateId,
      event,
      committer,
      data,
      baseVersion,
    };

    const { currentVersion } = await options.repository.save(instr);

    reply.status(204).header("x-current-version", currentVersion).send();
  };
}
