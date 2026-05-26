CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` text PRIMARY KEY NOT NULL,
  `locale` text NOT NULL,
  `currency` text NOT NULL,
  `updated_at` integer NOT NULL
);
