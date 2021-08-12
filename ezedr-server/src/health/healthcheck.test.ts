import fastify from "fastify";
import { healthCheckHandler } from "./healthcheck";

describe("Health check", () => {
  const api = fastify({ logger: { level: process.env.LOG_LEVEL } });
  api.get("/", {}, healthCheckHandler);

  test("Respond with status 200", async () => {
    const response = await api.inject({
      method: "GET",
      url: "/",
    });

    expect(response.statusCode).toBe(200);
  });
});
