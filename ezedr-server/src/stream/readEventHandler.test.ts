import fastify from "fastify";
import { NoSuchResourceError } from "@jaklec/ezedr-core";
import { readEventsHandler } from "./readEventHandler";
import assert from "assert";

describe("Reading events", () => {
  describe("empty stream", () => {
    const server = fastify({ logger: { level: process.env.LOG_LEVEL } });

    server.get(
      "/:streamId/events",
      {},
      readEventsHandler({
        repository: {
          readEvents: async (streamId, tenant, opts) => ({
            streamId,
            tenant,
            page: {
              fromVersion: opts!.fromVersion || 0,
              limit: (opts?.limit as number) || undefined,
            },
            events: [],
          }),
          readStream: async (streamId, tenant) => ({
            streamId,
            tenant,
            currentVersion: 0,
          }),
        },
      })
    );

    after(async () => {
      await server.close();
    });

    it("should read empty stream", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/empty/events",
      });

      assert.strictEqual(response.statusCode, 200);
    });

    it("should use default pagination", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/empty/events",
        query: {
          limit: "25",
          start: "10",
        },
      });

      const { page } = JSON.parse(response.body);

      assert.deepStrictEqual(page, {
        limit: 25,
        fromVersion: 10,
      });
    });

    it("should return events collection", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/empty/events",
      });

      const { events } = JSON.parse(response.body);

      assert.deepStrictEqual(events, []);
    });
  });

  describe("non empty stream", () => {
    const server = fastify({ logger: { level: process.env.LOG_LEVEL } });

    server.get(
      "/:streamId/events",
      {},
      readEventsHandler({
        repository: {
          readEvents: async (streamId, tenant, _opts) => ({
            streamId,
            tenant,
            page: {
              fromVersion: 0,
              limit: 10,
            },
            events: [
              {
                eventId: "eventid-0",
                committer: "committer-0",
                timestamp: Date.now(),
                type: "default",
                version: 100,
              },
              {
                eventId: "eventid-1",
                committer: "committer-1",
                timestamp: Date.now(),
                type: "default",
                version: 200,
              },
            ],
          }),
          readStream: async (streamId, tenant) => ({
            streamId,
            tenant,
            currentVersion: 0,
          }),
        },
      })
    );

    after(async () => {
      await server.close();
    });

    it("should return events collection", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/not-empty/events",
      });

      const { events } = JSON.parse(response.body);

      assert.strictEqual(events.length, 2);
    });

    it("should use tenant parameter", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/s0/events?tenant=t0",
      });

      const { tenant } = JSON.parse(response.body);

      assert.strictEqual(tenant, "t0");
    });

    it("should use default tenant", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/s0/events",
      });

      const { tenant } = JSON.parse(response.body);

      assert.strictEqual(tenant, "default");
    });
  });

  describe("when stream doesn't exist", () => {
    const server = fastify({ logger: { level: process.env.LOG_LEVEL } });
    server.setErrorHandler(async (error, _, reply) => {
      switch (error.constructor) {
        case NoSuchResourceError: {
          server.log.warn(error.message);
          reply.status(404).send();
          break;
        }
        default: {
          server.log.error(error.message);
          reply.status(500).send();
        }
      }
    });

    server.get(
      "/:streamId/events",
      {},
      readEventsHandler({
        repository: {
          readEvents: async (streamId, tenant, _opts) => ({
            streamId,
            tenant,
            page: {
              fromVersion: 0,
              limit: 10,
            },
            events: [],
          }),
          readStream: (_streamId, _tenant) =>
            Promise.reject(
              new NoSuchResourceError("The resource doesn't exist.")
            ),
        },
      })
    );

    after(async () => {
      await server.close();
    });

    it("should returnt404", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/nothing",
      });

      assert.strictEqual(response.statusCode, 404);
    });
  });
});
