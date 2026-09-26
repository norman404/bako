/// <reference types="bun-types" />
import type { SQLQueryBindings } from "bun:sqlite";
import { beforeEach, describe, expect, it, vi } from "vitest";

interface SqliteStatement {
  all(...params: unknown[]): unknown[];
  values(...params: unknown[]): unknown[][];
  run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
}

interface SqliteDatabase {
  exec(sql: string): void;
  query(sql: string): SqliteStatement;
}

const sqliteRef = vi.hoisted(() => ({
  db: null as SqliteDatabase | null,
  failNextStatementMatching: null as RegExp | null,
  failNextCommit: false,
}));

const SCHEMA_SQL = `
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  ticket_number INTEGER NOT NULL,
  order_name TEXT,
  channel TEXT NOT NULL DEFAULT 'local',
  delivery_reference TEXT,
  confirmed_at INTEGER,
  financial_shift_id TEXT,
  shift_id TEXT,
  total INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  voided_at INTEGER
);
CREATE UNIQUE INDEX idx_orders_ticket_number ON orders (ticket_number);
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  method TEXT NOT NULL,
  amount INTEGER NOT NULL,
  cash_received INTEGER,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_payments_order_method ON payments (order_id, method);
CREATE TABLE order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  unit_cost INTEGER NOT NULL DEFAULT 0,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  order_promotion_id TEXT,
  parent_order_item_id TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE order_promotions (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  promotion_id TEXT,
  kind TEXT NOT NULL,
  name_snapshot TEXT NOT NULL,
  rule_snapshot TEXT NOT NULL,
  discount_amount INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE order_item_modifiers (
  id TEXT PRIMARY KEY,
  order_item_id TEXT NOT NULL,
  group_id TEXT,
  group_name TEXT NOT NULL,
  option_id TEXT,
  option_name TEXT NOT NULL,
  price_delta INTEGER NOT NULL DEFAULT 0,
  text_value TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE shifts (
  id TEXT PRIMARY KEY,
  opened_at INTEGER NOT NULL,
  closed_at INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  opening_cash INTEGER,
  counted_cash INTEGER,
  cash_difference INTEGER,
  delivery_pending_ids TEXT
);
CREATE TABLE feature_flags (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
`;

// The plugin only runs migrations: here it just creates the schema.
vi.mock("@tauri-apps/plugin-sql", () => ({
  default: {
    async load() {
      const { Database } = await import("bun:sqlite");
      const db = new Database(":memory:");
      db.exec(SCHEMA_SQL);
      sqliteRef.db = db;

      return { async close() {} };
    },
  },
}));

// Mirrors src-tauri/src/database.rs: one pinned connection that a transaction owns.
vi.mock("@tauri-apps/api/core", () => {
  let nextTransactionId = 0;
  const openTransactions = new Set<number>();

  function connection() {
    if (!sqliteRef.db) throw new Error("Database not initialized");
    return sqliteRef.db;
  }

  function assertTransaction(transactionId: number | undefined) {
    if (transactionId === undefined && openTransactions.size > 0) {
      // In Rust this query would wait for the transaction forever.
      throw new Error("Query outside the open transaction would deadlock");
    }
    if (transactionId !== undefined && !openTransactions.has(transactionId)) {
      throw new Error(`Unknown transaction ${transactionId}`);
    }
  }

  function injectFailure(sql: string) {
    if (sqliteRef.failNextStatementMatching?.test(sql)) {
      sqliteRef.failNextStatementMatching = null;
      throw new Error("database is locked");
    }
  }

  type Args = { sql: string; values: SQLQueryBindings[]; transactionId?: number };

  return {
    async invoke(command: string, args: Record<string, unknown> = {}) {
      const { sql, values = [], transactionId } = args as Args;

      switch (command) {
        case "db_execute": {
          assertTransaction(transactionId);
          injectFailure(sql);
          const result = connection().query(sql).run(...values);
          return { rowsAffected: result.changes, lastInsertId: Number(result.lastInsertRowid) };
        }
        case "db_select":
          assertTransaction(transactionId);
          injectFailure(sql);
          return connection().query(sql).values(...values);
        case "db_begin":
          connection().exec("BEGIN IMMEDIATE");
          openTransactions.add(nextTransactionId);
          return nextTransactionId++;
        case "db_commit":
          assertTransaction(transactionId);
          openTransactions.delete(transactionId as number);
          if (sqliteRef.failNextCommit) {
            sqliteRef.failNextCommit = false;
            connection().exec("ROLLBACK");
            throw new Error("database is locked");
          }
          connection().exec("COMMIT");
          return null;
        case "db_rollback":
          assertTransaction(transactionId);
          openTransactions.delete(transactionId as number);
          connection().exec("ROLLBACK");
          return null;
        case "db_close":
          return null;
        default:
          throw new Error(`Unexpected command ${command}`);
      }
    },
  };
});

import { initDatabase } from "@/db/client";

import { orderDrizzleRepository } from "./repository";

