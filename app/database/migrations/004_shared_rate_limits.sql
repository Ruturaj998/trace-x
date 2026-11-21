CREATE TABLE IF NOT EXISTS rate_limit_hits (
    bucket VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_bucket_expiry ON rate_limit_hits (bucket, expires_at);
CREATE INDEX IF NOT EXISTS idx_rate_limit_expiry ON rate_limit_hits (expires_at);
