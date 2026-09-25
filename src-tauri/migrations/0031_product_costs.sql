ALTER TABLE products ADD COLUMN cost_price INTEGER NOT NULL DEFAULT 0 CHECK (cost_price >= 0);
ALTER TABLE order_items ADD COLUMN unit_cost INTEGER NOT NULL DEFAULT 0 CHECK (unit_cost >= 0);
