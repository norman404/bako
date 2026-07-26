ALTER TABLE printers ADD COLUMN label_language TEXT DEFAULT 'tspl';
UPDATE printers SET label_language = 'tspl' WHERE label_language IS NULL;
