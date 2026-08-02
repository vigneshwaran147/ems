

-- src/main/resources/db/migration/V14__set_user_roles_audit_defaults.sql
-- ems_backend/src/main/resources/db/migration/V14__set_user_roles_audit_defaults.sql

ALTER TABLE user_roles
    ALTER COLUMN created_by SET DEFAULT 'SYSTEM';

ALTER TABLE user_roles
    ALTER COLUMN created_date SET DEFAULT CURRENT_TIMESTAMP;