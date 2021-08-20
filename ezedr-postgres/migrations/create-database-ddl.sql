CREATE TABLE IF NOT EXISTS "events" (
  "event_id" VARCHAR NOT NULL,
  "stream_id" VARCHAR NOT NULL,
  "tenant_id" VARCHAR NOT NULL,
  "event" VARCHAR NOT NULL,
  "base_version" INT NOT NULL,
  "version" INT NOT NULL,
  "sequence_number" BIGSERIAL,
  "timestamp" BIGINT NOT NULL,
  "committer" VARCHAR NOT NULL,
  "payload" TEXT,
  "info" VARCHAR,
  CONSTRAINT "log_pk" PRIMARY KEY ("event_id"),
  CONSTRAINT "unq_str_ten_bver" UNIQUE("stream_id", "tenant_id", "base_version")
);

CREATE TABLE IF NOT EXISTS "streams" (
  "stream_id" VARCHAR NOT NULL,
  "tenant_id" VARCHAR NOT NULL,
  "version_seq" INT NOT NULL,
  CONSTRAINT "streams_pk" PRIMARY KEY ("stream_id"),
  CONSTRAINT "unq_str_ten" UNIQUE("stream_id", "tenant_id")
);
