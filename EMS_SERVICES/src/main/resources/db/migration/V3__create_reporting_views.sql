
-- src/main/resources/db/migration/V3__create_reporting_views.sql

CREATE OR REPLACE VIEW v_user_certification_summary AS
SELECT
    u.id AS user_pk,
    u.user_id,
    u.email,
    c.certification_level,
    c.certification_status,
    c.issue_date,
    c.expiry_date,
    CASE
        WHEN c.expiry_date < CURRENT_DATE THEN 'EXPIRED'
        ELSE 'VALID'
    END AS validity_state
FROM users u
JOIN certifications c
    ON c.user_ref = u.id;

CREATE OR REPLACE VIEW v_exam_result_summary AS
SELECT
    e.id AS exam_pk,
    e.exam_code,
    e.exam_name,
    e.certification_level,
    COUNT(ea.id) AS total_attempts,
    COUNT(*) FILTER (WHERE ea.result_status = 'PASS') AS pass_count,
    COUNT(*) FILTER (WHERE ea.result_status = 'FAIL') AS fail_count,
    ROUND(
        (
            COUNT(*) FILTER (WHERE ea.result_status = 'PASS')::NUMERIC
            / NULLIF(COUNT(ea.id), 0)
        ) * 100,
        2
    ) AS pass_percentage
FROM exams e
LEFT JOIN exam_sessions es
    ON es.exam_ref = e.id
LEFT JOIN exam_attempts ea
    ON ea.exam_session_ref = es.id
GROUP BY
    e.id,
    e.exam_code,
    e.exam_name,
    e.certification_level;

CREATE OR REPLACE VIEW v_daily_revenue_summary AS
SELECT
    DATE_TRUNC('day', p.payment_date) AS revenue_day,
    p.currency,
    COUNT(p.id) AS transaction_count,
    SUM(p.amount) AS total_amount
FROM payments p
WHERE p.payment_status = 'SUCCESS'
    AND p.payment_date IS NOT NULL
GROUP BY
    DATE_TRUNC('day', p.payment_date),
    p.currency;

CREATE OR REPLACE VIEW v_violation_summary AS
SELECT
    v.violation_type,
    COUNT(v.id) AS violation_count,
    MIN(v.detected_at) AS first_detected_at,
    MAX(v.detected_at) AS last_detected_at
FROM violations v
GROUP BY v.violation_type;