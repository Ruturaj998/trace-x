-- ==============================================================================
-- TRACE-X Migration 002: Foreign Key Cascades & Timezone-Aware Timestamps
-- ==============================================================================
-- Rationale:
-- 1. locations(device_id): Add ON DELETE CASCADE so deleting a device automatically
--    removes associated telemetry fixes without leaving orphaned rows or raising FK errors.
-- 2. device_status_history(device_id): Add ON DELETE CASCADE so deleting a device
--    automatically removes associated status transitions.
-- 3. locations(timestamp): Convert to TIMESTAMP WITH TIME ZONE explicitly in UTC.
-- 4. device_status_history(changed_at): Convert to TIMESTAMP WITH TIME ZONE explicitly in UTC.
-- ==============================================================================

-- 1. Locations foreign key cascade
ALTER TABLE locations DROP CONSTRAINT IF EXISTS locations_device_id_fkey;
ALTER TABLE locations ADD CONSTRAINT locations_device_id_fkey
    FOREIGN KEY (device_id) REFERENCES devices (id) ON DELETE CASCADE;

-- 2. Device status history foreign key cascade
ALTER TABLE device_status_history DROP CONSTRAINT IF EXISTS device_status_history_device_id_fkey;
ALTER TABLE device_status_history ADD CONSTRAINT device_status_history_device_id_fkey
    FOREIGN KEY (device_id) REFERENCES devices (id) ON DELETE CASCADE;

-- 3. Convert timestamp columns to TIMESTAMP WITH TIME ZONE (preserving UTC semantics)
ALTER TABLE locations ALTER COLUMN timestamp TYPE TIMESTAMP WITH TIME ZONE USING timestamp AT TIME ZONE 'UTC';
ALTER TABLE device_status_history ALTER COLUMN changed_at TYPE TIMESTAMP WITH TIME ZONE USING changed_at AT TIME ZONE 'UTC';
