CREATE TABLE IF NOT EXISTS "versions" (
  "aggregate_id" VARCHAR NOT NULL,
  "version" INT NOT NULL,
  CONSTRAINT "versions_pk" PRIMARY KEY ("aggregate_id")
);

CREATE TABLE IF NOT EXISTS "events" (
  "aggregate_id" VARCHAR NOT NULL,
  "event" VARCHAR NOT NULL,
  "sequence_number" BIGSERIAL,
  "base_version" INT NOT NULL,
  "version" INT NOT NULL,
  "snapshot_version" INT NOT NULL DEFAULT 0,
  "timestamp" BIGINT NOT NULL,
  "committer" VARCHAR NOT NULL,
  "data" TEXT,
  /* "hash" VARCHAR NOT NULL, */
  CONSTRAINT "events_pk" PRIMARY KEY ("aggregate_id", "base_version", "event")
);
