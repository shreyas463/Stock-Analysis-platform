import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { env } from "@/lib/env";
import * as schema from "./schema";

export type DB = BetterSQLite3Database<typeof schema>;

function createDb(): DB {
  const dbPath = env.NODE_ENV === "test" ? ":memory:" : env.DATABASE_PATH;
  if (dbPath !== ":memory:") {
    fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
  }
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  const database = drizzle(sqlite, { schema });
  migrate(database, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return database;
}

// Survive Next.js dev-server HMR without leaking connections.
const globalForDb = globalThis as unknown as { __basisDb?: DB };

export const db: DB = globalForDb.__basisDb ?? createDb();
if (env.NODE_ENV !== "production") globalForDb.__basisDb = db;

export * as tables from "./schema";
