-- ==============================================================================
-- TRACE-X Migration 002 Rollback: Revert Foreign Key Cascades & Timezones
-- ==============================================================================
-- 1. Revert locations(device_id) foreign key to non-cascading constraint
ALTER TABLE locations DROP CONSTRAINT IF EXISTS locations_device_id_fkey;
ALTER TABLE locations ADD CONSTRAINT locations_device_id_fkey
    FOREIGN KEY (device_id) REFERENCES devices (id);

-- 2. Revert device_status_history(device_id) foreign key to non-cascading constraint
ALTER TABLE device_status_history DROP CONSTRAINT IF EXISTS device_status_history_device_id_fkey;
ALTER TABLE device_status_history ADD CONSTRAINT device_status_history_device_id_fkey
    FOREIGN KEY (device_id) REFERENCES devices (id);

-- 3. Revert timestamp columns to TIMESTAMP WITHOUT TIME ZONE
ALTER TABLE locations ALTER COLUMN timestamp TYPE TIMESTAMP WITHOUT TIME ZONE USING timestamp AT TIME ZONE 'UTC';
ALTER TABLE device_status_history ALTER COLUMN changed_at TYPE TIMESTAMP WITHOUT TIME ZONE USING changed_at AT TIME ZONE 'UTC';
