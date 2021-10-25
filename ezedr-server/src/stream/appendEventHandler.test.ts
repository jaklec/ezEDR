import {
  SaveInstruction,
  SaveResponse,
  SaveToStream,
} from "@jaklec/ezedr-core";
import fastify, { InjectOptions } from "fastify";
import { appendEventHandler } from "./appendEventHandler";
import assert from "assert";

describe("Append event to stream", () => {
  const pathPattern = "/test/:streamId";
  const path = "/test/s0";

  const idGenerator = () => "unique-id";

  const mockRepo = (
    f: (a: SaveInstruction) => Promise<SaveResponse>
  ): SaveToStream => ({
    save: (a: SaveInstruction) => f(a),
  });

  const payload = {
    type: "TEST_HAPPENED",
    payload: "This is a test",
    meta: "text",
    baseVersion: 0,
    tenant: "t0",
  };

  const validRequest: InjectOptions = {
    method: "POST",
    url: path,
    payload,
  };

  describe("successful save operation", () => {
    const server = fastify({ logger: { level: process.env.LOG_LEVEL } });
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

    after(() => {
      server.close();
    });

    it("should set status code 201 on success", async () => {
      const response = await server.inject(validRequest);
      assert.strictEqual(response.statusCode, 201);
    });

    it("should set location header", async () => {
      const response = await server.inject(validRequest);
      assert.strictEqual(
        response.headers.location,
        `${path}/events/${idGenerator()}`
      );
    });

    it("should set eventId", async () => {
      const response = await server.inject(validRequest);
      assert.strictEqual(response.json().eventId, idGenerator());
    });

    it("should set streamId", async () => {
      const response = await server.inject(validRequest);
      assert.strictEqual(response.json().streamId, "s0");
    });

    it("should set current version", async () => {
      const response = await server.inject(validRequest);
      assert.strictEqual(response.json().currentVersion, 1);
    });

    it("should set tenant", async () => {
      const response = await server.inject(validRequest);
      assert.strictEqual(response.json().tenant, "t0");
    });

    it("should set default tenant", async () => {
      const { tenant, ...noTenant } = payload;
      const req = { ...validRequest, payload: noTenant };
      const response = await server.inject(req);
      assert.strictEqual(response.json().tenant, "default");
    });
  });
});
