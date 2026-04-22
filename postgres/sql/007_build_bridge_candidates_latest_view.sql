BEGIN;

CREATE SCHEMA IF NOT EXISTS ops;

DROP VIEW IF EXISTS ops.bridge_remediation_candidates_latest;
CREATE VIEW ops.bridge_remediation_candidates_latest AS
WITH ranked AS (
    SELECT
        c.id,
        c.generated_at,
        c.security_code,
        c.source_name,
        c.occurrence_count,
        c.distinct_accounts,
        c.distinct_brokers,
        c.candidate_security_no,
        c.candidate_reason,
        c.candidate_confidence,
        c.review_status,
        c.applied_at,
        row_number() OVER (
            PARTITION BY c.source_name, c.security_code
            ORDER BY c.generated_at DESC, c.id DESC
        ) AS rn
    FROM ops.bridge_remediation_candidates c
)
SELECT
    id,
    generated_at,
    security_code,
    source_name,
    occurrence_count,
    distinct_accounts,
    distinct_brokers,
    candidate_security_no,
    candidate_reason,
    candidate_confidence,
    review_status,
    applied_at
FROM ranked
WHERE rn = 1;

COMMIT;
