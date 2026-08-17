ALTER TABLE payments ADD COLUMN cash_received INTEGER;

UPDATE payments
SET
  cash_received = amount,
  amount = COALESCE(
    (SELECT total FROM orders WHERE orders.id = payments.order_id),
    amount
  )
WHERE method = 'cash';

DROP INDEX idx_payments_order_id;
CREATE UNIQUE INDEX idx_payments_order_method ON payments (order_id, method);
