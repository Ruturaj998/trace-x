-- ==============================================================================
-- TRACE-X Migration 003: Device Authentication, Connectivity & Offline Buffering
-- ==============================================================================
-- Rationale:
-- 1. devices(device_token_hash, device_token_prefix): Dedicated device credentials
--    storing only secure SHA-256 hashes for edge agent authentication.
-- 2. devices(last_seen): Tracks latest verified telemetry fix timestamp for real
--    online/offline connectivity status calculations.
-- 3. locations(recorded_at): Preserves original client/hardware capture timestamp
--    for offline store-and-forward telemetry synchronization.
-- 4. locations(idempotency_key): Deduplicates buffered telemetry retransmissions.
-- ==============================================================================

-- 1. Device credentials & last_seen
ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_token_hash VARCHAR(128);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_token_prefix VARCHAR(16);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE;

-- 2. Location offline capture timestamp and idempotency
ALTER TABLE locations ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64);

-- 3. Performance & lookup indexes
CREATE INDEX IF NOT EXISTS idx_devices_token_hash ON devices (device_token_hash);
CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices (last_seen);
CREATE INDEX IF NOT EXISTS idx_locations_idempotency ON locations (device_id, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_locations_recorded_at ON locations (device_id, recorded_at DESC);
