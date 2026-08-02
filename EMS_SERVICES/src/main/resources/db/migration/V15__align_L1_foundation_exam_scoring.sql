-- src/main/resources/db/migration/V15__align_l1_foundation_exam_scoring.sql
UPDATE exams
SET total_marks = 30.00, updated_by = 'SYSTEM', updated_date = CURRENT_TIMESTAMP
WHERE exam_code = 'L1-FOUND-001';

UPDATE exam_attempts ea
SET percentage = ROUND((ea.obtained_marks * 100.0) / 30.0, 2),
    updated_by = 'SYSTEM',
    updated_date = CURRENT_TIMESTAMP
FROM exam_sessions es
JOIN exams e ON e.id = es.exam_ref
WHERE ea.exam_session_ref = es.id
  AND e.exam_code = 'L1-FOUND-001'
  AND 30.0 > 0;
