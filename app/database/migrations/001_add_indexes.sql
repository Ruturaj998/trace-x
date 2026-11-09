-- ==============================================================================
-- TRACE-X Migration 001: Evidence-Based Performance Indexes
-- ==============================================================================
-- Rationale:
-- 1. devices(user_id) - Required for tenant isolation queries (WHERE user_id = current_user_id).
-- 2. devices(user_id, status) - Optimizes dashboard summary counts (WHERE user_id = current_user_id AND status = val).
-- 3. locations(device_id) - Essential foreign-key index preventing table scans as GPS telemetry scales.
-- 4. locations(device_id, timestamp DESC) - Enables O(1)/O(log N) lookups for latest location fix.
-- 5. device_status_history(device_id, changed_at DESC) - Speeds up recent activity feed ordering.
-- 6. password_reset_tokens(user_id, expires_at) - Speeds up token lifecycle checks.
-- 7. contact_messages(email, submitted_at DESC) - Support queue filtering.
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices (user_id);
CREATE INDEX IF NOT EXISTS idx_devices_user_id_status ON devices (user_id, status);
CREATE INDEX IF NOT EXISTS idx_locations_device_id ON locations (device_id);
CREATE INDEX IF NOT EXISTS idx_locations_timestamp ON locations (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_locations_device_timestamp ON locations (device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_status_history_device_changed ON device_status_history (device_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens (expires_at);
CREATE INDEX IF NOT EXISTS idx_contact_messages_email ON contact_messages (email);
CREATE INDEX IF NOT EXISTS idx_contact_messages_submitted_at ON contact_messages (submitted_at DESC);
