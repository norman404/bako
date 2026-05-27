CREATE TABLE `product_menus` (
  `product_id` text NOT NULL REFERENCES `products`(`id`) ON DELETE CASCADE,
  `menu_id` text NOT NULL REFERENCES `menus`(`id`) ON DELETE CASCADE,
  PRIMARY KEY (`product_id`, `menu_id`)
);

CREATE INDEX `idx_product_menus_menu_id` ON `product_menus`(`menu_id`);

-- Migrar datos existentes desde products.menu_id
INSERT INTO `product_menus` (`product_id`, `menu_id`)
SELECT `id`, `menu_id` FROM `products` WHERE `menu_id` IS NOT NULL;
