CREATE TABLE `payments` (
  `id` text PRIMARY KEY NOT NULL,
  `order_id` text NOT NULL,
  `method` text NOT NULL CHECK (`method` IN ('cash', 'card')),
  `amount` integer NOT NULL CHECK (`amount` >= 0),
  `created_at` integer NOT NULL,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE UNIQUE INDEX `idx_payments_order_id` ON `payments` (`order_id`);
CREATE INDEX `idx_payments_method` ON `payments` (`method`);
CREATE INDEX `idx_payments_created_at` ON `payments` (`created_at`);
