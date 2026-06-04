import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const menus = sqliteTable("menus", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    color: text("color"),
    menuId: text("menu_id").references(() => menus.id),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [index("idx_categories_deleted_at").on(table.deletedAt)],
);

export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey(),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id),
    menuId: text("menu_id").references(() => menus.id),
    name: text("name").notNull(),
    description: text("description").notNull(),
    price: integer("price").notNull(),
    prepTimeMinutes: integer("prep_time_minutes").notNull(),
    image: text("image").notNull(),
    isPopular: integer("is_popular", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("idx_products_category_id").on(table.categoryId),
    index("idx_products_deleted_at").on(table.deletedAt),
  ],
);

export const productMenus = sqliteTable(
  "product_menus",
  {
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    menuId: text("menu_id")
      .notNull()
      .references(() => menus.id, { onDelete: "cascade" }),
  },
  (table) => [index("idx_product_menus_menu_id").on(table.menuId)],
);

export const deliveryPersons = sqliteTable(
  "delivery_persons",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    color: text("color").notNull(),
    phone: text("phone"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [index("idx_delivery_persons_deleted_at").on(table.deletedAt)],
);

export const customers = sqliteTable(
  "customers",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    address: text("address").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("idx_customers_phone").on(table.phone)],
);

export const orders = sqliteTable(
  "orders",
  {
    id: text("id").primaryKey(),
    ticketNumber: integer("ticket_number").notNull(),
    customerId: text("customer_id").references(() => customers.id),
    deliveryPersonId: text("delivery_person_id").references(() => deliveryPersons.id),
    total: integer("total").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    uniqueIndex("idx_orders_ticket_number").on(table.ticketNumber),
    index("idx_orders_customer_id").on(table.customerId),
    index("idx_orders_delivery_person_id").on(table.deliveryPersonId),
    index("idx_orders_created_at").on(table.createdAt),
  ],
);

export const payments = sqliteTable(
  "payments",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    method: text("method").notNull(),
    amount: integer("amount").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    uniqueIndex("idx_payments_order_id").on(table.orderId),
    index("idx_payments_method").on(table.method),
    index("idx_payments_created_at").on(table.createdAt),
  ],
);

export const orderItems = sqliteTable(
  "order_items",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    quantity: integer("quantity").notNull(),
    unitPrice: integer("unit_price").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("idx_order_items_order_id").on(table.orderId),
    index("idx_order_items_product_id").on(table.productId),
  ],
);

export const systemSettings = sqliteTable("system_settings", {
  id: text("id").primaryKey().$defaultFn(() => "current"),
  locale: text("locale").notNull(),
  currency: text("currency").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const featureFlags = sqliteTable("feature_flags", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export type MenuRow = typeof menus.$inferSelect;
export type CategoryRow = typeof categories.$inferSelect;
export type DeliveryPersonRow = typeof deliveryPersons.$inferSelect;
export type ProductRow = typeof products.$inferSelect;
export type ProductMenuRow = typeof productMenus.$inferSelect;
export type CustomerRow = typeof customers.$inferSelect;
export type OrderRow = typeof orders.$inferSelect;
export type PaymentRow = typeof payments.$inferSelect;
export type OrderItemRow = typeof orderItems.$inferSelect;
export type SystemSettingsRow = typeof systemSettings.$inferSelect;
export type FeatureFlagRow = typeof featureFlags.$inferSelect;

export type MenuInsert = typeof menus.$inferInsert;
export type CategoryInsert = typeof categories.$inferInsert;
export type DeliveryPersonInsert = typeof deliveryPersons.$inferInsert;
export type ProductInsert = typeof products.$inferInsert;
export type ProductMenuInsert = typeof productMenus.$inferInsert;
export type CustomerInsert = typeof customers.$inferInsert;
export type OrderInsert = typeof orders.$inferInsert;
export type PaymentInsert = typeof payments.$inferInsert;
export type OrderItemInsert = typeof orderItems.$inferInsert;
export type SystemSettingsInsert = typeof systemSettings.$inferInsert;
export type FeatureFlagInsert = typeof featureFlags.$inferInsert;


