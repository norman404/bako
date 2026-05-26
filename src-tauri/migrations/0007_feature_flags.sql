CREATE TABLE IF NOT EXISTS `feature_flags` (
  `key` text PRIMARY KEY NOT NULL,
  `value` text NOT NULL,
  `updated_at` integer NOT NULL
);

INSERT INTO `feature_flags` (`key`, `value`, `updated_at`) VALUES
  ('categories_enabled', 'false', strftime('%s', 'now') * 1000),
  ('multiple_menus_enabled', 'false', strftime('%s', 'now') * 1000);
