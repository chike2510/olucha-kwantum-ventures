import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./supabase/migrations",
  dialect: "postgresql",
});
