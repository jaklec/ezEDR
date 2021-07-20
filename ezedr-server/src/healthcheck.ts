import { RouteOptions } from "fastify";

/**
 * A health check route and handler should be a minimal implementation that
 * always responds with 200 OK. It is often used in container environments (such
 * as k8s or Fargate) or other monitoring tools.
 */
const healthCheckRoute: RouteOptions = {
  method: "GET",
  url: "/health",
  handler: (_, reply) => {
    reply.send({});
  },
  logLevel: "warn", // Do not log on every ping request!
};

export { healthCheckRoute };
