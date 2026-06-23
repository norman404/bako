INSERT INTO `feature_flags` (`key`, `value`, `updated_at`) VALUES
  ('auto_update_enabled', 'true', strftime('%s', 'now') * 1000);
