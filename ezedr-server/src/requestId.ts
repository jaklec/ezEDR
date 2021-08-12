import { FastifyInstance, FastifyRequest } from "fastify";
import { v4 as uuid } from "uuid";

/**
 * Request-id generator.
 * This function will reuse any `x-request-id` headers from the incoming
 * request. If no such header exist it will generate a new unique header.
 */
export function genReqId(request: FastifyRequest): string {
  const reqId = request.headers["x-request-id"] as string;
  return reqId ?? uuid();
}

/**
 * Append the requestId to header "x-request-id" on all outgoing requests.
 */
export function appendRequestIdHeader(api: FastifyInstance): void {
  api.addHook("onRequest", async (request, reply) => {
    reply.header("x-request-id", request.id);
  });
}
