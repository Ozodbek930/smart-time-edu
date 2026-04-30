import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

// Forcing the correct Supabase URL
process.env.DATABASE_URL = "postgresql://postgres.xcpcekzpyvsmdtqrorjz:Smart791382465@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres";
console.error("DEBUG: DATABASE_URL is forced to:", process.env.DATABASE_URL);

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
export const db = drizzle(pool, { schema });
