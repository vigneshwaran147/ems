


-- src/main/resources/db/migration/V4__migrate_profile_photo_to_base64_storage.sql

-- ems_backend/src/main/resources/db/migration/V4__migrate_profile_photo_to_base64_storage.sql

ALTER TABLE users
    RENAME COLUMN profile_photo_url TO profile_photo;