const ORDER_INPUT = {
  orderName: "Mesa 4",
  items: [
    { productId: "prod-cafe", quantity: 2, unitPrice: 3500, unitCost: 1000, modifiers: [] },
    { productId: "prod-pan", quantity: 1, unitPrice: 2500, unitCost: 800, modifiers: [] },
  ],
  payments: [{ method: "cash" as const, amount: 9500, cashReceived: 10000 }],
};

function queryOrders() {
  if (!sqliteRef.db) throw new Error("Database not initialized");
  return sqliteRef.db
    .query(
      "SELECT ticket_number, total, order_name, created_at FROM orders ORDER BY ticket_number",
    )
    .all() as Array<{
    ticket_number: number;
    total: number;
    order_name: string | null;
    created_at: number;
  }>;
}

function queryOrderItems(ticketNumber: number) {
  if (!sqliteRef.db) throw new Error("Database not initialized");
  return sqliteRef.db
    .query(
      `SELECT oi.product_id, oi.quantity, oi.unit_price
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.ticket_number = ?
       ORDER BY oi.product_id`,
    )
    .all(ticketNumber) as Array<{ product_id: string; quantity: number; unit_price: number }>;
}

describe("exploratory: duplicated checkout submissions", () => {
  beforeEach(async () => {
    await initDatabase();
    if (!sqliteRef.db) throw new Error("Database not initialized");
    sqliteRef.db.exec(
      "DELETE FROM order_item_modifiers; DELETE FROM order_items; DELETE FROM order_promotions; DELETE FROM payments; DELETE FROM orders;",
    );
  });

  it("creates two orders when the same checkout is submitted twice in flight", async () => {
    const [first, second] = await Promise.all([
      orderDrizzleRepository.createOrder(ORDER_INPUT),
      orderDrizzleRepository.createOrder(ORDER_INPUT),
    ]);

    expect(first.isOk()).toBe(true);
    expect(second.isOk()).toBe(true);
    if (!first.isOk() || !second.isOk()) return;

    const orders = queryOrders();
    expect(orders.map((order) => order.ticket_number)).toEqual([1, 2]);
    expect(orders.every((order) => order.total === 9500)).toBe(true);
    expect(orders.every((order) => order.order_name === "Mesa 4")).toBe(true);

    const firstItems = queryOrderItems(1);
    const secondItems = queryOrderItems(2);
    expect(firstItems).toEqual([
      { product_id: "prod-cafe", quantity: 2, unit_price: 3500 },
      { product_id: "prod-pan", quantity: 1, unit_price: 2500 },
    ]);
    expect(secondItems).toEqual(firstItems);

    const elapsedMs = Math.abs(orders[1].created_at - orders[0].created_at);
    expect(elapsedMs).toBeLessThan(1000);
  });

  it("creates a new order every time the same payload is confirmed", async () => {
    const first = await orderDrizzleRepository.createOrder(ORDER_INPUT);
    const second = await orderDrizzleRepository.createOrder(ORDER_INPUT);

    expect(first.isOk()).toBe(true);
    expect(second.isOk()).toBe(true);
    expect(queryOrders()).toHaveLength(2);
  });

  it.todo("deduplicates a retried submission that carries the same idempotency key");
});

describe("checkout retry after a failed save", () => {
  beforeEach(async () => {
    await initDatabase();
    sqliteRef.failNextStatementMatching = null;
    sqliteRef.failNextCommit = false;
  });

  it("leaves no partial order when a statement fails after the order insert", async () => {
    // CASE: the order row is inserted, then saving its items fails (e.g. database is locked).
    // VALIDATES: the order is rolled back, so the user's retry saves exactly one order.
    sqliteRef.failNextStatementMatching = /insert into "order_items"/i;

    const failed = await orderDrizzleRepository.createOrder(ORDER_INPUT);
    expect(failed.isErr()).toBe(true);
    expect(queryOrders()).toHaveLength(0);

    const retried = await orderDrizzleRepository.createOrder(ORDER_INPUT);
    expect(retried.isOk()).toBe(true);
    expect(queryOrders().map((order) => order.ticket_number)).toEqual([1]);
    expect(queryOrderItems(1)).toHaveLength(2);
  });

  it("does not keep the order when the commit fails", async () => {
    // CASE: every statement succeeds but COMMIT fails, the error the user saw before the fix.
    // VALIDATES: a reported error means nothing was saved, so retrying cannot duplicate.
    sqliteRef.failNextCommit = true;

    const failed = await orderDrizzleRepository.createOrder(ORDER_INPUT);
    expect(failed.isErr()).toBe(true);
    expect(queryOrders()).toHaveLength(0);

    const retried = await orderDrizzleRepository.createOrder(ORDER_INPUT);
    expect(retried.isOk()).toBe(true);
    expect(queryOrders()).toHaveLength(1);
  });
});

