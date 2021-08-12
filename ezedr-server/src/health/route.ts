import { FastifyInstance, FastifyLoggerInstance } from "fastify";
import { healthCheckHandler } from "./healthcheck";

/**
 * Explicitly set the log level for health checks.
 *
 * The reason this is handled by a separate environment variable is that we
 * normally don't want to log every ping request and therefore default to "warn"
 * level. There are however scenarios where it could make sense to log every
 * ping, e.g. trouble shooting cloud deployments.
 */
function healthLogLevel(logger: FastifyLoggerInstance) {
  const level = process.env.HEALTH_CHECK_LOG_LEVEL || "warn";
  switch (level) {
    case "warn":
    case "error":
    case "info":
    case "debug":
    case "trace":
    case "fatal":
      return level;
    default:
      logger.warn(
        "Unexpected health check log level. Valid values are 'warn'|'error'|'info'|'debug'|'trace'|'fatal'. Falling back to 'warn' level."
      );
      return "warn";
  }
}

export function healthCheckRoute(api: FastifyInstance): FastifyInstance {
  api.get("/", { logLevel: healthLogLevel(api.log) }, healthCheckHandler);

  return api;
}
