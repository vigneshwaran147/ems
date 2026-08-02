-- Ensure FAILED is a valid persisted state for certification applications.
-- Existing service logic sets FAILED after unsuccessful exam evaluation.

ALTER TABLE certification_applications
    DROP CONSTRAINT IF EXISTS certification_applications_application_status_check;

ALTER TABLE certification_applications
    ADD CONSTRAINT certification_applications_application_status_check
    CHECK (
        application_status IN (
            'APPLIED',
            'ELIGIBLE',
            'IN_PROGRESS',
            'PASSED',
            'FAILED',
            'REJECTED',
            'EXPIRED'
        )
    );