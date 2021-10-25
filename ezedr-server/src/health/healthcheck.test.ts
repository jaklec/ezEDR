import fastify from "fastify";
import { healthCheckHandler } from "./healthcheck";
import assert from "assert";

describe("Health check", () => {
  const api = fastify({ logger: { level: process.env.LOG_LEVEL } });
  api.get("/", {}, healthCheckHandler);

  it("should respond with status 200", async () => {
    const response = await api.inject({
      method: "GET",
      url: "/",
    });

    assert.strictEqual(response.statusCode, 200);
  });
});
