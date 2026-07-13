INSERT INTO `feature_flags` (`key`, `value`, `updated_at`) VALUES
  ('receipt_printing_enabled', 'true', strftime('%s', 'now') * 1000);
