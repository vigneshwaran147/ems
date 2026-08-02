

-- src/main/resources/db/migration/V13__production_readiness_indexes.sql
-- ems_backend/src/main/resources/db/migration/V13__production_readiness_indexes.sql

CREATE INDEX IF NOT EXISTS idx_certification_app_user_status_applied
    ON certification_applications (user_ref, application_status, applied_on DESC);

CREATE INDEX IF NOT EXISTS idx_payments_status_date
    ON payments (payment_status, payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_exam_attempts_result_submitted
    ON exam_attempts (result_status, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_violations_type_detected
    ON violations (violation_type, detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_certificates_issue_expiry
    ON certificates (issue_date DESC, expiry_date DESC);