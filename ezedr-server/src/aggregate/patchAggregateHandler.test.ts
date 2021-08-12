import {
  CommitResponse,
  Instruction,
  SaveInstruction,
} from "@jaklec/ezedr-core";
import fastify, { InjectOptions } from "fastify";
import { patchHandler } from "./patchAggregateHandler";

describe("Patch aggregate by appending new events to log", () => {
  const server = fastify({ logger: { level: process.env.LOG_LEVEL } });

  const mockRepo = (
    f: <T>(a: Instruction<T>) => Promise<CommitResponse>
  ): SaveInstruction => ({
    save: <T>(a: Instruction<T>) => f<T>(a),
  });

  const payload = {
    event: "something happened",
    committer: "test user",
  };
  const baseVersion = 0;
  const validRequest: InjectOptions = {
    method: "PATCH",
    url: "/test/123",
    headers: { "x-base-version": baseVersion },
    payload,
  };

  describe("successful request", () => {
    const incrementStep = 1;
    const currentTime = Date.now();

    server.patch(
      "/test/:id",
      {},
      patchHandler({
        repository: mockRepo((instr) =>
          Promise.resolve({
            currentVersion:
              instr.baseVersion !== undefined
                ? instr.baseVersion + incrementStep
                : 0,
            aggregateId: "123",
            timestamp: currentTime,
          })
        ),
      })
    );

    test("status code is 204", async () => {
      const response = await server.inject(validRequest);
      expect(response.statusCode).toBe(204);
    });

    test("return new version number with x-current-version header", async () => {
      const response = await server.inject(validRequest);
      expect(response.headers["x-current-version"]).toBe(
        baseVersion + incrementStep
      );
    });
  });
});
