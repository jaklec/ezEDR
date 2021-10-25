import fastify, { FastifyInstance } from "fastify";
import { NoSuchResourceError, Repository } from "@jaklec/ezedr-core";
import { healthCheckRoute } from "./health";
import { streamsRoute } from "./stream";
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

  api.setErrorHandler(async (error, request, response) => {
    switch (error.constructor) {
      case NoSuchResourceError: {
        api.log.warn({
          reqId: request.id,
          message: error.message,
          stack: error.stack,
        });
        response
          .status(404)
          .send({ requestId: request.id, status: 404, message: error.message });
        break;
      }
      default: {
        api.log.error({
          reqId: request.id,
          message: error.message,
          stack: error.stack,
        });
        response.status(500).send({
          requestId: request.id,
          status: 500,
          message: "Internal Server Error",
        });
      }
    }
  });

  api.register(async (api) => healthCheckRoute(api), {
    prefix: "/health",
  });

  api.register(
    async (api) => {
      return streamsRoute(api, {
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
