
-- src/main/resources/db/migration/V9__extend_certification_applications_for_exam_workflow.sql

ALTER TABLE certification_applications
    ADD COLUMN IF NOT EXISTS exam_ref BIGINT,
    ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS scheduled_exam_time TIMESTAMPTZ;

ALTER TABLE certification_applications
    ADD CONSTRAINT fk_certification_applications_exam
    FOREIGN KEY (exam_ref)
    REFERENCES exams (id)
    ON DELETE SET NULL;

ALTER TABLE certification_applications
    ADD CONSTRAINT chk_certification_applications_payment_status
    CHECK (payment_status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'));

CREATE INDEX IF NOT EXISTS idx_certification_applications_exam_ref
    ON certification_applications (exam_ref);