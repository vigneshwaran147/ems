
-- src/main/resources/db/migration/V12__certificate_management_indexes.sql
-- ems_backend/src/main/resources/db/migration/V12__certificate_management_indexes.sql

CREATE UNIQUE INDEX IF NOT EXISTS uq_certificates_attempt_ref
    ON certificates (exam_attempt_ref);

CREATE INDEX IF NOT EXISTS idx_certificates_number
    ON certificates (certificate_number);