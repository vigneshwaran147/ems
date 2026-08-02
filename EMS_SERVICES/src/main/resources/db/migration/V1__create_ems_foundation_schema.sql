-- ems_backend/src/main/resources/db/migration/V1__create_ems_foundation_schema.sql

CREATE TABLE IF NOT EXISTS roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_by VARCHAR(100) NOT NULL,
    created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_date TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    mobile_number VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    profile_photo_url TEXT,
    address TEXT,
    years_of_experience INT,
    current_skill_level VARCHAR(10) NOT NULL
        CHECK (current_skill_level IN ('L1', 'L2', 'L3')),
    current_organization VARCHAR(255),
    qualification VARCHAR(255),
    father_name VARCHAR(255),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    account_non_locked BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(100) NOT NULL,
    created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_date TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_date TIMESTAMPTZ,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role
        FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_ref BIGINT NOT NULL UNIQUE,
    date_of_birth DATE,
    city VARCHAR(120),
    state VARCHAR(120),
    country VARCHAR(120),
    postal_code VARCHAR(20),
    created_by VARCHAR(100) NOT NULL,
    created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_date TIMESTAMPTZ,
    CONSTRAINT fk_user_profiles_user
        FOREIGN KEY (user_ref) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exams (
    id BIGSERIAL PRIMARY KEY,
    exam_code VARCHAR(50) NOT NULL UNIQUE,
    exam_name VARCHAR(255) NOT NULL,
    certification_level VARCHAR(10) NOT NULL
        CHECK (certification_level IN ('L1', 'L2', 'L3')),
    duration_minutes INT NOT NULL
        CHECK (duration_minutes > 0),
    total_marks NUMERIC(10, 2) NOT NULL
        CHECK (total_marks >= 0),
    passing_percentage NUMERIC(5, 2) NOT NULL
        CHECK (passing_percentage >= 0 AND passing_percentage <= 100),
    exam_status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED'
        CHECK (exam_status IN (
            'SCHEDULED',
            'IN_PROGRESS',
            'COMPLETED',
            'PASSED',
            'FAILED',
            'INVALIDATED'
        )),
    scheduled_start_time TIMESTAMPTZ,
    scheduled_end_time TIMESTAMPTZ,
    created_by VARCHAR(100) NOT NULL,
    created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_date TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS questions (
    id BIGSERIAL PRIMARY KEY,
    question_code VARCHAR(50) NOT NULL UNIQUE,
    certification_level VARCHAR(10) NOT NULL
        CHECK (certification_level IN ('L1', 'L2', 'L3')),
    question_category VARCHAR(20) NOT NULL
        CHECK (question_category IN ('Technical', 'Functional', 'Compliance', 'General')),
    question_type VARCHAR(20) NOT NULL
        CHECK (question_type IN ('Single Choice', 'Multiple Choice')),
    question_text TEXT NOT NULL,
    options_json JSONB NOT NULL,
    correct_options_json JSONB NOT NULL,
    marks NUMERIC(10, 2) NOT NULL
        CHECK (marks >= 0),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(100) NOT NULL,
    created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_date TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS exam_questions (
    exam_id BIGINT NOT NULL,
    question_id BIGINT NOT NULL,
    display_order INT NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_date TIMESTAMPTZ,
    PRIMARY KEY (exam_id, question_id),
    CONSTRAINT fk_exam_questions_exam
        FOREIGN KEY (exam_id) REFERENCES exams (id) ON DELETE CASCADE,
    CONSTRAINT fk_exam_questions_question
        FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS exam_sessions (
    id BIGSERIAL PRIMARY KEY,
    session_token UUID NOT NULL UNIQUE,
    user_ref BIGINT NOT NULL,
    exam_ref BIGINT NOT NULL,
    session_start_time TIMESTAMPTZ NOT NULL,
    session_end_time TIMESTAMPTZ,
    session_status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS'
        CHECK (session_status IN (
            'SCHEDULED',
            'IN_PROGRESS',
            'COMPLETED',
            'PASSED',
            'FAILED',
            'INVALIDATED'
        )),
    violation_count INT NOT NULL DEFAULT 0,
    browser_fingerprint VARCHAR(255),
    ip_address VARCHAR(64),
    created_by VARCHAR(100) NOT NULL,
    created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_date TIMESTAMPTZ,
    CONSTRAINT fk_exam_sessions_user
        FOREIGN KEY (user_ref) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_exam_sessions_exam
        FOREIGN KEY (exam_ref) REFERENCES exams (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exam_attempts (
    id BIGSERIAL PRIMARY KEY,
    exam_session_ref BIGINT NOT NULL,
    total_questions INT NOT NULL DEFAULT 0,
    attempted_questions INT NOT NULL DEFAULT 0,
    correct_answers INT NOT NULL DEFAULT 0,
    wrong_answers INT NOT NULL DEFAULT 0,
    obtained_marks NUMERIC(10, 2) NOT NULL DEFAULT 0,
    percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,
    result_status VARCHAR(10) NOT NULL
        CHECK (result_status IN ('PASS', 'FAIL')),
    submitted_at TIMESTAMPTZ,
    created_by VARCHAR(100) NOT NULL,
    created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_date TIMESTAMPTZ,
    CONSTRAINT fk_exam_attempts_session
        FOREIGN KEY (exam_session_ref) REFERENCES exam_sessions (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS certifications (
    id BIGSERIAL PRIMARY KEY,
    user_ref BIGINT NOT NULL,
    certification_level VARCHAR(10) NOT NULL
        CHECK (certification_level IN ('L1', 'L2', 'L3')),
    certification_status VARCHAR(20) NOT NULL
        CHECK (certification_status IN ('ACTIVE', 'EXPIRED', 'REVOKED')),
    issue_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_date TIMESTAMPTZ,
    CONSTRAINT fk_certifications_user
        FOREIGN KEY (user_ref) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uq_user_level_active
        UNIQUE (user_ref, certification_level, issue_date)
);

CREATE TABLE IF NOT EXISTS certification_history (
    id BIGSERIAL PRIMARY KEY,
    certification_ref BIGINT NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_description TEXT,
    event_timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) NOT NULL,
    created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_date TIMESTAMPTZ,
    CONSTRAINT fk_certification_history_certification
        FOREIGN KEY (certification_ref) REFERENCES certifications (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payments (
    id BIGSERIAL PRIMARY KEY,
    transaction_id VARCHAR(100) NOT NULL UNIQUE,
    user_ref BIGINT NOT NULL,
    exam_ref BIGINT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL
        CHECK (amount >= 0),
    currency VARCHAR(10) NOT NULL,
    provider VARCHAR(30) NOT NULL,
    payment_status VARCHAR(20) NOT NULL
        CHECK (payment_status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')),
    payment_date TIMESTAMPTZ,
    provider_reference VARCHAR(100),
    created_by VARCHAR(100) NOT NULL,
    created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_date TIMESTAMPTZ,
    CONSTRAINT fk_payments_user
        FOREIGN KEY (user_ref) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_payments_exam
        FOREIGN KEY (exam_ref) REFERENCES exams (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS certificates (
    id BIGSERIAL PRIMARY KEY,
    certificate_number VARCHAR(100) NOT NULL UNIQUE,
    certification_ref BIGINT NOT NULL,
    exam_attempt_ref BIGINT NOT NULL,
    certificate_url TEXT,
    qr_code_url TEXT,
    verification_url TEXT NOT NULL,
    issue_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_date TIMESTAMPTZ,
    CONSTRAINT fk_certificates_certification
        FOREIGN KEY (certification_ref) REFERENCES certifications (id) ON DELETE CASCADE,
    CONSTRAINT fk_certificates_attempt
        FOREIGN KEY (exam_attempt_ref) REFERENCES exam_attempts (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS violations (
    id BIGSERIAL PRIMARY KEY,
    exam_session_ref BIGINT NOT NULL,
    violation_type VARCHAR(80) NOT NULL,
    violation_level INT NOT NULL CHECK (violation_level > 0),
    description TEXT,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    action_taken VARCHAR(80),
    created_by VARCHAR(100) NOT NULL,
    created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_date TIMESTAMPTZ,
    CONSTRAINT fk_violations_session
        FOREIGN KEY (exam_session_ref) REFERENCES exam_sessions (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS video_recordings (
    id BIGSERIAL PRIMARY KEY,
    exam_session_ref BIGINT NOT NULL,
    file_location TEXT NOT NULL,
    recording_start_time TIMESTAMPTZ NOT NULL,
    recording_end_time TIMESTAMPTZ,
    recording_duration_seconds BIGINT,
    created_by VARCHAR(100) NOT NULL,
    created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_date TIMESTAMPTZ,
    CONSTRAINT fk_video_recordings_session
        FOREIGN KEY (exam_session_ref) REFERENCES exam_sessions (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(80) NOT NULL,
    description TEXT,
    performed_by VARCHAR(100),
    correlation_id VARCHAR(64),
    event_timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) NOT NULL,
    created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_date TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_ref BIGINT NOT NULL,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    issued_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_by VARCHAR(100) NOT NULL,
    created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_date TIMESTAMPTZ,
    CONSTRAINT fk_refresh_tokens_user
        FOREIGN KEY (user_ref) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_ref BIGINT NOT NULL,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_by VARCHAR(100) NOT NULL,
    created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_date TIMESTAMPTZ,
    CONSTRAINT fk_password_reset_tokens_user
        FOREIGN KEY (user_ref) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_users_email
    ON users (email);

CREATE INDEX IF NOT EXISTS idx_users_mobile_number
    ON users (mobile_number);

CREATE INDEX IF NOT EXISTS idx_exams_level_status
    ON exams (certification_level, exam_status);

CREATE INDEX IF NOT EXISTS idx_questions_level_category
    ON questions (certification_level, question_category);

CREATE INDEX IF NOT EXISTS idx_exam_sessions_user_exam
    ON exam_sessions (user_ref, exam_ref);

CREATE INDEX IF NOT EXISTS idx_exam_sessions_status
    ON exam_sessions (session_status);

CREATE INDEX IF NOT EXISTS idx_exam_attempts_result_status
    ON exam_attempts (result_status);

CREATE INDEX IF NOT EXISTS idx_certifications_user_level
    ON certifications (user_ref, certification_level);

CREATE INDEX IF NOT EXISTS idx_payments_user_status
    ON payments (user_ref, payment_status);

CREATE INDEX IF NOT EXISTS idx_violations_session_detected
    ON violations (exam_session_ref, detected_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_event_time
    ON audit_logs (event_type, event_timestamp);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_revoked
    ON refresh_tokens (user_ref, revoked);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_used
    ON password_reset_tokens (user_ref, used);


INSERT INTO roles (name, description, created_by)
VALUES
    ('ADMIN', 'Administrator role with platform management privileges', 'SYSTEM'),
    ('USER', 'Candidate role for certification lifecycle actions', 'SYSTEM')
ON CONFLICT (name) DO NOTHING;
