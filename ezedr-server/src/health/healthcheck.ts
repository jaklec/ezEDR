import { FastifyReply, FastifyRequest } from "fastify";

type HealthCheckHandler = (
  request: FastifyRequest,
  reply: FastifyReply
) => Promise<void>;

/**
 * A health check route and handler should be a minimal implementation that
 * always responds with 200 OK. It is often used in container environments (such
 * as k8s or Fargate) or other monitoring tools.
 */
export const healthCheckHandler: HealthCheckHandler = async (
  _request,
  reply
) => {
  reply.send();
};
