import fastify, { FastifyInstance } from "fastify";
import { v4 as uuid } from "uuid";
import { Repository } from "@jaklec/ezedr-core";
import { healthCheckRoute } from "./health";
import { routeDef } from "./aggregate";
import { genReqId, appendRequestIdHeader } from "./requestId";

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

  appendRequestIdHeader(api);

  api.register(async (api) => healthCheckRoute(api), {
    prefix: "/health",
  });

  api.register(
    async (api) => {
      return routeDef(api, { repository: repo, idGenerator: () => uuid() });
    },
    {
      prefix: "/aggregates",
    }
  );

  return api;
}

export { server };
