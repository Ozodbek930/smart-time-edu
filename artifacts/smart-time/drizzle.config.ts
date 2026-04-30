import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: "postgresql://postgres.xcpcekzpyvsmdtqrorjz:Smart791382465@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres",
  },
});
