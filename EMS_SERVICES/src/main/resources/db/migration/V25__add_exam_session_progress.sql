-- Keep a candidate's in-flight answers on the server.
--
-- A session already survived interruption -- exam start rejoins an IN_PROGRESS
-- session and hands back only the time that was left -- but the answers did
-- not. They lived in browser state until the single submit call at the end, so
-- a dropped connection, a flat battery or a closed laptop cost the candidate
-- every answer they had given, on an attempt they could no longer repeat
-- without paying again.
--
-- These columns hold the draft: the answers, what was flagged for review, and
-- where the candidate had got to. They are written by the autosave on the exam
-- screen and read back on resume. Scoring never reads them -- it uses the
-- answers posted with the submission -- so a stale draft can only affect what
-- the candidate is shown when they return, never their result.

ALTER TABLE exam_sessions
    ADD COLUMN IF NOT EXISTS answers_draft_json TEXT;

ALTER TABLE exam_sessions
    ADD COLUMN IF NOT EXISTS marked_for_review_json TEXT;

ALTER TABLE exam_sessions
    ADD COLUMN IF NOT EXISTS last_question_number INT;

ALTER TABLE exam_sessions
    ADD COLUMN IF NOT EXISTS progress_saved_at TIMESTAMP;
