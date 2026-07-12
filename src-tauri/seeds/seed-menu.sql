-- Bako — Seed del menú de pruebas
-- Ejecutar con: bun run seed
-- Idempotente: seguro correr múltiples veces (INSERT OR IGNORE + UPDATE condicional)

INSERT OR IGNORE INTO `categories` (`id`, `name`, `description`, `created_at`, `updated_at`, `deleted_at`) VALUES
  ('tacos', 'Tacos', 'Tacos clásicos y especiales', 1767225600000, 1767225600000, NULL),
  ('tortas', 'Tortas', 'Tortas armadas con pan telera', 1767225600000, 1767225600000, NULL),
  ('sides', 'Guarniciones', 'Acompañantes y extras', 1767225600000, 1767225600000, NULL),
  ('drinks', 'Bebidas', 'Refrescos, aguas frescas y cerveza', 1767225600000, 1767225600000, NULL),
  ('postres', 'Postres', 'Dulces típicos mexicanos', 1767225600000, 1767225600000, NULL);

INSERT OR IGNORE INTO `products` (`id`, `category_id`, `name`, `description`, `price`, `prep_time_minutes`, `image`, `is_popular`, `created_at`, `updated_at`, `deleted_at`) VALUES
  ('taco-pastor', 'tacos', 'Taco al pastor', 'Piña, cebolla y cilantro', 4500, 5, '🌮', 1, 1767225600000, 1767225600000, NULL),
  ('taco-asada', 'tacos', 'Taco de asada', 'Carne asada a la parrilla', 5000, 6, '🥩', 0, 1767225600000, 1767225600000, NULL),
  ('torta-pastor', 'tortas', 'Torta al pastor', 'Piña, cebolla, aguacate y frijoles', 8500, 8, '🥪', 1, 1767225600000, 1767225600000, NULL),
  ('torta-milanesa', 'tortas', 'Torta de milanesa', 'Milanesa de res, lechuga y tomate', 9000, 10, '🥩', 0, 1767225600000, 1767225600000, NULL),
  ('papas-fritas', 'sides', 'Papas fritas', 'Papas crujientes con sal', 3500, 5, '🍟', 0, 1767225600000, 1767225600000, NULL),
  ('guacamole', 'sides', 'Guacamole con totopos', 'Aguacate fresco, cebolla y cilantro', 4000, 3, '🥑', 0, 1767225600000, 1767225600000, NULL),
  ('coca-cola', 'drinks', 'Coca Cola', 'Lata 355ml', 2500, 1, '🥤', 1, 1767225600000, 1767225600000, NULL),
  ('horchata', 'drinks', 'Agua de horchata', 'Arroz, canela y vainilla', 3000, 2, '🫗', 0, 1767225600000, 1767225600000, NULL),
  ('churros', 'postres', 'Churros con cajeta', 'Crujientes, bañados en cajeta', 4500, 5, '🫓', 0, 1767225600000, 1767225600000, NULL),
  ('flan', 'postres', 'Flan napolitano', 'Con caramelo', 5000, 3, '🍮', 0, 1767225600000, 1767225600000, NULL);

INSERT OR IGNORE INTO `menus` (`id`, `name`, `is_default`, `created_at`, `updated_at`)
VALUES ('default', 'Default Menu', 1, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

UPDATE `categories` SET `menu_id` = 'default' WHERE `menu_id` IS NULL;
UPDATE `products` SET `menu_id` = 'default' WHERE `menu_id` IS NULL;

INSERT OR IGNORE INTO `product_menus` (`product_id`, `menu_id`)
SELECT `id`, 'default' FROM `products` WHERE `deleted_at` IS NULL;