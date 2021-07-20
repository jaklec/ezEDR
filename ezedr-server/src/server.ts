import fastify from "fastify";
import { healthCheckRoute } from "./healthcheck";

const server = fastify({ logger: { level: process.env.LOG_LEVEL } });

server.route(healthCheckRoute);

export { server };
