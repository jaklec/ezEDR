import fastify from "fastify";
import { healthCheckRoute } from "./healthcheck";

describe("Health Check Route", () => {
  const server = fastify({ logger: { level: process.env.LOG_LEVEL } }).route(
    healthCheckRoute
  );

  test("Respond with status 200", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
  });
});
