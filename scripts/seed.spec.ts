import { describe, expect, it } from "vitest";

import { executeSeed, resolveDbPath, type SeedResult, type SqliteConnection } from "./seed";

function createFakeDb(config: {
  counts?: Partial<Record<keyof SeedResult, number>>;
  failOn?: number;
} = {}): SqliteConnection & { calls: string[]; prepareCalls: string[] } {
  const calls: string[] = [];
  const prepareCalls: string[] = [];
  const counts = {
    categories: 5,
    products: 10,
    menus: 1,
    productMenus: 10,
    ...config.counts,
  };

  return {
    calls,
    prepareCalls,
    exec: (sql: string) => {
      calls.push(sql);
      if (config.failOn === calls.length) {
        throw new Error("forced exec failure");
      }
    },
    prepare: (sql: string) => {
      prepareCalls.push(sql);
      let c = 0;
      if (sql.includes("categories")) c = counts.categories;
      else if (sql.includes("products")) c = counts.products;
      else if (sql.includes("product_menus")) c = counts.productMenus;
      else if (sql.includes("menus")) c = counts.menus;
      return { get: () => ({ c }) };
    },
    close: () => {},
  };
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
  it("executes the seed inside a transaction and returns default counts", () => {
    const db = createFakeDb();
    const result = executeSeed(db, "SEED SQL");

    expect(db.calls).toEqual(["BEGIN", "SEED SQL", "COMMIT"]);
    expect(result).toEqual({
      categories: 5,
      products: 10,
      menus: 1,
      productMenus: 10,
    });
  });

  it("queries each table with the expected prepared statements", () => {
    const db = createFakeDb();
    executeSeed(db, "SEED SQL");

    expect(db.prepareCalls).toEqual([
      "SELECT COUNT(*) as c FROM categories",
      "SELECT COUNT(*) as c FROM products",
      "SELECT COUNT(*) as c FROM menus",
      "SELECT COUNT(*) as c FROM product_menus",
    ]);
  });

  it("returns custom counts provided by the fake database", () => {
    const db = createFakeDb({ counts: { categories: 3, products: 7 } });
    const result = executeSeed(db, "SEED SQL");

    expect(result).toEqual({
      categories: 3,
      products: 7,
      menus: 1,
      productMenus: 10,
    });
  });

  it("rolls back and throws when exec fails", () => {
    const db = createFakeDb({ failOn: 2 });

    expect(() => executeSeed(db, "BAD SQL")).toThrow(
      "Error al ejecutar el seed SQL: forced exec failure",
    );
    expect(db.calls).toEqual(["BEGIN", "BAD SQL", "ROLLBACK"]);
  });
});
