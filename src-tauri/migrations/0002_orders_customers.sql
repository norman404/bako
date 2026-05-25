CREATE TABLE `customers` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `phone` text NOT NULL,
  `address` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE TABLE `orders` (
  `id` text PRIMARY KEY NOT NULL,
  `ticket_number` integer NOT NULL,
  `customer_id` text,
  `total` integer NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `order_items` (
  `id` text PRIMARY KEY NOT NULL,
  `order_id` text NOT NULL,
  `product_id` text NOT NULL,
  `quantity` integer NOT NULL,
  `unit_price` integer NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX `idx_customers_phone` ON `customers` (`phone`);
CREATE UNIQUE INDEX `idx_orders_ticket_number` ON `orders` (`ticket_number`);
CREATE INDEX `idx_orders_customer_id` ON `orders` (`customer_id`);
CREATE INDEX `idx_orders_created_at` ON `orders` (`created_at`);
CREATE INDEX `idx_order_items_order_id` ON `order_items` (`order_id`);
CREATE INDEX `idx_order_items_product_id` ON `order_items` (`product_id`);
