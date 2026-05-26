import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/shared/db/schema.ts",
  out: "./src-tauri/migrations",
  dialect: "sqlite",
});
