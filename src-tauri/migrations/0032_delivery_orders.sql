ALTER TABLE orders ADD COLUMN channel TEXT NOT NULL DEFAULT 'local' CHECK (channel IN ('local', 'uber', 'didi'));
ALTER TABLE orders ADD COLUMN delivery_reference TEXT;
ALTER TABLE orders ADD COLUMN confirmed_at INTEGER;
ALTER TABLE orders ADD COLUMN financial_shift_id TEXT;

UPDATE orders SET confirmed_at = created_at, financial_shift_id = shift_id;

CREATE INDEX idx_orders_financial_shift_id ON orders (financial_shift_id);
CREATE INDEX idx_orders_confirmed_at ON orders (confirmed_at);
CREATE INDEX idx_orders_pending_delivery ON orders (channel, created_at) WHERE confirmed_at IS NULL AND voided_at IS NULL;

ALTER TABLE shifts ADD COLUMN delivery_pending_ids TEXT;
