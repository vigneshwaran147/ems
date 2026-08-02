
-- src/main/resources/db/migration/V10__link_payments_to_certification_applications.sql
-- ems_backend/src/main/resources/db/migration/V10__link_payments_to_certification_applications.sql

ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS certification_application_ref BIGINT;

ALTER TABLE payments
    ADD CONSTRAINT fk_payments_certification_application
        FOREIGN KEY (certification_application_ref)
        REFERENCES certification_applications (id)
        ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payments_application_ref
    ON payments (certification_application_ref);