const PROMOTION_ORDER_INPUT = {
  orderName: "Mesa 7",
  promotions: [
    {
      ref: "p1",
      promotionId: "promo-2x1",
      kind: "nxm" as const,
      name: "2x1 Café",
      ruleSnapshot: { buyQuantity: 2, payQuantity: 1 },
      discountAmount: 3500,
    },
    {
      ref: "p2",
      promotionId: null,
      kind: "composite" as const,
      name: "Paquete tarde",
      ruleSnapshot: { price: 8000 },
      discountAmount: 1000,
    },
  ],
  items: [
    { productId: "prod-cafe", quantity: 2, unitPrice: 3500, unitCost: 1000, discountAmount: 3500, promotionRef: "p1", modifiers: [] },
    {
      productId: "prod-paquete",
      quantity: 1,
      unitPrice: 9000,
      unitCost: 2500,
      discountAmount: 1000,
      promotionRef: "p2",
      children: [
        { productId: "prod-cafe", quantity: 1 },
        { productId: "prod-pan", quantity: 2 },
      ],
      modifiers: [],
    },
  ],
  payments: [{ method: "cash" as const, amount: 11500, cashReceived: 11500 }],
};

describe("checkout promotion evidence", () => {
  beforeEach(async () => {
    await initDatabase();
    sqliteRef.failNextStatementMatching = null;
    sqliteRef.failNextCommit = false;
    if (!sqliteRef.db) throw new Error("Database not initialized");
    sqliteRef.db.exec(
      "DELETE FROM order_item_modifiers; DELETE FROM order_items; DELETE FROM order_promotions; DELETE FROM payments; DELETE FROM orders;",
    );
  });

  // CASE: A sale with a 2x1 and a composite product inside its schedule is charged.
  // VALIDATES: The total is net of discounts and every discount is linked to its frozen promotion snapshot.
  it("should persist promotion snapshots linked to discounted lines and composite children", async () => {
    // Arrange
    const input = PROMOTION_ORDER_INPUT;

    // Act
    const result = await orderDrizzleRepository.createOrder(input);

    // Assert
    expect(result.isOk()).toBe(true);
    if (!sqliteRef.db) throw new Error("Database not initialized");
    expect(queryOrders().map((order) => order.total)).toEqual([11500]);
    const promotions = sqliteRef.db
      .query("SELECT id, name_snapshot, rule_snapshot, discount_amount FROM order_promotions ORDER BY name_snapshot")
      .all() as Array<{ id: string; name_snapshot: string; rule_snapshot: string; discount_amount: number }>;
    expect(promotions.map(({ name_snapshot, discount_amount }) => [name_snapshot, discount_amount])).toEqual([
      ["2x1 Café", 3500],
      ["Paquete tarde", 1000],
    ]);
    expect(JSON.parse(promotions[0].rule_snapshot)).toEqual({ buyQuantity: 2, payQuantity: 1 });
    const lines = sqliteRef.db
      .query(
        `SELECT oi.product_id, oi.unit_price, oi.discount_amount, op.name_snapshot AS promotion, parent.product_id AS parent
         FROM order_items oi
         LEFT JOIN order_promotions op ON op.id = oi.order_promotion_id
         LEFT JOIN order_items parent ON parent.id = oi.parent_order_item_id
         ORDER BY oi.product_id, parent`,
      )
      .all();
    expect(lines).toEqual([
      { product_id: "prod-cafe", unit_price: 3500, discount_amount: 3500, promotion: "2x1 Café", parent: null },
      { product_id: "prod-cafe", unit_price: 0, discount_amount: 0, promotion: null, parent: "prod-paquete" },
      { product_id: "prod-pan", unit_price: 0, discount_amount: 0, promotion: null, parent: "prod-paquete" },
      { product_id: "prod-paquete", unit_price: 9000, discount_amount: 1000, promotion: "Paquete tarde", parent: null },
    ]);
  });

  // CASE: Saving the promotion evidence fails in the middle of checkout.
  // VALIDATES: The sale is rolled back instead of keeping a discount without its evidence.
  it("should leave no order when the promotion evidence cannot be saved", async () => {
    // Arrange
    sqliteRef.failNextStatementMatching = /insert into "order_promotions"/i;

    // Act
    const result = await orderDrizzleRepository.createOrder(PROMOTION_ORDER_INPUT);

    // Assert
    expect(result.isErr()).toBe(true);
    expect(queryOrders()).toHaveLength(0);
  });

  // CASE: A payload claims a discount larger than the promotion evidence it references.
  // VALIDATES: Checkout rejects discounts that do not reconcile with their promotion.
  it("should reject a discount that does not match its promotion", async () => {
    // Arrange
    const input = {
      ...PROMOTION_ORDER_INPUT,
      promotions: [{ ...PROMOTION_ORDER_INPUT.promotions[0], discountAmount: 1000 }, PROMOTION_ORDER_INPUT.promotions[1]],
    };

    // Act
    const result = await orderDrizzleRepository.createOrder(input);

    // Assert
    expect(result.isErr() && result.error.code).toBe("orderPromotionInvalid");
    expect(queryOrders()).toHaveLength(0);
  });
});
