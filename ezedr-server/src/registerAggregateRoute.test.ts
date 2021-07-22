import fastify from "fastify";
import { CommitResponse, Repository } from "@jaklec/ezedr-core";
import { registerRoute } from "./registerAggregateRoute";

describe("Events Route", () => {
  const server = fastify({ logger: { level: process.env.LOG_LEVEL } });

  const repo = (response: CommitResponse): Repository => ({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    save: (_) => Promise.resolve(response),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    readAggregate: (_) => Promise.reject(new Error("Not implemented")),
  });

  const payload = {
    aggregateId: "123",
    event: "something happened",
    committer: "test user",
  };

  describe("Successfully adding a new event", () => {
    server.route(
      registerRoute(
        repo({
          aggregateId: "123",
          timestamp: 1626888665898,
          currentVersion: 0,
        })
      )
    );

    test("status code", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/aggregates",
        payload,
      });

      expect(response.statusCode).toBe(201);
    });

    test("location header", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/aggregates",
        payload,
      });

      expect(response.headers["location"]).toBe("/aggregates/123");
    });
  });

  describe("Reject invalid requests", () => {
    test("Missing event name", async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { event, ...withoutEvent } = payload;
      const response = await server.inject({
        method: "POST",
        url: "/aggregates",
        payload: withoutEvent,
      });

      expect(response.statusCode).toBe(400);
    });

    test("Missing committer", async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { committer, ...withoutCommitter } = payload;
      const response = await server.inject({
        method: "POST",
        url: "/aggregates",
        payload: withoutCommitter,
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
