CREATE TABLE IF NOT EXISTS `printers` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `type` text NOT NULL,
  `address` text NOT NULL,
  `role` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  `deleted_at` integer
);

ALTER TABLE `categories` ADD COLUMN `printer_id` text REFERENCES `printers`(`id`);

CREATE INDEX IF NOT EXISTS `idx_printers_deleted_at` ON `printers` (`deleted_at`);
CREATE INDEX IF NOT EXISTS `idx_categories_printer_id` ON `categories` (`printer_id`);
