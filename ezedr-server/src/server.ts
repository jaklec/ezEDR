import fastify, { FastifyInstance, FastifyRequest } from "fastify";
import { v4 as uuid } from "uuid";
import { Repository } from "@jaklec/ezedr-core";
import { healthCheckRoute } from "./healthcheck";
import { registerRoute } from "./registerAggregateRoute";

/**
 * Request-id generator.
 * This function will reuse any `x-request-id` headers from the incoming
 * request. If no such header exist it will generate a new unique header.
 */
function genReqId(request: FastifyRequest) {
  const reqId = request.headers["x-request-id"] as string;
  return reqId ?? uuid();
}

/**
 * Create a server instance of ezEDR.
 *
 * @param repo `Repository` implementation
 *
 * @returns Server instance will expose a REST API for interacting with the EDR.
 */
function server(repo: Repository): FastifyInstance {
  const api = fastify({
    logger: { level: process.env.LOG_LEVEL },
    genReqId,
  });

  api.addHook("onRequest", (request, reply, done) => {
    reply.header("x-request-id", request.id);
    done();
  });

  api.route(healthCheckRoute);
  api.route(registerRoute(repo));

  return api;
}

export { server };
