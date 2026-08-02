
-- src/main/resources/db/migration/V11__add_result_evaluation_session_tracking.sql
-- ems_backend/src/main/resources/db/migration/V11__add_result_evaluation_session_tracking.sql

ALTER TABLE exam_sessions
    ADD COLUMN IF NOT EXISTS selected_question_ids_json TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_exam_attempts_session_ref
    ON exam_attempts (exam_session_ref);

CREATE INDEX IF NOT EXISTS idx_exam_attempts_submitted_at
    ON exam_attempts (submitted_at);
