
-- src/main/resources/db/migration/V17__create_policy_acknowledgments_table.sql
-- Track when candidates acknowledge the exam violation policy
-- Purpose: Audit trail for compliance and exam integrity verification

CREATE TABLE IF NOT EXISTS policy_acknowledgments (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    exam_session_id BIGINT NOT NULL,
    policy_version VARCHAR(50) NOT NULL,
    acknowledged_at TIMESTAMP NOT NULL,
    acknowledged_from_ip VARCHAR(50),
    user_agent TEXT,
    acknowledged BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(255) NOT NULL,
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255) NOT NULL,
    updated_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_policy_ack_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_policy_ack_exam_session
        FOREIGN KEY (exam_session_id)
        REFERENCES exam_sessions(id)
        ON DELETE RESTRICT
);

-- Create indexes for common queries

CREATE INDEX idx_policy_ack_user_id
    ON policy_acknowledgments(user_id);

CREATE INDEX idx_policy_ack_exam_session_id
    ON policy_acknowledgments(exam_session_id);

CREATE INDEX idx_policy_ack_user_exam
    ON policy_acknowledgments(user_id, exam_session_id);

CREATE INDEX idx_policy_ack_acknowledged_at
    ON policy_acknowledgments(acknowledged_at);

CREATE INDEX idx_policy_ack_acknowledged
    ON policy_acknowledgments(acknowledged);

-- Add comment to table

COMMENT ON TABLE policy_acknowledgments IS
'Audit trail for exam violation policy acknowledgments - tracks when candidates acknowledge policy before starting exams';

COMMENT ON COLUMN policy_acknowledgments.policy_version IS
'Version of the violation policy acknowledged (e.g., 1.0.0)';

COMMENT ON COLUMN policy_acknowledgments.acknowledged_at IS
'Timestamp when candidate acknowledged the policy';

COMMENT ON COLUMN policy_acknowledgments.acknowledged_from_ip IS
'IP address from which policy was acknowledged';

COMMENT ON COLUMN policy_acknowledgments.user_agent IS
'Browser/device info of candidate';

COMMENT ON COLUMN policy_acknowledgments.acknowledged IS
'Whether acknowledgment was true (false for failed attempts)';
