#!/usr/bin/env bash

set -exuo pipefail

DB_USER="${POSTGRES_USER:=postgres}"
DB_PASSWORD="${POSTGRES_PASSWORD:=password}"
DB_NAME="${POSTGRES_DB:=edr_e2e}"
DB_PORT="${POSTGRES_PORT:=5432}"

if [[ ! $(docker ps | grep postgres) ]]
then
docker run \
  -e POSTGRES_USER=${DB_USER} \
  -e POSTGRES_PASSWORD=${DB_PASSWORD} \
  -e POSTGRES_DB=${DB_NAME} \
  -p "${DB_PORT}":5432 \
  -d postgres \
  postgres -N 1000
fi

# Ping until database is ready to accept commands
export PGPASSWORD="${DB_PASSWORD}"
until psql -h "localhost" -U "${DB_USER}" -p "${DB_PORT}" -d "postgres" -c "\q";
do
  >&2 echo "Postgres is still unavailable - sleeping."
  sleep 1
done

>&2 echo "Postgres is available on port ${DB_PORT}."

psql -h "localhost" -U "${DB_USER}" -p "${DB_PORT}" -d "postgres" \
  -c "DROP DATABASE IF EXISTS \"edr_e2e\""
psql -h "localhost" -U "${DB_USER}" -p "${DB_PORT}" -d "postgres" \
  -c "CREATE DATABASE \"edr_e2e\""


psql -h "localhost" -U "${DB_USER}" -p "${DB_PORT}" -d "edr_e2e" \
  -c "
DO
\$do\$
BEGIN
 IF NOT EXISTS(
  SELECT FROM pg_roles WHERE rolname = 'developer'
 )
 THEN
  CREATE ROLE developer LOGIN PASSWORD 'secret';
END IF;
END
\$do\$;
"

psql -h "localhost" -U "${DB_USER}" -p "${DB_PORT}" -d "edr_e2e" \
  -f "./migrations/create-database-ddl.sql"

psql -h "localhost" -U "${DB_USER}" -p "${DB_PORT}" -d "edr_e2e" \
  -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO developer"

psql -h "localhost" -U "${DB_USER}" -p "${DB_PORT}" -d "edr_e2e" \
  -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO developer"
