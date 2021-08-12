import { FastifyInstance } from "fastify";
import {
  createAggregateHandler,
  CreateAggregateHandlerOptions,
} from "./createAggregateHandler";
import { patchHandler } from "./patchAggregateHandler";
import { commitResponseSchema, saveEventSchema } from "./schema";

export const routeDef = (
  server: FastifyInstance,
  opts: CreateAggregateHandlerOptions
): FastifyInstance => {
  server.post(
    "/",
    {
      schema: {
        body: saveEventSchema,
        response: {
          201: commitResponseSchema,
        },
      },
    },
    createAggregateHandler(opts)
  );

  server.patch(
    "/:id",
    {
      schema: {
        body: saveEventSchema,
        response: {
          204: commitResponseSchema,
        },
      },
    },
    patchHandler({ repository: opts.repository })
  );

  return server;
};
