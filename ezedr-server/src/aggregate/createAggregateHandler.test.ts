import {
  CommitResponse,
  Instruction,
  SaveInstruction,
} from "@jaklec/ezedr-core";
import fastify, { InjectOptions } from "fastify";
import { createAggregateHandler } from "./createAggregateHandler";

describe("Register a new aggregate with the event log", () => {
  const server = fastify({ logger: { level: process.env.LOG_LEVEL } });

  const mockRepo = (
    f: <T>(a: Instruction<T>) => Promise<CommitResponse>
  ): SaveInstruction => ({
    save: <T>(a: Instruction<T>) => f<T>(a),
  });

  describe("Successful request", () => {
    const now = Date.now();

    function idGenerator() {
      return "new-id";
    }

    const path = "/test";

    server.post(
      path,
      {},
      createAggregateHandler({
        repository: mockRepo((instr) =>
          Promise.resolve({
            aggregateId: instr.aggregateId,
            currentVersion: instr.baseVersion ?? 0,
            timestamp: now,
          })
        ),
        idGenerator,
      })
    );

    const validRequest: InjectOptions = {
      method: "POST",
      url: path,
      payload: {
        event: "something happened",
        committer: "test user",
      },
    };

    test("status code", async () => {
      const response = await server.inject(validRequest);
      expect(response.statusCode).toBe(201);
    });

    test("location header", async () => {
      const response = await server.inject(validRequest);
      expect(response.headers.location).toBe(`${path}/new-id`);
    });

    test("use provided id when found in body", async () => {
      const response = await server.inject({
        ...validRequest,
        payload: { aggregateId: "provided-id" },
      });
      expect(response.headers.location).toBe(`${path}/provided-id`);
    });

    test("x-current-version header", async () => {
      const response = await server.inject(validRequest);
      expect(response.headers["x-current-version"]).toBe(0);
    });

    test("ignore baseVersion to enforce creation of new aggregates", async () => {
      const response = await server.inject({
        ...validRequest,
        payload: { baseVersion: 123 },
      });
      expect(response.headers["x-current-version"]).toBe(0);
    });
  });
});
