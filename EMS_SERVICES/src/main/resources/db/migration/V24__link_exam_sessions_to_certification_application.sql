-- Record which application an exam session was sat under.
--
-- A session carried only a user and an exam, so "this candidate's session for
-- this exam" was ambiguous the moment anyone re-applied -- and re-applying is
-- the normal path after a termination, so the ambiguity was routine rather than
-- exotic. Every consumer had to guess: the dashboard reconciler read a previous
-- attempt's invalidated session as belonging to the new application and closed
-- it, and exam start would resume a session begun under an application the
-- candidate had already used up.
--
-- Nullable, because sessions predating this column may have no application that
-- can be identified with certainty; readers must treat NULL as "unknown", never
-- as "no application".

ALTER TABLE exam_sessions
    ADD COLUMN IF NOT EXISTS application_ref BIGINT;

ALTER TABLE exam_sessions
    DROP CONSTRAINT IF EXISTS fk_exam_sessions_application;

ALTER TABLE exam_sessions
    ADD CONSTRAINT fk_exam_sessions_application
    FOREIGN KEY (application_ref) REFERENCES certification_applications (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_exam_sessions_application
    ON exam_sessions (application_ref, session_start_time DESC);

-- Backfill on the only evidence history offers: a session belongs to the most
-- recent application for the same candidate and exam that already existed when
-- the session began. A session cannot have been sat under an application
-- created after it started.
UPDATE exam_sessions es
SET application_ref = (
    SELECT ca.id
    FROM certification_applications ca
    WHERE ca.user_ref = es.user_ref
      AND ca.exam_ref = es.exam_ref
      AND ca.created_date <= es.session_start_time
    ORDER BY ca.created_date DESC, ca.id DESC
    LIMIT 1
)
WHERE es.application_ref IS NULL;
