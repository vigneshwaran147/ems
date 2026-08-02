
-- ems_backend/src/main/resources/db/migration/V5__migrate_profile_photo_to_object_storage_key.sql

ALTER TABLE users
    RENAME COLUMN profile_photo TO profile_photo_key;

