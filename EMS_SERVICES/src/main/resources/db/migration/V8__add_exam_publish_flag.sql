
-- src/main/resources/db/migration/V8__add_exam_publish_flag.sql

ALTER TABLE exams
    ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_exams_level_published
    ON exams (certification_level, published);

