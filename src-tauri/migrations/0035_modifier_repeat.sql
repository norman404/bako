ALTER TABLE `modifier_groups` ADD COLUMN `allow_repeat` integer NOT NULL DEFAULT 0;
ALTER TABLE `modifier_groups` ADD COLUMN `max_repeat` integer NOT NULL DEFAULT 3 CHECK (`max_repeat` BETWEEN 1 AND 20);
