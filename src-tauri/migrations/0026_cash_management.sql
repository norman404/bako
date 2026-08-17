ALTER TABLE shifts ADD COLUMN opening_cash INTEGER;
ALTER TABLE shifts ADD COLUMN counted_cash INTEGER;
ALTER TABLE shifts ADD COLUMN cash_difference INTEGER;

CREATE TABLE IF NOT EXISTS cash_movements (
  id TEXT PRIMARY KEY,
  shift_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cash_movements_shift_id ON cash_movements(shift_id);