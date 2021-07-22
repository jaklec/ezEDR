require("dotenv").config();
const { Pool } = require("pg");
const { server } = require("@jaklec/ezedr-server");
const { createRepository, createClient } = require("@jaklec/ezedr-postgres");

const postgres = new Pool();
const repository = createRepository(createClient(postgres));

const port = process.env.PORT || "8080";
const address = process.env.ADDRESS || "0.0.0.0";

const edr = server(repository);

function shutdown(edr, postgres) {
  postgres.end();
  edr.close();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

(async () => {
  try {
    await edr.listen(port, address);
  } catch (err) {
    console.log(err);
  }
})();
