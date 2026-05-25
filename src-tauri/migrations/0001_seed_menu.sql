INSERT INTO `categories` (`id`, `name`, `description`, `created_at`, `updated_at`, `deleted_at`) VALUES
  ('coffee', 'Café', 'Espresso, filtrados y especiales', 1767225600000, 1767225600000, NULL),
  ('breakfast', 'Desayunos', 'Tostados y combos ligeros', 1767225600000, 1767225600000, NULL),
  ('bakery', 'Panadería', 'Facturas y horneados del día', 1767225600000, 1767225600000, NULL),
  ('cold-drinks', 'Fríos', 'Jugos, limonadas y brew frío', 1767225600000, 1767225600000, NULL),
  ('desserts', 'Postres', 'Porciones dulces para vitrina', 1767225600000, 1767225600000, NULL);

INSERT INTO `products` (`id`, `category_id`, `name`, `description`, `price`, `prep_time_minutes`, `image`, `is_popular`, `created_at`, `updated_at`, `deleted_at`) VALUES
  ('espresso-doble', 'coffee', 'Espresso doble', 'Blend de la casa, extracción intensa', 5500, 3, '☕', 1, 1767225600000, 1767225600000, NULL),
  ('latte-vainilla', 'coffee', 'Latte vainilla', 'Leche vaporizada y toque dulce', 6500, 5, '🥛', 0, 1767225600000, 1767225600000, NULL),
  ('combo-tostado', 'breakfast', 'Combo tostado', 'Tostado jamón/queso + café chico', 12000, 8, '🥪', 1, 1767225600000, 1767225600000, NULL),
  ('avocado-toast', 'breakfast', 'Avocado toast', 'Pan masa madre, palta y semillas', 9500, 7, '🍞', 0, 1767225600000, 1767225600000, NULL),
  ('medialuna-manteca', 'bakery', 'Medialuna de manteca', 'Horneada en el turno mañana', 2800, 2, '🥐', 0, 1767225600000, 1767225600000, NULL),
  ('muffin-arandanos', 'bakery', 'Muffin de arándanos', 'Miga húmeda, topping crocante', 4500, 2, '🧁', 0, 1767225600000, 1767225600000, NULL),
  ('cold-brew-tonic', 'cold-drinks', 'Cold brew tonic', 'Café frío, tónica y piel cítrica', 7500, 4, '🧊', 0, 1767225600000, 1767225600000, NULL),
  ('limonada-menta', 'cold-drinks', 'Limonada menta', 'Limonada natural sin gas', 4800, 3, '🍋', 0, 1767225600000, 1767225600000, NULL),
  ('cheesecake-porcion', 'desserts', 'Cheesecake', 'Frutos rojos y base de galleta', 8000, 2, '🍰', 0, 1767225600000, 1767225600000, NULL),
  ('brownie-nuez', 'desserts', 'Brownie de nuez', 'Chocolate 70%, nuez tostada', 5500, 2, '🍫', 0, 1767225600000, 1767225600000, NULL);
