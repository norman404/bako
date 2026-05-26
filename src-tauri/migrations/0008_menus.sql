CREATE TABLE IF NOT EXISTS `menus` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `is_default` integer NOT NULL DEFAULT 0,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

-- Add menu_id to categories (nullable for migration safety, enforced in app)
ALTER TABLE `categories` ADD COLUMN `menu_id` text REFERENCES `menus`(`id`);

-- Add menu_id to products (nullable for migration safety, enforced in app)
ALTER TABLE `products` ADD COLUMN `menu_id` text REFERENCES `menus`(`id`);

-- Create default menu and assign all existing categories/products to it
INSERT INTO `menus` (`id`, `name`, `is_default`, `created_at`, `updated_at`)
VALUES ('default', 'Default Menu', 1, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

UPDATE `categories` SET `menu_id` = 'default' WHERE `menu_id` IS NULL;
UPDATE `products` SET `menu_id` = 'default' WHERE `menu_id` IS NULL;
