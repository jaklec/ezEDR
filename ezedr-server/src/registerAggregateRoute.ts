import { AggregateId, Repository } from "@jaklec/ezedr-core";
import { RouteOptions } from "fastify";
import { v4 as uuid } from "uuid";
import { registerAggregate } from "./registerAggregate";

type RegisterAggregate = {
  aggregateId?: AggregateId;
  event: string;
  committer: string;
  data: string;
};

function registerRoute(repo: Repository): RouteOptions {
  return {
    method: "POST",
    url: "/aggregates",
    schema: {
      body: {
        type: "object",
        required: ["event", "committer"],
        properties: {
          event: { type: "string" },
          committer: { type: "string" },
        },
      },
      response: {
        "201": {
          aggregateId: { type: "string" },
          timestamp: { type: "number" },
          currentVersion: { type: "number" },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const { aggregateId, event, committer, data } =
          request.body as RegisterAggregate;

        const result = await registerAggregate(
          {
            aggregateId,
            event,
            committer,
            data,
          },
          {
            repository: repo,
            idGenerator: () => uuid(),
          }
        );
        reply
          .status(201)
          .header("location", `${request.url}/${result.aggregateId}`)
          .send({});
      } catch (err) {
        request.log.error(err.message);
        reply.status(500).send({ message: "Internal Server Error" });
      }
    },
  };
}

export { registerRoute };
