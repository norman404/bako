CREATE TABLE `categories` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `description` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  `deleted_at` integer
);

CREATE TABLE `products` (
  `id` text PRIMARY KEY NOT NULL,
  `category_id` text NOT NULL,
  `name` text NOT NULL,
  `description` text NOT NULL,
  `price` integer NOT NULL,
  `prep_time_minutes` integer NOT NULL,
  `image` text NOT NULL,
  `is_popular` integer DEFAULT 0 NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  `deleted_at` integer,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX `idx_products_category_id` ON `products` (`category_id`);
CREATE INDEX `idx_products_deleted_at` ON `products` (`deleted_at`);
CREATE INDEX `idx_categories_deleted_at` ON `categories` (`deleted_at`);
