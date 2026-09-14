/// <reference types="bun-types" />
import type { SQLQueryBindings } from "bun:sqlite";
import { beforeEach, describe, expect, it, vi } from "vitest";

interface SqliteStatement {
  all(...params: unknown[]): unknown[];
  run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
}

interface SqliteDatabase {
  exec(sql: string): void;
  query(sql: string): SqliteStatement;
}

const sqliteRef = vi.hoisted(() => ({ db: null as SqliteDatabase | null }));

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

vi.mock("@tauri-apps/plugin-sql", () => ({
  default: {
    async load() {
      const { Database } = await import("bun:sqlite");
      const db = new Database(":memory:");
      db.exec(SCHEMA_SQL);
      sqliteRef.db = db;

      return {
        async execute(sql: string, params: SQLQueryBindings[] = []) {
          const result = db.query(sql).run(...params);
          return {
            rowsAffected: result.changes,
            lastInsertId: Number(result.lastInsertRowid),
          };
        },
        async select<T>(sql: string, params: SQLQueryBindings[] = []) {
          return db.query(sql).all(...params) as T;
        },
        async close() {},
      };
    },
  },
}));

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
      "DELETE FROM order_item_modifiers; DELETE FROM order_items; DELETE FROM payments; DELETE FROM orders;",
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
