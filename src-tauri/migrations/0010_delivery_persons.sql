-- Delivery persons table (soft-delete, same pattern as categories)
CREATE TABLE `delivery_persons` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `color` text NOT NULL,
  `phone` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  `deleted_at` integer
);

CREATE INDEX `idx_delivery_persons_deleted_at` ON `delivery_persons` (`deleted_at`);

-- Link delivery person to order (1:N). Nullable: local and legacy orders don't have it.
ALTER TABLE `orders` ADD COLUMN `delivery_person_id` text
  REFERENCES `delivery_persons`(`id`) ON UPDATE no action ON DELETE no action;

CREATE INDEX `idx_orders_delivery_person_id` ON `orders` (`delivery_person_id`);

-- Feature flag disabled by default
INSERT INTO `feature_flags` (`key`, `value`, `updated_at`) VALUES
  ('delivery_enabled', 'false', strftime('%s', 'now') * 1000);
