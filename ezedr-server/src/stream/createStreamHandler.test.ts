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

  test("status code", async () => {
    const response = await server.inject(validRequest);
    expect(response.statusCode).toBe(201);
  });

  test("location header", async () => {
    const response = await server.inject(validRequest);
    expect(response.headers.location).toBe(`${path}/s0`);
  });

  test("return streamId", async () => {
    const response = await server.inject(validRequest);
    expect(response.json().streamId).toBe("s0");
  });

  test("return tenant", async () => {
    const response = await server.inject(validRequest);
    expect(response.json().tenant).toBe("t0");
  });

  test("return version", async () => {
    const response = await server.inject(validRequest);
    expect(response.json().version).toBe(-1);
  });

  test("default tenant", async () => {
    const response = await server.inject({
      ...validRequest,
      payload: { streamId: "s0" },
    });
    expect(response.json().tenant).toBe("default");
  });

  test("generate streamId", async () => {
    const response = await server.inject({
      ...validRequest,
      payload: {},
    });
    expect(response.json().streamId).toBe(idGenerator());
  });
});
