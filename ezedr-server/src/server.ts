import fastify from "fastify";

const server = fastify({ logger: { level: process.env.LOG_LEVEL } });

server.get("/health", async (_, reply) => {
  reply.send({});
});

export { server };
