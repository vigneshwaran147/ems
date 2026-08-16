-- =====================================================================
-- V21 : AI proctoring evidence isolation + strike-count concurrency support
-- ---------------------------------------------------------------------
-- Design notes
--   * exam_sessions.violation_count remains the single authoritative
--     strike counter. The AI proctoring pipeline increments it under a
--     PESSIMISTIC_WRITE row lock, so no second counter is introduced.
--   * violations remains the single structural violation log. It already
--     carries the composite FK index (exam_session_ref, detected_at).
--   * Large base64 frames / object-storage keys are isolated into
--     proctor_evidence_blobs so that scanning the violation log never
--     drags multi-hundred-KB payloads through shared buffers.
-- =====================================================================

CREATE TABLE IF NOT EXISTS proctor_evidence_blobs (
    id BIGSERIAL PRIMARY KEY,
    violation_ref BIGINT NOT NULL,
    exam_session_ref BIGINT NOT NULL,
    storage_kind VARCHAR(20) NOT NULL DEFAULT 'INLINE_BASE64'
        CHECK (storage_kind IN ('INLINE_BASE64', 'OBJECT_STORAGE')),
    media_type VARCHAR(60) NOT NULL DEFAULT 'image/jpeg',
    evidence_payload TEXT,
    object_storage_key VARCHAR(512),
    payload_bytes BIGINT NOT NULL DEFAULT 0 CHECK (payload_bytes >= 0),
    frame_width INT,
    frame_height INT,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) NOT NULL,
    created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_date TIMESTAMPTZ,
    CONSTRAINT fk_evidence_violation
        FOREIGN KEY (violation_ref) REFERENCES violations (id) ON DELETE CASCADE,
    CONSTRAINT fk_evidence_session
        FOREIGN KEY (exam_session_ref) REFERENCES exam_sessions (id) ON DELETE CASCADE,
    CONSTRAINT chk_evidence_payload_present CHECK (
        (storage_kind = 'INLINE_BASE64' AND evidence_payload IS NOT NULL)
        OR (storage_kind = 'OBJECT_STORAGE' AND object_storage_key IS NOT NULL)
    )
);

-- One evidence row per violation footprint keeps the join deterministic
-- and prevents a retrying client from duplicating megabyte payloads.
CREATE UNIQUE INDEX IF NOT EXISTS uq_evidence_violation
    ON proctor_evidence_blobs (violation_ref);

-- Reviewer timeline lookup: "show me the frames for this session, newest first".
CREATE INDEX IF NOT EXISTS idx_evidence_session_captured
    ON proctor_evidence_blobs (exam_session_ref, captured_at DESC);

-- The violation log is scanned by session constantly during a live exam.
-- V1 created (exam_session_ref, detected_at); this narrower index serves
-- the plain "count strikes for this session" path without touching the blob table.
CREATE INDEX IF NOT EXISTS idx_violations_session_ref
    ON violations (exam_session_ref);

-- Live invigilator dashboard: active sessions ordered by strike pressure.
CREATE INDEX IF NOT EXISTS idx_exam_sessions_status_violations
    ON exam_sessions (session_status, violation_count DESC);
