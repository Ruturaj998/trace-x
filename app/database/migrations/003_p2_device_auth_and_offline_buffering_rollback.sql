-- ==============================================================================
-- TRACE-X Migration 003 Rollback: Revert Device Auth & Offline Buffering
-- ==============================================================================

DROP INDEX IF EXISTS idx_locations_recorded_at;
DROP INDEX IF EXISTS idx_locations_idempotency;
DROP INDEX IF EXISTS idx_devices_last_seen;
DROP INDEX IF EXISTS idx_devices_token_hash;

ALTER TABLE locations DROP COLUMN IF EXISTS idempotency_key;
ALTER TABLE locations DROP COLUMN IF EXISTS recorded_at;

ALTER TABLE devices DROP COLUMN IF EXISTS last_seen;
ALTER TABLE devices DROP COLUMN IF EXISTS device_token_prefix;
ALTER TABLE devices DROP COLUMN IF EXISTS device_token_hash;
