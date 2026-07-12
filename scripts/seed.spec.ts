import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { executeSeed, resolveDbPath, type SqliteConnection } from "./seed";

const SCHEMA_SQL = `
CREATE TABLE categories (
  id text PRIMARY KEY NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  color text,
  menu_id text,
  created_at integer NOT NULL,
  updated_at integer NOT NULL,
  deleted_at integer
);

CREATE TABLE products (
  id text PRIMARY KEY NOT NULL,
  category_id text NOT NULL,
  menu_id text,
  name text NOT NULL,
  description text NOT NULL,
  price integer NOT NULL,
  prep_time_minutes integer NOT NULL,
  image text NOT NULL,
  is_popular integer DEFAULT 0 NOT NULL,
  created_at integer NOT NULL,
  updated_at integer NOT NULL,
  deleted_at integer
);

CREATE TABLE menus (
  id text PRIMARY KEY NOT NULL,
  name text NOT NULL,
  is_default integer NOT NULL DEFAULT 0,
  created_at integer NOT NULL,
  updated_at integer NOT NULL
);

CREATE TABLE product_menus (
  product_id text NOT NULL,
  menu_id text NOT NULL,
  PRIMARY KEY (product_id, menu_id)
);
`;

const SEED_SQL_PATH = fileURLToPath(new URL("../src-tauri/seeds/seed-menu.sql", import.meta.url));
const SEED_SQL = readFileSync(SEED_SQL_PATH, "utf-8");

function createInMemoryDb(): SqliteConnection {
  const db = new DatabaseSync(":memory:") as unknown as SqliteConnection;
  db.exec(SCHEMA_SQL);
  return db;
}

describe("resolveDbPath", () => {
  it("resolves to macOS Application Support path on darwin", () => {
    const result = resolveDbPath("darwin", "/Users/testuser", undefined);
    expect(result).toBe(
      "/Users/testuser/Library/Application Support/com.norman404.bako/bako.db",
    );
  });

  it("resolves to Windows APPDATA path on win32", () => {
    const result = resolveDbPath("win32", "C:\\Users\\testuser", "C:\\Users\\testuser\\AppData\\Roaming");
    expect(result).toBe(
      "C:\\Users\\testuser\\AppData\\Roaming/com.norman404.bako/bako.db",
    );
  });

  it("resolves to Linux XDG data path on linux", () => {
    const result = resolveDbPath("linux", "/home/testuser", undefined);
    expect(result).toBe(
      "/home/testuser/.local/share/com.norman404.bako/bako.db",
    );
  });

  it("throws on unknown platform", () => {
    expect(() => resolveDbPath("solaris", "/home/testuser", undefined)).toThrow();
  });

  it("throws on win32 when APPDATA is not provided", () => {
    expect(() => resolveDbPath("win32", "C:\\Users\\testuser", undefined)).toThrow();
  });
});

describe("executeSeed", () => {
  let db: SqliteConnection;

  beforeEach(() => {
    db = createInMemoryDb();
  });

  afterEach(() => {
    db.close();
  });

  it("loads the seed and returns correct counts", () => {
    const result = executeSeed(db, SEED_SQL);

    expect(result).toEqual({
      categories: 5,
      products: 10,
      menus: 1,
      productMenus: 10,
    });
  });

  it("is idempotent — running twice produces the same counts without errors", () => {
    const first = executeSeed(db, SEED_SQL);
    const second = executeSeed(db, SEED_SQL);

    expect(second).toEqual(first);
    expect(second.categories).toBe(5);
    expect(second.products).toBe(10);
    expect(second.menus).toBe(1);
    expect(second.productMenus).toBe(10);
  });
});