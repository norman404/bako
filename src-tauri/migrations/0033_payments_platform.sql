CREATE TABLE `payments_new` (
  `id` text PRIMARY KEY NOT NULL,
  `order_id` text NOT NULL,
  `method` text NOT NULL CHECK (`method` IN ('cash', 'card', 'platform')),
  `amount` integer NOT NULL CHECK (`amount` >= 0),
  `cash_received` integer,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);

INSERT INTO `payments_new` (`id`, `order_id`, `method`, `amount`, `cash_received`, `created_at`)
  SELECT `id`, `order_id`, `method`, `amount`, `cash_received`, `created_at` FROM `payments`;

DROP TABLE `payments`;
ALTER TABLE `payments_new` RENAME TO `payments`;

CREATE UNIQUE INDEX `idx_payments_order_method` ON `payments` (`order_id`, `method`);
CREATE INDEX `idx_payments_method` ON `payments` (`method`);
CREATE INDEX `idx_payments_created_at` ON `payments` (`created_at`);
