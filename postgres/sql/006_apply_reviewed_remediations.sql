BEGIN;

CREATE SCHEMA IF NOT EXISTS ops;

CREATE TABLE IF NOT EXISTS ops.bridge_manual_overrides (
    security_code text PRIMARY KEY,
    mapped_security_no text NOT NULL,
    override_reason text NOT NULL,
    approved_by text,
    source_candidate_id bigint,
    approved_at timestamptz NOT NULL DEFAULT now(),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ops.bridge_remediation_candidates
    ADD COLUMN IF NOT EXISTS applied_at timestamptz;

WITH approved AS (
    SELECT
        c.id,
        c.security_code,
        c.candidate_security_no,
        c.candidate_reason,
        c.candidate_confidence,
        c.occurrence_count,
        c.generated_at,
        row_number() OVER (
            PARTITION BY c.security_code
            ORDER BY c.candidate_confidence DESC, c.occurrence_count DESC, c.generated_at DESC, c.id DESC
        ) AS rn
    FROM ops.bridge_remediation_candidates c
    WHERE c.review_status = 'approved'
      AND c.candidate_security_no IS NOT NULL
),
selected AS (
    SELECT
        id,
        security_code,
        candidate_security_no,
        candidate_reason
    FROM approved
    WHERE rn = 1
),
upserted AS (
    INSERT INTO ops.bridge_manual_overrides (
        security_code,
        mapped_security_no,
        override_reason,
        approved_by,
        source_candidate_id,
        approved_at,
        is_active,
        created_at,
        updated_at
    )
    SELECT
        s.security_code,
        s.candidate_security_no,
        'approved_candidate:' || s.candidate_reason,
        current_user,
        s.id,
        now(),
        true,
        now(),
        now()
    FROM selected s
    ON CONFLICT (security_code)
    DO UPDATE SET
        mapped_security_no = EXCLUDED.mapped_security_no,
        override_reason = EXCLUDED.override_reason,
        approved_by = EXCLUDED.approved_by,
        source_candidate_id = EXCLUDED.source_candidate_id,
        approved_at = EXCLUDED.approved_at,
        is_active = true,
        updated_at = now()
    RETURNING security_code, source_candidate_id
)
UPDATE ops.bridge_remediation_candidates c
SET
    review_status = 'applied',
    applied_at = now()
WHERE c.id IN (
    SELECT source_candidate_id
    FROM upserted
    WHERE source_candidate_id IS NOT NULL
);

COMMIT;
