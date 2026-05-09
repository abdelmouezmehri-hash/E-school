import { sql } from "drizzle-orm";
import type { SQL, SQLWrapper } from "drizzle-orm";

/**
 * The active database provider, read once at module load.
 */
export const dbProvider = (process.env.DATABASE_PROVIDER ?? "sqlite") as
  | "sqlite"
  | "postgresql";

if (dbProvider !== "sqlite" && dbProvider !== "postgresql") {
  throw new Error(
    `Invalid DATABASE_PROVIDER "${process.env.DATABASE_PROVIDER}". Accepted values: "sqlite" | "postgresql".`,
  );
}

/**
 * Internal helper — accepts provider explicitly so it can be unit-tested
 * without environment manipulation.
 */
export function _monthOfForProvider(
  column: SQLWrapper,
  provider: "sqlite" | "postgresql",
): SQL<string> {
  if (provider === "postgresql") {
    return sql<string>`to_char(${column}, 'YYYY-MM')`;
  }
  return sql<string>`strftime('%Y-%m', ${column} / 1000, 'unixepoch')`;
}

/**
 * Returns a SQL expression that formats a timestamp column as 'YYYY-MM'.
 *
 * - SQLite:     strftime('%Y-%m', column)
 * - PostgreSQL: to_char(column, 'YYYY-MM')
 *
 * Use in .select(), .groupBy(), and .orderBy().
 */
export function monthOf(column: SQLWrapper): SQL<string> {
  return _monthOfForProvider(column, dbProvider);
}
