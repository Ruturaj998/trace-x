-- ==============================================================================
-- TRACE-X Migration 001 Rollback: Drop Added Performance Indexes
-- ==============================================================================

DROP INDEX IF EXISTS idx_devices_user_id;
DROP INDEX IF EXISTS idx_devices_user_id_status;
DROP INDEX IF EXISTS idx_locations_device_id;
DROP INDEX IF EXISTS idx_locations_timestamp;
DROP INDEX IF EXISTS idx_locations_device_timestamp;
DROP INDEX IF EXISTS idx_status_history_device_changed;
DROP INDEX IF EXISTS idx_password_reset_tokens_user_id;
DROP INDEX IF EXISTS idx_password_reset_tokens_expires_at;
DROP INDEX IF EXISTS idx_contact_messages_email;
DROP INDEX IF EXISTS idx_contact_messages_submitted_at;
