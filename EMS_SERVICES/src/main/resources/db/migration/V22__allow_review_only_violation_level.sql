-- Let a violation record that it earned no strike.
--
-- violation_level carries the strike number a detection produced, and the
-- original CHECK (violation_level > 0) assumed every detection produced one.
-- Review-only types do not: EYES_OFF_SCREEN, PROCTOR_SETUP_INVALID and
-- SOUND_DETECTED are routed to an invigilator instead of the strike counter, so
-- they are written with the session's unchanged count -- which is 0 until the
-- candidate earns a real strike.
--
-- The effect was silent data loss of exactly the detections meant for human
-- review. The insert failed the constraint, its REQUIRES_NEW transaction rolled
-- back, and because violations are persisted asynchronously the API had already
-- answered 200. Nothing surfaced anywhere except a stack trace in the log.
--
-- 0 now means "flagged, no strike", which is what a review-only detection is.

ALTER TABLE violations
    DROP CONSTRAINT IF EXISTS violations_violation_level_check;

ALTER TABLE violations
    ADD CONSTRAINT violations_violation_level_check
    CHECK (violation_level >= 0);
