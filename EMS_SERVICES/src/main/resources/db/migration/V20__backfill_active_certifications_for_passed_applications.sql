-- Backfill missing active certifications for users who already passed an application.
-- This addresses historical rows where application status was marked PASSED
-- but no ACTIVE row was created in certifications.

INSERT INTO certifications (
    user_ref,
    certification_level,
    certification_status,
    issue_date,
    expiry_date,
    created_by,
    updated_by
)
SELECT
    ca.user_ref,
    ca.certification_level,
    'ACTIVE',
    CURRENT_DATE,
    (CURRENT_DATE + INTERVAL '1 year')::date,
    'SYSTEM',
    'SYSTEM'
FROM certification_applications ca
LEFT JOIN certifications c
    ON c.user_ref = ca.user_ref
   AND c.certification_level = ca.certification_level
   AND c.certification_status = 'ACTIVE'
WHERE ca.application_status = 'PASSED'
  AND c.id IS NULL
GROUP BY ca.user_ref, ca.certification_level;
