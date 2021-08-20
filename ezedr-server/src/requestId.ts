import { FastifyInstance, FastifyRequest } from "fastify";
import { nanoid } from "nanoid";

/**
 * Request-id generator.
 * This function will reuse any `x-request-id` headers from the incoming
 * request. If no such header exist it will generate a new unique header.
 *
 * @param request `FastifyRequest`
 *
 * @returns New identifier as `string`.
 */
export function genReqId(request: FastifyRequest): string {
  const reqId = request.headers["x-request-id"] as string;
  return reqId ?? generateId();
}

/**
 * Generate a unique id.
 *
 * @returns `string`
 */
export function generateId(): string {
  return nanoid();
}

/**
 * Append the requestId to header "x-request-id" on all outgoing requests.
 *
 * @param api `FastifyInstance`
 */
export function appendRequestIdHeader(api: FastifyInstance): void {
  api.addHook("onRequest", async (request, reply) => {
    reply.header("x-request-id", request.id);
  });
}
