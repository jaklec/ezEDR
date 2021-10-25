import {
  ReadEvents,
  ReadEventsResult,
  ReadStreamInfo,
  ReadStreamResult,
} from "@jaklec/ezedr-core";
import { FastifyReply, FastifyRequest } from "fastify";

type ReadEventsHandler = (
  request: FastifyRequest<{
    Params: {
      streamId: string;
    };
    Querystring: {
      tenant: string;
      limit: string; // It's possible to use `number` here, but it is interpreted as `string`. (Fastify TS defect?)
      start: string;
    };
  }>,
  reply: FastifyReply
) => Promise<void>;

type ReadEventsHandlerOptions = {
  repository: ReadEvents & ReadStreamInfo;
};

/**
 * Create a handler function to read events from a stream.
 *
 * @param opts `ReadEventsHandlerOptions` that takes a repository with
 * `ReadEvents` and `ReadStreamInfo`.
 * @returns `ReadEventsHandler`
 * @throws Will throw a `NoSuchResourceError` if the stream doesn't exist.
 */
export function readEventsHandler(
  opts: ReadEventsHandlerOptions
): ReadEventsHandler {
  return async (request, reply) => {
    const { streamId } = request.params;
    const { tenant, limit, start } = request.query;
    const tenantOrDefault = tenant || "default";

    const result: ReadEventsResult = await opts.repository.readEvents(
      streamId,
      tenantOrDefault,
      {
        limit: Number.parseInt(limit) || 50,
        fromVersion: Number.parseInt(start) || 0,
      }
    );

    if (result.events.length === 0) {
      await verifyResourceExist(opts.repository, streamId, tenantOrDefault);
    }

    reply.send(result);
  };
}

/**
 * Fetch stream meta data from the repostitory.
 * Will throw exception if the stream doesn't exist.
 *
 * @param repo `ReadStreamInfo` interface
 * @param streamId
 * @param tenant
 * @returns Promise wth `ReadStreamResult`
 * @throws `NoSuchResourceError`
 */
async function verifyResourceExist(
  repo: ReadStreamInfo,
  streamId: string,
  tenant: string
): Promise<ReadStreamResult> {
  return repo.readStream(streamId, tenant);
}
