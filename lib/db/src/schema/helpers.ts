/**
 * Cross-database column builders and table constructor.
 *
 * Dialect is selected at module load time from DATABASE_PROVIDER:
 *   - "postgresql" → PostgreSQL (pg-core)
 *   - "sqlite" (default) → SQLite / libSQL (sqlite-core)
 *
 * All exports are typed against the SQLite variants so that TypeScript resolves
 * consistently in a local dev environment.  At runtime the appropriate builder
 * is called, ensuring drizzle-kit generates correct DDL for each dialect.
 */

import {
  sqliteTable,
  text as _sqText,
  integer as _sqInteger,
  real as _sqReal,
  primaryKey as _sqPrimaryKey,
  index as _sqIndex,
} from "drizzle-orm/sqlite-core";

import {
  pgTable,
  text as _pgText,
  integer as _pgInteger,
  real as _pgReal,
  serial as _pgSerial,
  timestamp as _pgTimestamp,
  boolean as _pgBoolean,
  jsonb as _pgJsonb,
  primaryKey as _pgPrimaryKey,
  index as _pgIndex,
} from "drizzle-orm/pg-core";

const isPg = (process.env.DATABASE_PROVIDER ?? "sqlite") === "postgresql";

// ── Type templates ─────────────────────────────────────────────────────────────
// Created with "wide" (string) name types so helper functions can pass any name.
// These instances are ONLY used to derive TypeScript return types; they are
// never inserted into any table definition.
const _idT = _sqInteger("" as string).primaryKey({ autoIncrement: true });
const _tsT = _sqInteger("" as string, { mode: "timestamp" as const });
const _boolT = _sqInteger("" as string, { mode: "boolean" as const });
// JSON text template — mode: "json" changes the return type to SQLiteTextJsonBuilderInitial
const _jsonT = _sqText("" as string, { mode: "json" } as const);

// ── Table constructor ──────────────────────────────────────────────────────────
/**
 * Creates a table. Uses `pgTable` when DATABASE_PROVIDER=postgresql,
 * `sqliteTable` otherwise.
 */
export const table = (isPg ? pgTable : sqliteTable) as unknown as typeof sqliteTable;

// ── Basic column builders ──────────────────────────────────────────────────────
/** text column — identical API in both dialects */
export const text = (isPg ? _pgText : _sqText) as unknown as typeof _sqText;

/** integer column — use for plain integer FK / score / count columns */
export const integer = (isPg ? _pgInteger : _sqInteger) as unknown as typeof _sqInteger;

/** real (float) column */
export const real = (isPg ? _pgReal : _sqReal) as unknown as typeof _sqReal;

/** Composite primary key builder for junction tables */
export const primaryKey = (isPg ? _pgPrimaryKey : _sqPrimaryKey) as unknown as typeof _sqPrimaryKey;

/** Table index builder — cross-database (PG or SQLite at runtime) */
export const index = (isPg ? _pgIndex : _sqIndex) as unknown as typeof _sqIndex;

// ── Semantic column helpers ────────────────────────────────────────────────────

/**
 * Auto-increment integer primary key.
 * PG     → serial().primaryKey()
 * SQLite → integer().primaryKey({ autoIncrement: true })
 */
export function id(name = "id"): typeof _idT {
  if (isPg) return _pgSerial(name).primaryKey() as unknown as typeof _idT;
  return _sqInteger(name).primaryKey({ autoIncrement: true }) as unknown as typeof _idT;
}

/**
 * Timestamp column.
 * PG     → timestamp with time zone (JS Date)
 * SQLite → integer in "timestamp" mode (Unix ms, JS Date)
 *
 * Supports .notNull() / .defaultNow() / .default(value).
 */
export function timestamp(name: string): typeof _tsT {
  if (isPg) return _pgTimestamp(name, { withTimezone: true }) as unknown as typeof _tsT;
  return _sqInteger(name, { mode: "timestamp" }) as unknown as typeof _tsT;
}

/**
 * Boolean column.
 * PG     → native boolean
 * SQLite → integer in "boolean" mode (0/1, deserialized to JS boolean)
 */
export function boolean(name: string): typeof _boolT {
  if (isPg) return _pgBoolean(name) as unknown as typeof _boolT;
  return _sqInteger(name, { mode: "boolean" }) as unknown as typeof _boolT;
}

/**
 * JSON / array text column.
 * PG     → jsonb (binary JSON, auto-serializes)
 * SQLite → text in "json" mode (auto-serializes)
 *
 * Call .$type<T>() on the result to narrow the TypeScript data type.
 * Example: jsonText("tags").$type<string[]>().notNull().default([])
 */
export function jsonText(name: string): typeof _jsonT {
  if (isPg) return _pgJsonb(name) as unknown as typeof _jsonT;
  return _sqText(name, { mode: "json" }) as unknown as typeof _jsonT;
}
