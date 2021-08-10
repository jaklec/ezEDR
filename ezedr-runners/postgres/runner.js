const { Pool } = require("pg");
const { server } = require("@jaklec/ezedr-server");
const { createRepository, createClient } = require("@jaklec/ezedr-postgres");

const postgres = new Pool({
  host: process.env.PGHOST || "127.0.0.1",
  port: process.env.PGPORT || "5432",
  user: process.env.PGUSER || "developer",
  password: process.env.PGPASSWORD || "secret",
  database: process.env.PGDATABASE || "ezedr",
});

const repository = createRepository(createClient(postgres));

const port = process.env.PORT || "8080";
const address = process.env.ADDRESS || "0.0.0.0";

const edr = server(repository);

function shutdown() {
  postgres.end();
  edr.close();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

module.exports.run = async function () {
  try {
    await edr.listen(port, address);
  } catch (err) {
    console.log(err);
  }
};
