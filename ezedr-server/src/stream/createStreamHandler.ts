import { InitStream } from "@jaklec/ezedr-core";
import { FastifyReply, FastifyRequest } from "fastify";

type CreateStreamBody = {
  streamId: string;
  tenant?: string;
};

/**
 * A __Fastify__ handler function that creates a new stream resource.
 */
type CreateStreamHandler = (
  request: FastifyRequest<{ Body: CreateStreamBody }>,
  reply: FastifyReply
) => Promise<void>;

/**
 * Resources required by `CreateStreamHandler`.
 */
export type CreateStreamOptions = {
  repository: InitStream;
  idGenerator: (a?: unknown) => string;
};

/**
 * Factory function to create a handler function used to create new streams.
 *
 * @param options injects the necessary resources.
 *
 * @returns a `CreateStreamHandler` function.
 */
export function createStreamHandler(
  options: CreateStreamOptions
): CreateStreamHandler {
  return async (request, reply) => {
    const { streamId, tenant } = request.body;
    const response = await options.repository.initStream({
      streamId: streamId || options.idGenerator(),
      tenant: tenant || "default",
    });
    reply
      .status(201)
      .header("location", `${request.url}/${response.streamId}`)
      .send({
        streamId: response.streamId,
        tenant: response.tenant,
        version: response.version,
      });
  };
}
