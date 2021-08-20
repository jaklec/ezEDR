import {
  SaveInstruction,
  SaveResponse,
  SaveToStream,
} from "@jaklec/ezedr-core";
import fastify, { InjectOptions } from "fastify";
import { appendEventHandler } from "./appendEventHandler";

describe("Append event to stream", () => {
  const server = fastify({ logger: { level: process.env.LOG_LEVEL } });

  const pathPattern = "/test/:streamId";
  const path = "/test/s0";

  const idGenerator = () => "unique-id";

  const mockRepo = (
    f: (a: SaveInstruction) => Promise<SaveResponse>
  ): SaveToStream => ({
    save: (a: SaveInstruction) => f(a),
  });

  server.post(
    pathPattern,
    {},
    appendEventHandler({
      repository: mockRepo((instr) =>
        Promise.resolve<SaveResponse>({
          eventId: idGenerator(),
          streamId: instr.streamId,
          tenant: instr.tenant,
          currentVersion: instr.baseVersion + 1,
        })
      ),
      idGenerator,
    })
  );

  describe("successful save operation", () => {
    const validRequest: InjectOptions = {
      method: "POST",
      url: path,
      payload: {
        type: "TEST_HAPPENED",
        payload: "This is a test",
        meta: "text",
        baseVersion: 0,
        tenant: "t0",
      },
    };

    test("status code", async () => {
      const response = await server.inject(validRequest);
      expect(response.statusCode).toBe(201);
    });

    test("location header", async () => {
      const response = await server.inject(validRequest);
      expect(response.headers.location).toBe(`${path}/events/${idGenerator()}`);
    });

    test("eventId", async () => {
      const response = await server.inject(validRequest);
      expect(response.json().eventId).toBe(idGenerator());
    });

    test("streamId", async () => {
      const response = await server.inject(validRequest);
      expect(response.json().streamId).toBe("s0");
    });

    test("current version", async () => {
      const response = await server.inject(validRequest);
      expect(response.json().currentVersion).toBe(1);
    });

    test("tenant", async () => {
      const response = await server.inject(validRequest);
      expect(response.json().tenant).toBe("t0");
    });
  });
});
