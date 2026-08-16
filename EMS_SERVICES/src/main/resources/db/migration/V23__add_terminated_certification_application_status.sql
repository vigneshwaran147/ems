-- Record a proctoring termination as its own outcome.
--
-- An attempt ended by the strike counter and an attempt that was sat and failed
-- both landed on FAILED, so the only thing separating them was whether the
-- free-text remarks column happened to contain the restart note. Every consumer
-- that needed the distinction was substring-matching prose to get it.
--
-- TERMINATED is terminal and re-appliable on exactly the same terms as FAILED;
-- it says only that the attempt was never scored.
--
-- Existing rows are backfilled from the marker the old code left behind, which
-- is the only evidence available for attempts terminated before this migration.

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
            'TERMINATED',
            'REJECTED',
            'EXPIRED'
        )
    );

UPDATE certification_applications
SET application_status = 'TERMINATED'
WHERE application_status = 'FAILED'
  AND remarks LIKE '%Exam invalidated after 3 proctoring violations%';
