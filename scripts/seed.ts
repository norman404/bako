import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface SqliteConnection {
  exec(sql: string): void;
  prepare(sql: string): { get(): unknown };
  close(): void;
}

export interface SeedResult {
  categories: number;
  products: number;
  menus: number;
  productMenus: number;
}

const APP_IDENTIFIER = "com.norman404.bako";
const DB_FILENAME = "bako.db";
const SEED_SQL_RELATIVE = "src-tauri/seeds/seed-menu.sql";

export function resolveDbPath(
  platform: string,
  homeDir: string,
  appData?: string,
): string {
  switch (platform) {
    case "darwin":
      return join(homeDir, "Library", "Application Support", APP_IDENTIFIER, DB_FILENAME);
    case "win32": {
      if (!appData) {
        throw new Error(
          "No se pudo determinar APPDATA para Windows. ¿Está definida process.env.APPDATA?",
        );
      }
      return join(appData, APP_IDENTIFIER, DB_FILENAME);
    }
    case "linux":
      return join(homeDir, ".local", "share", APP_IDENTIFIER, DB_FILENAME);
    default:
      throw new Error(
        `Plataforma no soportada: "${platform}". Solo se soporta darwin, win32 y linux.`,
      );
  }
}

export function executeSeed(db: SqliteConnection, sqlContent: string): SeedResult {
  db.exec("BEGIN");
  try {
    db.exec(sqlContent);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw new Error(
      `Error al ejecutar el seed SQL: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }

  const categories = (db.prepare("SELECT COUNT(*) as c FROM categories").get() as { c: number }).c;
  const products = (db.prepare("SELECT COUNT(*) as c FROM products").get() as { c: number }).c;
  const menus = (db.prepare("SELECT COUNT(*) as c FROM menus").get() as { c: number }).c;
  const productMenus = (
    db.prepare("SELECT COUNT(*) as c FROM product_menus").get() as { c: number }
  ).c;

  return { categories, products, menus, productMenus };
}

async function createBunConnection(dbPath: string): Promise<SqliteConnection> {
  const { Database } = await import("bun:sqlite");
  const db = new Database(dbPath);
  return {
    exec: (sql: string) => db.exec(sql),
    prepare: (sql: string) => db.prepare(sql),
    close: () => db.close(),
  };
}

async function main() {
  const platform = process.platform;
  const homeDir = process.env.HOME ?? process.env.USERPROFILE ?? "";
  const appData = process.env.APPDATA;

  const dbPath = resolveDbPath(platform, homeDir, appData);

  if (!existsSync(dbPath)) {
    throw new Error(
      `No se encontró bako.db en ${dbPath}. ¿Corriste la app al menos una vez?`,
    );
  }

  const seedSqlPath = join(process.cwd(), SEED_SQL_RELATIVE);
  const sqlContent = readFileSync(seedSqlPath, "utf-8");

  const db = await createBunConnection(dbPath);
  try {
    const result = executeSeed(db, sqlContent);

    console.log(`\n✓ Seed cargado exitosamente en ${dbPath}`);
    console.log(`  - ${result.categories} categorías`);
    console.log(`  - ${result.products} productos`);
    console.log(`  - ${result.menus} menú`);
    console.log(`  - ${result.productMenus} relaciones producto↔menú\n`);
  } finally {
    db.close();
  }
}

if (import.meta.main) {
  main();
}