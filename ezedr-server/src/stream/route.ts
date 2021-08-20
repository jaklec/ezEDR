import { FastifyInstance } from "fastify";
import { createStreamSchema } from "./schema";
import { createStreamHandler } from "./createStreamHandler";
import { appendEventHandler } from "./appendEventHandler";
import { Repository } from "@jaklec/ezedr-core";
import { appendEventSchema } from "./schema/appendEventSchema";

/**
 * __Fastify__ API for stream resources. This function will append routes onto the
 * Fastify instance provided as a parameter.
 *
 * @param server `FastifyInstance`
 * @param opts inject `Repository` and `idGenerator` function which the
 * implementation code depends on. The `Repository` should be an ezEDR
 * repository that follows the interface from __ezedr-core__. The `idGenerator`
 * could be any function that optionally takes an argument and returns a string.
 *
 * @returns `FastifyInstance`
 */
export const createStreamRoute = (
  server: FastifyInstance,
  opts: {
    repository: Repository;
    idGenerator: (a?: unknown) => string;
  }
): FastifyInstance => {
  server.post(
    "/",
    {
      schema: {
        body: createStreamSchema,
        response: {
          201: {
            type: "object",
            properties: {
              streamId: { type: "string" },
              tenant: { type: "string" },
              version: { type: "integer" },
            },
          },
        },
      },
    },
    createStreamHandler(opts)
  );

  server.post(
    "/:streamId",
    {
      schema: {
        body: appendEventSchema,
        response: {
          201: {
            type: "object",
            properties: {
              eventId: { type: "string" },
              streamId: { type: "string" },
              tenant: { type: "string" },
              currentVersion: { type: "integer" },
            },
          },
        },
      },
    },
    appendEventHandler(opts)
  );

  return server;
};
