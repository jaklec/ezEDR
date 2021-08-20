import { SaveToStream } from "@jaklec/ezedr-core";
import { FastifyReply, FastifyRequest } from "fastify";

/**
 * Dependencies required by `AppendEventHandler`.
 */
type AppendEventHandlerOpts = {
  repository: SaveToStream;
  idGenerator: (a?: unknown) => string;
};

/**
 * __Fastify__ handler function used to append events to an event stream
 * resource.
 */
type AppendEventHandler = (
  request: FastifyRequest<{
    Params: {
      streamId: string;
    };
    Body: {
      type: string;
      payload?: string;
      meta?: string;
      tenant?: string;
      baseVersion: number;
      committer: string;
    };
  }>,
  reply: FastifyReply
) => Promise<void>;

/**
 * Factory function used to create a __Fastify__ handler function used to append
 * events to an event stream.
 *
 * The resulting function will default `tenant` to "default" if missing.
 *
 * @param options inject dependencies into the function.
 *
 * @returns `AppendEventHandler`
 */
export function appendEventHandler(
  options: AppendEventHandlerOpts
): AppendEventHandler {
  return async (request, reply) => {
    const eventId = options.idGenerator();

    const { type, payload, meta, tenant, baseVersion, committer } =
      request.body;

    const response = await options.repository.save({
      eventId,
      streamId: request.params.streamId,
      tenant: tenant ?? "default",
      baseVersion,
      committer,
      eventName: type,
      payload,
      info: meta,
    });

    reply
      .status(201)
      .header("location", `${request.url}/events/${response.eventId}`)
      .send(response);
  };
}
