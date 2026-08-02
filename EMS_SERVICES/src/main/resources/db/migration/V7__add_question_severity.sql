
-- src/main/resources/db/migration/V7__add_question_severity.sql

ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS severity VARCHAR(10);

UPDATE questions
SET severity = 'MEDIUM'
WHERE severity IS NULL;

ALTER TABLE questions
    ALTER COLUMN severity SET NOT NULL;

ALTER TABLE questions
    ADD CONSTRAINT chk_questions_severity
    CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH'));

CREATE INDEX IF NOT EXISTS idx_questions_level_severity
    ON questions (certification_level, severity);

