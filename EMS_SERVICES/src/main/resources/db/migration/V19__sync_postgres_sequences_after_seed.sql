-- Align PostgreSQL identity sequences with current max(id) values.
-- This prevents duplicate primary key inserts after manual/seeded id values.

SELECT setval(
    pg_get_serial_sequence('certifications', 'id'),
    COALESCE((SELECT MAX(id) FROM certifications), 1),
    true
);

SELECT setval(
    pg_get_serial_sequence('certification_history', 'id'),
    COALESCE((SELECT MAX(id) FROM certification_history), 1),
    true
);