CREATE TABLE `promotions` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `type` text NOT NULL CHECK (`type` IN ('nxm', 'bundle')),
  `buy_quantity` integer CHECK (`buy_quantity` IS NULL OR `buy_quantity` >= 2),
  `pay_quantity` integer CHECK (`pay_quantity` IS NULL OR `pay_quantity` >= 1),
  `bundle_price` integer CHECK (`bundle_price` IS NULL OR `bundle_price` >= 0),
  `schedule` text NOT NULL,
  `is_active` integer NOT NULL DEFAULT 1,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  `deleted_at` integer,
  CHECK (
    (`type` = 'nxm' AND `buy_quantity` IS NOT NULL AND `pay_quantity` IS NOT NULL AND `pay_quantity` < `buy_quantity` AND `bundle_price` IS NULL)
    OR (`type` = 'bundle' AND `bundle_price` IS NOT NULL AND `buy_quantity` IS NULL AND `pay_quantity` IS NULL)
  )
);
CREATE INDEX `idx_promotions_deleted_at` ON `promotions` (`deleted_at`);

CREATE TABLE `promotion_targets` (
  `id` text PRIMARY KEY NOT NULL,
  `promotion_id` text NOT NULL REFERENCES `promotions`(`id`) ON DELETE CASCADE,
  `product_id` text REFERENCES `products`(`id`),
  `category_id` text REFERENCES `categories`(`id`),
  `quantity` integer NOT NULL DEFAULT 1 CHECK (`quantity` >= 1),
  CHECK ((`product_id` IS NULL) <> (`category_id` IS NULL))
);
CREATE INDEX `idx_promotion_targets_promotion_id` ON `promotion_targets` (`promotion_id`);

ALTER TABLE `products` ADD COLUMN `kind` text NOT NULL DEFAULT 'standard' CHECK (`kind` IN ('standard', 'composite'));
ALTER TABLE `products` ADD COLUMN `availability_schedule` text;

CREATE TABLE `product_components` (
  `parent_product_id` text NOT NULL REFERENCES `products`(`id`) ON DELETE CASCADE,
  `component_product_id` text NOT NULL REFERENCES `products`(`id`),
  `quantity` integer NOT NULL DEFAULT 1 CHECK (`quantity` >= 1),
  `sort_order` integer NOT NULL DEFAULT 0,
  PRIMARY KEY (`parent_product_id`, `component_product_id`),
  CHECK (`parent_product_id` <> `component_product_id`)
);
CREATE INDEX `idx_product_components_component` ON `product_components` (`component_product_id`);

CREATE TABLE `order_promotions` (
  `id` text PRIMARY KEY NOT NULL,
  `order_id` text NOT NULL REFERENCES `orders`(`id`) ON DELETE CASCADE,
  `promotion_id` text,
  `kind` text NOT NULL CHECK (`kind` IN ('nxm', 'bundle', 'composite')),
  `name_snapshot` text NOT NULL,
  `rule_snapshot` text NOT NULL,
  `discount_amount` integer NOT NULL CHECK (`discount_amount` > 0),
  `created_at` integer NOT NULL
);
CREATE INDEX `idx_order_promotions_order_id` ON `order_promotions` (`order_id`);
CREATE INDEX `idx_order_promotions_promotion_id` ON `order_promotions` (`promotion_id`);

ALTER TABLE `order_items` ADD COLUMN `discount_amount` integer NOT NULL DEFAULT 0 CHECK (`discount_amount` >= 0);
ALTER TABLE `order_items` ADD COLUMN `order_promotion_id` text REFERENCES `order_promotions`(`id`) ON DELETE SET NULL;
ALTER TABLE `order_items` ADD COLUMN `parent_order_item_id` text REFERENCES `order_items`(`id`) ON DELETE CASCADE;
CREATE INDEX `idx_order_items_parent` ON `order_items` (`parent_order_item_id`);

INSERT INTO `feature_flags` (`key`, `value`, `updated_at`) VALUES
  ('promotions_enabled', 'false', strftime('%s', 'now') * 1000);
