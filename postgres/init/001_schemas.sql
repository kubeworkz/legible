CREATE SCHEMA IF NOT EXISTS raw;
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS curated;
CREATE SCHEMA IF NOT EXISTS synth;
CREATE SCHEMA IF NOT EXISTS ops;

CREATE TABLE IF NOT EXISTS ops.load_audit (
    id bigserial PRIMARY KEY,
    table_name text NOT NULL,
    source_file text NOT NULL,
    loaded_rows bigint NOT NULL,
    loaded_at timestamptz NOT NULL DEFAULT now()
);
