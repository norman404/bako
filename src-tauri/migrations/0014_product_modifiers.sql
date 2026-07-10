CREATE TABLE IF NOT EXISTS `modifier_groups` (
  `id` text NOT NULL PRIMARY KEY,
  `name` text NOT NULL,
  `type` text NOT NULL CHECK(`type` IN ('single','multiple','text','single_text')),
  `required` integer NOT NULL DEFAULT 0,
  `sort_order` integer NOT NULL DEFAULT 0,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  `deleted_at` integer
);
CREATE INDEX IF NOT EXISTS `idx_modifier_groups_deleted_at` ON `modifier_groups`(`deleted_at`);

CREATE TABLE IF NOT EXISTS `modifier_options` (
  `id` text NOT NULL PRIMARY KEY,
  `group_id` text NOT NULL REFERENCES `modifier_groups`(`id`) ON DELETE CASCADE,
  `name` text NOT NULL,
  `price_delta` integer NOT NULL DEFAULT 0,
  `is_default` integer NOT NULL DEFAULT 0,
  `sort_order` integer NOT NULL DEFAULT 0,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  `deleted_at` integer
);
CREATE INDEX IF NOT EXISTS `idx_modifier_options_group_id` ON `modifier_options`(`group_id`);
CREATE INDEX IF NOT EXISTS `idx_modifier_options_deleted_at` ON `modifier_options`(`deleted_at`);

CREATE TABLE IF NOT EXISTS `category_modifier_groups` (
  `category_id` text NOT NULL REFERENCES `categories`(`id`) ON DELETE CASCADE,
  `group_id` text NOT NULL REFERENCES `modifier_groups`(`id`) ON DELETE CASCADE,
  PRIMARY KEY (`category_id`, `group_id`)
);
CREATE INDEX IF NOT EXISTS `idx_category_modifier_groups_group_id` ON `category_modifier_groups`(`group_id`);

CREATE TABLE IF NOT EXISTS `product_modifier_groups` (
  `product_id` text NOT NULL REFERENCES `products`(`id`) ON DELETE CASCADE,
  `group_id` text NOT NULL REFERENCES `modifier_groups`(`id`) ON DELETE CASCADE,
  PRIMARY KEY (`product_id`, `group_id`)
);
CREATE INDEX IF NOT EXISTS `idx_product_modifier_groups_group_id` ON `product_modifier_groups`(`group_id`);

CREATE TABLE IF NOT EXISTS `order_item_modifiers` (
  `id` text NOT NULL PRIMARY KEY,
  `order_item_id` text NOT NULL REFERENCES `order_items`(`id`) ON DELETE CASCADE,
  `group_id` text,
  `group_name` text NOT NULL,
  `option_id` text,
  `option_name` text NOT NULL,
  `price_delta` integer NOT NULL DEFAULT 0,
  `text_value` text,
  `created_at` integer NOT NULL
);
CREATE INDEX IF NOT EXISTS `idx_order_item_modifiers_order_item_id` ON `order_item_modifiers`(`order_item_id`);