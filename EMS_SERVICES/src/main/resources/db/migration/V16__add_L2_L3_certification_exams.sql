
-- src/main/resources/db/migration/V16__add_l2_l3_certification_exams.sql
-- Add L2 and L3 certification exams with their respective questions
-- This migration ensures L2/L3 exams are available once L1 is completed

INSERT INTO exams (
    exam_code,
    exam_name,
    certification_level,
    duration_minutes,
    total_marks,
    passing_percentage,
    exam_status,
    published,
    scheduled_start_time,
    scheduled_end_time,
    created_by,
    created_date,
    updated_by,
    updated_date
)
VALUES
(
    'L2-ADV-001',
    'Level 2 Advanced Certification Exam',
    'L2',
    90,
    40.00,
    60.00,
    'SCHEDULED',
    true,
    NOW() - INTERVAL '1 day',
    NOW() + INTERVAL '30 days',
    'SYSTEM',
    NOW(),
    'SYSTEM',
    NOW()
),
(
    'L3-EXPERT-001',
    'Level 3 Expert Certification Exam',
    'L3',
    120,
    50.00,
    65.00,
    'SCHEDULED',
    true,
    NOW() - INTERVAL '1 day',
    NOW() + INTERVAL '30 days',
    'SYSTEM',
    NOW(),
    'SYSTEM',
    NOW()
);

-- L2 Questions (30 total: 6 LOW, 12 MEDIUM, 12 HIGH)

INSERT INTO questions (
    question_code,
    certification_level,
    question_category,
    question_type,
    question_text,
    options_json,
    correct_options_json,
    severity,
    marks,
    active,
    created_by,
    created_date,
    updated_by,
    updated_date
)
VALUES
(
    'L2-LOW-001',
    'L2',
    'Technical',
    'Single Choice',
    'Which design pattern is most suitable for database connection pooling?',
    '["Object Pool","Singleton","Factory","Observer"]',
    '["Object Pool"]',
    'LOW',
    1.33,
    true,
    'SYSTEM',
    NOW(),
    'SYSTEM',
    NOW()
),
(
    'L2-LOW-002',
    'L2',
    'Technical',
    'Single Choice',
    'What is caching primarily used to improve?',
    '["Application performance","Code readability","Documentation","Team morale"]',
    '["Application performance"]',
    'LOW',
    1.33,
    true,
    'SYSTEM',
    NOW(),
    'SYSTEM',
    NOW()
),
(
    'L2-LOW-004',
    'L2',
    'Compliance',
    'Single Choice',
    'Which practice ensures data consistency in multi-threaded environments?',
    '["Synchronization","Randomization","Serialization","Tokenization"]',
    '["Synchronization"]',
    'LOW',
    1.33,
    true,
    'SYSTEM',
    NOW(),
    'SYSTEM',
    NOW()
),
(
    'L2-LOW-005',
    'L2',
    'Technical',
    'Single Choice',
    'What does ACID stand for in database transactions?',
    '["Atomicity Consistency Isolation Durability","Application Code Integration Database","Advanced Coding Interface Design","Aggregate Computation Indexing Data"]',
    '["Atomicity Consistency Isolation Durability"]',
    'LOW',
    1.33,
    true,
    'SYSTEM',
    NOW(),
    'SYSTEM',
    NOW()
);
