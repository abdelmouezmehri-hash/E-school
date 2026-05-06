import type { LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

// ── Validate environment ─────────────────────────────────────────────────────

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const provider = process.env.DATABASE_PROVIDER ?? "sqlite";
if (provider !== "sqlite" && provider !== "postgresql") {
  throw new Error(
    `Invalid DATABASE_PROVIDER "${provider}". Accepted values: "sqlite" | "postgresql".`,
  );
}

// ── Dynamic driver loading ───────────────────────────────────────────────────
// Only the driver that matches DATABASE_PROVIDER is imported at runtime.
// The other driver's package is never loaded, parsed, or required.
//
// Both LibSQL and node-postgres Drizzle instances expose the same query builder
// surface (.select, .insert, .update, .delete, .query). We export db as
// LibSQLDatabase<typeof schema> — the type the rest of the codebase is built
// against — with a single cast at the assignment site for the PostgreSQL path.
// eslint-disable-next-line prefer-const
let db!: LibSQLDatabase<typeof schema>;

if (provider === "postgresql") {
  const [{ drizzle }, { Pool }] = await Promise.all([
    import("drizzle-orm/node-postgres"),
    import("pg"),
  ]);
  // Both drivers share the same Drizzle query builder API.
  // The cast is intentional: we represent both as LibSQLDatabase
  // to give the rest of the codebase a single stable type.
  db = drizzle(new Pool({ connectionString: url }), {
    schema,
  }) as unknown as LibSQLDatabase<typeof schema>;
} else {
  const [{ drizzle }, { createClient }] = await Promise.all([
    import("drizzle-orm/libsql"),
    import("@libsql/client"),
  ]);
  db = drizzle(createClient({ url }), { schema });
}

export { db };
export * from "./schema";
export * from "./helpers";
export * from "./helpers/branchScope";

export * from "./progress";
