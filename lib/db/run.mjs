import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
// run.mjs is in lib/db/ — db is at ../../artifacts/api-server/dev.db
const dbPath = join(__dirname, "..", "..", "artifacts", "api-server", "dev.db");
// SQL is at ../../migrations/0001_unify_financials.sql
const sqlPath = join(__dirname, "..", "..", "migrations", "0001_unify_financials.sql");

console.log(`DB: ${dbPath}`);
console.log(`SQL: ${sqlPath}`);

const client = createClient({ url: `file:${dbPath}` });
const sql = readFileSync(sqlPath, "utf-8");

const statements = sql
  .split(/;\s*$/m)
  .map((s) =>
    s
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n")
      .trim(),
  )
  .filter((s) => s.length > 0);

console.log(`\nRunning ${statements.length} SQL statements...\n`);

let ok = 0;
let fail = 0;
for (const stmt of statements) {
  const preview = stmt.split("\n")[0].substring(0, 70);
  try {
    await client.execute(stmt);
    console.log(`  ✓ ${preview}`);
    ok++;
  } catch (e) {
    console.error(`  ✗ ${preview}`);
    console.error(`    ${e.message}`);
    fail++;
  }
}

console.log(`\nDone. ${ok} succeeded, ${fail} failed.`);
process.exit(fail > 0 ? 1 : 0);