
-- src/main/resources/db/migration/V2__add_ems_business_constraints.sql

ALTER TABLE exams
    ADD CONSTRAINT chk_exams_schedule_window
    CHECK (
        scheduled_end_time IS NULL
        OR scheduled_start_time IS NULL
        OR scheduled_end_time > scheduled_start_time
    );

ALTER TABLE exam_sessions
    ADD CONSTRAINT chk_exam_sessions_time_window
    CHECK (
        session_end_time IS NULL
        OR session_end_time >= session_start_time
    );

ALTER TABLE exam_attempts
    ADD CONSTRAINT chk_exam_attempts_counts
    CHECK (
        total_questions >= 0
        AND attempted_questions >= 0
        AND correct_answers >= 0
        AND wrong_answers >= 0
        AND attempted_questions <= total_questions
        AND correct_answers + wrong_answers <= attempted_questions
    );

ALTER TABLE certifications
    ADD CONSTRAINT chk_certifications_dates
    CHECK (expiry_date > issue_date);

ALTER TABLE certificates
    ADD CONSTRAINT chk_certificates_dates
    CHECK (expiry_date > issue_date);

ALTER TABLE refresh_tokens
    ADD CONSTRAINT chk_refresh_tokens_expiry
    CHECK (expires_at > issued_at);

ALTER TABLE password_reset_tokens
    ADD CONSTRAINT chk_password_reset_tokens_expiry
    CHECK (expires_at > created_date);

ALTER TABLE user_profiles
    ADD CONSTRAINT chk_user_profiles_dob
    CHECK (
        date_of_birth IS NULL
        OR date_of_birth <= CURRENT_DATE
    );

CREATE UNIQUE INDEX IF NOT EXISTS uq_exam_questions_display_order
    ON exam_questions (exam_id, display_order);

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_certification_per_level
    ON certifications (user_ref, certification_level)
    WHERE certification_status = 'ACTIVE';

CREATE UNIQUE INDEX IF NOT EXISTS uq_single_in_progress_exam_session
    ON exam_sessions (user_ref, exam_ref)
    WHERE session_status = 'IN_PROGRESS';

CREATE INDEX IF NOT EXISTS idx_payments_date_status
    ON payments (payment_date, payment_status);

CREATE INDEX IF NOT EXISTS idx_certificates_number_expiry
    ON certificates (certificate_number, expiry_date);

CREATE INDEX IF NOT EXISTS idx_violations_type_detected
    ON violations (violation_type, detected_at);
