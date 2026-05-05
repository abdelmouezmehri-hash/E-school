import { describe, it, expect } from "vitest";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { _monthOfForProvider, monthOf } from "./helpers";

// In-memory SQLite for end-to-end SQL execution tests
const client = createClient({ url: ":memory:" });
const testDb = drizzle(client);

/**
 * Recursively flattens drizzle's nested queryChunks into a single SQL string.
 * Used to inspect the generated SQL without needing a real dialect/connection.
 */
function flattenSql(expr: SQL<unknown>): string {
  type Chunk =
    | { value: string[] }
    | { queryChunks: Chunk[] };

  function flatten(chunks: Chunk[]): string {
    return chunks
      .map((chunk) => {
        if ("value" in chunk && Array.isArray(chunk.value)) {
          return chunk.value.join("");
        }
        if ("queryChunks" in chunk && Array.isArray(chunk.queryChunks)) {
          return flatten(chunk.queryChunks);
        }
        return "";
      })
      .join("");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return flatten((expr as any).queryChunks);
}

describe("monthOf (SQLite — live execution)", () => {
  it("extracts YYYY-MM from a full ISO timestamp string", async () => {
    const rows = await testDb.all<{ month: string }>(
      sql`SELECT ${monthOf(sql`'2024-03-15T00:00:00.000Z'`)} AS month`
    );
    expect(rows[0].month).toBe("2024-03");
  });

  it("extracts YYYY-MM from a date-only string", async () => {
    const rows = await testDb.all<{ month: string }>(
      sql`SELECT ${monthOf(sql`'2025-11-01'`)} AS month`
    );
    expect(rows[0].month).toBe("2025-11");
  });
});

describe("_monthOfForProvider (branch logic — no live DB needed)", () => {
  it("uses strftime for sqlite provider", () => {
    const expr = _monthOfForProvider(sql`col`, "sqlite");
    const sqlStr = flattenSql(expr);
    expect(sqlStr).toContain("strftime");
    expect(sqlStr).not.toContain("to_char");
  });

  it("uses to_char for postgresql provider", () => {
    const expr = _monthOfForProvider(sql`col`, "postgresql");
    const sqlStr = flattenSql(expr);
    expect(sqlStr).toContain("to_char");
    expect(sqlStr).not.toContain("strftime");
  });
});
