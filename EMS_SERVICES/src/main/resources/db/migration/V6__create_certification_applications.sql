

-- ems_backend/src/main/resources/db/migration/V6__create_certification_applications.sql

CREATE TABLE IF NOT EXISTS certification_applications (
    id BIGSERIAL PRIMARY KEY,
    user_ref BIGINT NOT NULL,
    certification_level VARCHAR(10) NOT NULL
        CHECK (certification_level IN ('L1', 'L2', 'L3')),
    application_status VARCHAR(20) NOT NULL
        CHECK (
            application_status IN (
                'APPLIED',
                'ELIGIBLE',
                'IN_PROGRESS',
                'PASSED',
                'REJECTED',
                'EXPIRED'
            )
        ),
    applied_on DATE NOT NULL,
    remarks VARCHAR(1000),
    created_by VARCHAR(100) NOT NULL,
    created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_date TIMESTAMPTZ,
    CONSTRAINT fk_certification_applications_user
        FOREIGN KEY (user_ref)
        REFERENCES users (id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_certification_applications_user_level
    ON certification_applications (user_ref, certification_level);
