import assert from "assert";
import {
  InitStream,
  InitStreamInstruction,
  InitStreamResponse,
} from "@jaklec/ezedr-core";
import fastify, { InjectOptions } from "fastify";
import { createStreamHandler } from "./createStreamHandler";

describe("Create a new event stream", () => {
  const server = fastify({ logger: { level: process.env.LOG_LEVEL } });

  const path = "/test";

  const idGenerator = () => "unique-id";

  const mockRepo = (
    f: (a: InitStreamInstruction) => Promise<InitStreamResponse>
  ): InitStream => ({
    initStream: (a: InitStreamInstruction) => f(a),
  });

  server.post(
    path,
    {},
    createStreamHandler({
      idGenerator,
      repository: mockRepo((instr) =>
        Promise.resolve<InitStreamResponse>({
          streamId: instr.streamId,
          tenant: instr.tenant,
          version: -1,
        })
      ),
    })
  );

  const validRequest: InjectOptions = {
    method: "POST",
    url: path,
    payload: {
      streamId: "s0",
      tenant: "t0",
    },
  };

  it("should status code 200 on success", async () => {
    const response = await server.inject(validRequest);
    assert.strictEqual(response.statusCode, 200);
  });

  it("should set location header", async () => {
    const response = await server.inject(validRequest);
    assert.strictEqual(response.headers.location, `${path}/s0`);
  });

  it("should return streamId", async () => {
    const response = await server.inject(validRequest);
    assert.strictEqual(response.json().streamId, "s0");
  });

  it("should return tenant", async () => {
    const response = await server.inject(validRequest);
    assert.strictEqual(response.json().tenant, "t0");
  });

  it("should return version", async () => {
    const response = await server.inject(validRequest);
    assert.strictEqual(response.json().version, -1);
  });

  it("should default tenant", async () => {
    const response = await server.inject({
      ...validRequest,
      payload: { streamId: "s0" },
    });
    assert.strictEqual(response.json().tenant, "default");
  });

  it("should generate streamId", async () => {
    const response = await server.inject({
      ...validRequest,
      payload: {},
    });
    assert.strictEqual(response.json().streamId, idGenerator());
  });
});
