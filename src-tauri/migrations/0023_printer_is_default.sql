ALTER TABLE `printers` ADD COLUMN `is_default` INTEGER NOT NULL DEFAULT 0;

INSERT INTO `printers` (`id`, `name`, `type`, `address`, `role`, `is_default`, `created_at`, `updated_at`)
SELECT
  'receipt-default-legacy',
  'Caja',
  `printer_type`,
  `printer_address`,
  'receipt',
  1,
  strftime('%s','now') * 1000,
  strftime('%s','now') * 1000
FROM `system_settings`
WHERE `id` = 'current'
  AND `printer_type` IS NOT NULL
  AND `printer_type` != 'none'
  AND `printer_address` IS NOT NULL
  AND `printer_address` != ''
  AND NOT EXISTS (
    SELECT 1 FROM `printers`
    WHERE `role` = 'receipt' AND `is_default` = 1 AND `deleted_at` IS NULL
  );