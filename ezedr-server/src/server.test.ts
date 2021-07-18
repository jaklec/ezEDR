import { server } from "./server";

describe("server", () => {
  afterAll(() => {
    server.close();
  });

  test("health check", async () => {
    const response = await server.inject({
      url: "/health",
      method: "GET",
    });

    expect(response.statusCode).toBe(200);
  });
});
