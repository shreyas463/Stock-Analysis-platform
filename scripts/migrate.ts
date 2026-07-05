/**
 * Applies pending Drizzle migrations. The db module runs migrations on
 * startup, so simply importing it is sufficient.
 */
import { db } from "../lib/db";

void db;
console.log("✓ Database migrated");
