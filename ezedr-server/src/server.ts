import fastify, { FastifyInstance } from "fastify";
import { Repository } from "@jaklec/ezedr-core";
import { healthCheckRoute } from "./health";
import { createStreamRoute } from "./stream";
import { genReqId, generateId, appendRequestIdHeader } from "./requestId";

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
    ajv: {
      customOptions: {
        allErrors: true,
        removeAdditional: true,
        coerceTypes: false,
      },
    },
  });
  appendRequestIdHeader(api);

  api.register(async (api) => healthCheckRoute(api), {
    prefix: "/health",
  });

  api.register(
    async (api) => {
      return createStreamRoute(api, {
        repository: repo,
        idGenerator: generateId,
      }).setValidatorCompiler;
    },
    {
      prefix: "/streams",
    }
  );

  return api;
}

export { server };
