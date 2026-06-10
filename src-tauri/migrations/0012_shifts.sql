CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY,
  opened_at INTEGER NOT NULL,
  closed_at INTEGER,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);
CREATE INDEX IF NOT EXISTS idx_shifts_opened_at ON shifts(opened_at);

-- Add shift_id to orders (nullable, no FK constraint for legacy compatibility)
ALTER TABLE orders ADD COLUMN shift_id TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_shift_id ON orders(shift_id);

-- Insert default feature flag
INSERT OR IGNORE INTO feature_flags (key, value, updated_at)
VALUES ('shift_management_enabled', 'false', strftime('%s', 'now') * 1000);
