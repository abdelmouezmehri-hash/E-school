# DB Layer Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate JavaScript-based SQL post-processing and raw `db.execute()` calls, returning all aggregation/filtering to the database layer while keeping SQLite (dev) + PostgreSQL (prod) compatibility.

**Architecture:** A new `lib/db/src/helpers.ts` module exports cross-DB SQL expressions (e.g. `monthOf` for date grouping). All routes are migrated from raw `db.execute(sql\`...\`)` to the Drizzle query builder. JS-side grouping, filtering, and aggregation loops are replaced with SQL `GROUP BY`, `SUM`, `AVG`, conditional aggregation, and `HAVING` — using only ANSI SQL constructs that run identically on both SQLite and PostgreSQL.

**Tech Stack:** Drizzle ORM v0.31+, `drizzle-orm` helpers (`count`, `sum`, `avg`, `eq`, `ne`, `inArray`, `isNotNull`, `or`, `and`), `@libsql/client` in-memory for unit tests, vitest for tests, TypeScript strict checking as primary type gate.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `lib/db/src/helpers.ts` | **Create** | Cross-DB SQL expression helpers (`monthOf`, `dbProvider`) |
| `lib/db/src/helpers.test.ts` | **Create** | Unit tests for helpers against in-memory SQLite |
| `lib/db/package.json` | **Modify** | Add `./helpers` export; add vitest devDep |
| `lib/db/src/index.ts` | **Modify** | Fix fake LibSQL type cast; re-export helpers |
| `artifacts/api-server/src/routes/requests.ts` | **Modify** | Replace all `db.execute(sql\`...\`)` with Drizzle ORM; SQL filter for parent requests |
| `artifacts/api-server/src/routes/levels.ts` | **Modify** | Fix N+1: bulk teacher fetch with `inArray` |
| `artifacts/api-server/src/routes/payments.ts` | **Modify** | Fix N+1 in `enrichPayment`; SQL grouping in `/debt-summary` |
| `artifacts/api-server/src/routes/dashboard.ts` | **Modify** | Move `revenueByMonth`, `revenueByLevel`, `statusBreakdown`, `topPerformers`, score averages to SQL |
| `artifacts/api-server/src/routes/messages.ts` | **Modify** | Replace `sql\`x != y\`` with `ne()` |

---

## Phase 1 — Foundation: DB Helpers Module

### Task 1: Create `lib/db/src/helpers.ts` with tests

**Files:**
- Create: `lib/db/src/helpers.ts`
- Create: `lib/db/src/helpers.test.ts`
- Modify: `lib/db/package.json`

- [ ] **Step 1: Add vitest to lib/db**

Run from the repo root:
```bash
cd "e:/Kidspeak Hub/Kidspeak-Edu-Finance"
pnpm --filter @workspace/db add -D vitest
```

Expected: vitest appears in `lib/db/package.json` devDependencies.

- [ ] **Step 2: Add test script and helpers export to `lib/db/package.json`**

Open `lib/db/package.json`. Replace its contents with:
```json
{
  "name": "@workspace/db",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./schema": "./src/schema/index.ts",
    "./helpers": "./src/helpers.ts"
  },
  "scripts": {
    "test": "vitest run",
    "push:dev": "cross-env DATABASE_URL=file:../../artifacts/api-server/dev.db DATABASE_PROVIDER=sqlite drizzle-kit push --config ./drizzle.config.ts",
    "push:prod": "drizzle-kit push --config ./drizzle.config.ts",
    "push-force:dev": "cross-env DATABASE_URL=file:../../artifacts/api-server/dev.db DATABASE_PROVIDER=sqlite drizzle-kit push --force --config ./drizzle.config.ts"
  },
  "dependencies": {
    "@libsql/client": "^0.15.7",
    "drizzle-orm": "catalog:",
    "drizzle-zod": "^0.8.3",
    "zod": "catalog:"
  },
  "optionalDependencies": {
    "pg": "^8.13.3"
  },
  "devDependencies": {
    "@types/node": "catalog:",
    "@types/pg": "^8.11.11",
    "cross-env": "^7.0.3",
    "drizzle-kit": "^0.31.9",
    "vitest": "latest"
  }
}
```

- [ ] **Step 3: Write the failing test first**

Create `lib/db/src/helpers.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { sql } from "drizzle-orm";
import { monthOf } from "./helpers";

// In-memory SQLite for testing
const client = createClient({ url: ":memory:" });
const testDb = drizzle(client);

describe("monthOf (SQLite)", () => {
  it("extracts YYYY-MM from a full ISO timestamp string", async () => {
    const [row] = await testDb.execute(
      sql`SELECT ${monthOf(sql`'2024-03-15T00:00:00.000Z'`)} AS month`
    );
    expect((row as Record<string, unknown>).month).toBe("2024-03");
  });

  it("extracts YYYY-MM from a date-only string", async () => {
    const [row] = await testDb.execute(
      sql`SELECT ${monthOf(sql`'2025-11-01'`)} AS month`
    );
    expect((row as Record<string, unknown>).month).toBe("2025-11");
  });
});
```

- [ ] **Step 4: Run the test — verify it FAILS (helpers.ts doesn't exist yet)**

```bash
cd "e:/Kidspeak Hub/Kidspeak-Edu-Finance"
pnpm --filter @workspace/db test
```

Expected: `Error: Cannot find module './helpers'`

- [ ] **Step 5: Create `lib/db/src/helpers.ts`**

```typescript
import { sql } from "drizzle-orm";
import type { SQL, SQLWrapper } from "drizzle-orm";

/**
 * The active database provider, read once at module load.
 * Routes and tests should import this instead of reading process.env directly.
 */
export const dbProvider = (process.env.DATABASE_PROVIDER ?? "sqlite") as
  | "sqlite"
  | "postgresql";

/**
 * Returns a SQL expression that formats a timestamp column as 'YYYY-MM'.
 *
 * - SQLite:     strftime('%Y-%m', column)
 * - PostgreSQL: to_char(column, 'YYYY-MM')
 *
 * Use in .select(), .groupBy(), and .orderBy().
 */
export function monthOf(column: SQLWrapper): SQL<string> {
  if (dbProvider === "postgresql") {
    return sql<string>`to_char(${column}, 'YYYY-MM')`;
  }
  return sql<string>`strftime('%Y-%m', ${column})`;
}
```

- [ ] **Step 6: Run the test — verify it PASSES**

```bash
pnpm --filter @workspace/db test
```

Expected output:
```
✓ lib/db/src/helpers.test.ts (2 tests)
  ✓ monthOf (SQLite) > extracts YYYY-MM from a full ISO timestamp string
  ✓ monthOf (SQLite) > extracts YYYY-MM from a date-only string
```

- [ ] **Step 7: Commit**

```bash
cd "e:/Kidspeak Hub/Kidspeak-Edu-Finance"
git add lib/db/src/helpers.ts lib/db/src/helpers.test.ts lib/db/package.json
git commit -m "feat(db): add cross-db monthOf helper with SQLite/PostgreSQL support"
```

---

### Task 2: Fix type cast in `lib/db/src/index.ts`

**Files:**
- Modify: `lib/db/src/index.ts`

The current code casts the PostgreSQL Drizzle instance to `LibSQLDatabase<typeof schema>`, which is a lie that will confuse TypeScript and produce wrong error messages.

- [ ] **Step 1: Replace `lib/db/src/index.ts`**

```typescript
import * as schema from "./schema";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const provider = process.env.DATABASE_PROVIDER ?? "sqlite";
if (provider !== "sqlite" && provider !== "postgresql") {
  throw new Error(
    `Invalid DATABASE_PROVIDER "${provider}". Accepted values: "sqlite" | "postgresql".`,
  );
}

// eslint-disable-next-line prefer-const
let db!: LibSQLDatabase<typeof schema> | NodePgDatabase<typeof schema>;

if (provider === "postgresql") {
  const [{ drizzle }, { Pool }] = await Promise.all([
    import("drizzle-orm/node-postgres"),
    import("pg"),
  ]);
  db = drizzle(new Pool({ connectionString: url }), { schema });
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
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd "e:/Kidspeak Hub/Kidspeak-Edu-Finance"
pnpm typecheck
```

If type errors appear on route files due to the union type, they'll be surfaced here and fixed in subsequent tasks. For now, check that the db package itself compiles.

- [ ] **Step 3: Commit**

```bash
git add lib/db/src/index.ts
git commit -m "fix(db): use proper union type for db instance instead of fake LibSQL cast"
```

---

## Phase 2 — Critical: Eliminate Raw SQL Execute Calls

### Task 3: Refactor `requests.ts` — Replace all `db.execute()` with Drizzle ORM

**Files:**
- Modify: `artifacts/api-server/src/routes/requests.ts`

This file has 5 raw `db.execute(sql\`...\`)` calls. They are brittle because the `.rows` property differs between drivers. Replacing them with the Drizzle query builder eliminates the `(r: any) => r.rows ?? r` workaround.

The `getParentRelevantRequestIds` function also fetches **all** activity requests and filters in JavaScript — this becomes a proper SQL WHERE clause.

- [ ] **Step 1: Capture the current API response for manual verification before changing anything**

Start the dev server, then run:
```bash
# Replace TOKEN with a valid session cookie from your browser devtools
curl -s -b "session_token=TOKEN" http://localhost:3000/api/requests/audience-options | head -c 500
curl -s -b "session_token=TOKEN" http://localhost:3000/api/requests | head -c 500
```

Note the response shapes. They must match after refactoring.

- [ ] **Step 2: Replace `requests.ts` with the Drizzle-native version**

Open `artifacts/api-server/src/routes/requests.ts` and replace its full contents:

```typescript
import { Router } from "express";
import {
  db,
  activityRequestsTable,
  activityConsentsTable,
  usersTable,
  groupStudentsTable,
  studentsTable,
  levelsTable,
  groupsTable,
} from "@workspace/db";
import { desc, eq, and, or, sql, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// ── helpers ────────────────────────────────────────────────────────────────

async function getParentRelevantRequestIds(parentId: number): Promise<number[] | "all"> {
  const pupils = await db
    .select({ id: studentsTable.id, levelId: studentsTable.levelId, teacherId: studentsTable.teacherId })
    .from(studentsTable)
    .where(eq(studentsTable.parentId, parentId));

  if (pupils.length === 0) return "all";

  const levelIds = [...new Set(pupils.map((p) => p.levelId).filter(Boolean))] as number[];
  const teacherIds = [...new Set(pupils.map((p) => p.teacherId).filter(Boolean))] as number[];

  const groupRows = await db
    .selectDistinct({ groupId: groupStudentsTable.groupId })
    .from(groupStudentsTable)
    .where(inArray(groupStudentsTable.studentId, pupils.map((p) => p.id)));
  const groupIds = groupRows.map((r) => r.groupId);

  // Build a single SQL condition covering all relevant request types
  const conditions = [eq(activityRequestsTable.targetType, "all")];

  if (levelIds.length > 0) {
    conditions.push(
      and(
        eq(activityRequestsTable.targetType, "level"),
        inArray(activityRequestsTable.targetId, levelIds),
      )!,
    );
  }
  if (groupIds.length > 0) {
    conditions.push(
      and(
        eq(activityRequestsTable.targetType, "group"),
        inArray(activityRequestsTable.targetId, groupIds),
      )!,
    );
  }
  if (teacherIds.length > 0) {
    conditions.push(
      and(
        eq(activityRequestsTable.targetType, "teacher"),
        inArray(activityRequestsTable.targetId, teacherIds),
      )!,
    );
  }

  const relevant = await db
    .select({ id: activityRequestsTable.id })
    .from(activityRequestsTable)
    .where(or(...conditions));

  return relevant.map((r) => r.id);
}

async function resolveTargetLabel(targetType: string, targetId: number | null): Promise<string> {
  if (targetType === "all" || targetId === null) return "all";

  if (targetType === "level") {
    const [row] = await db
      .select({ name: levelsTable.name })
      .from(levelsTable)
      .where(eq(levelsTable.id, targetId));
    return row?.name ? `Level: ${row.name}` : `Level #${targetId}`;
  }
  if (targetType === "group") {
    const [row] = await db
      .select({ name: groupsTable.name })
      .from(groupsTable)
      .where(eq(groupsTable.id, targetId));
    return row?.name ? `Group: ${row.name}` : `Group #${targetId}`;
  }
  if (targetType === "teacher") {
    const [row] = await db
      .select({ name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, targetId));
    return row?.name ? `Teacher: ${row.name}` : `Teacher #${targetId}`;
  }
  return "all";
}

// ── GET /api/requests/audience-options ─────────────────────────────────────

router.get("/requests/audience-options", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin") return res.status(403).json({ error: "Forbidden" });

  try {
    const [levels, groups, teachers] = await Promise.all([
      db.select({ id: levelsTable.id, name: levelsTable.name }).from(levelsTable).orderBy(levelsTable.name),
      db.select({ id: groupsTable.id, name: groupsTable.name }).from(groupsTable).orderBy(groupsTable.name),
      db
        .select({ id: usersTable.id, name: usersTable.name })
        .from(usersTable)
        .where(eq(usersTable.role, "teacher"))
        .orderBy(usersTable.name),
    ]);
    res.json({ levels, groups, teachers });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch audience options" });
  }
});

// ── GET /api/requests ───────────────────────────────────────────────────────

router.get("/requests", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;

    const items = await db
      .select({
        id: activityRequestsTable.id,
        title: activityRequestsTable.title,
        titleAr: activityRequestsTable.titleAr,
        description: activityRequestsTable.description,
        descriptionAr: activityRequestsTable.descriptionAr,
        date: activityRequestsTable.date,
        requiredItems: activityRequestsTable.requiredItems,
        requiredItemsAr: activityRequestsTable.requiredItemsAr,
        cost: activityRequestsTable.cost,
        authorId: activityRequestsTable.authorId,
        authorName: usersTable.name,
        targetType: activityRequestsTable.targetType,
        targetId: activityRequestsTable.targetId,
        createdAt: activityRequestsTable.createdAt,
      })
      .from(activityRequestsTable)
      .leftJoin(usersTable, eq(activityRequestsTable.authorId, usersTable.id))
      .orderBy(desc(activityRequestsTable.createdAt));

    let filtered = items;
    if (user.role === "parent") {
      const relevant = await getParentRelevantRequestIds(user.id);
      if (relevant !== "all") {
        filtered = items.filter((i) => relevant.includes(i.id));
      }
    }

    const enriched = await Promise.all(
      filtered.map(async (item) => {
        const consents = await db
          .select({ status: activityConsentsTable.status, parentId: activityConsentsTable.parentId })
          .from(activityConsentsTable)
          .where(eq(activityConsentsTable.requestId, item.id));

        const approved = consents.filter((c) => c.status === "approved").length;
        const declined = consents.filter((c) => c.status === "declined").length;

        let myConsentStatus: string | null = null;
        if (user.role === "parent") {
          const mine = consents.find((c) => c.parentId === user.id);
          myConsentStatus = mine?.status ?? null;
        }

        const targetLabel = await resolveTargetLabel(item.targetType, item.targetId);

        return {
          ...item,
          approvedCount: approved,
          declinedCount: declined,
          totalResponses: consents.length,
          myConsentStatus,
          targetLabel,
        };
      }),
    );

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch requests" });
  }
});

// ── GET /api/requests/:id/consents ─────────────────────────────────────────

router.get("/requests/:id/consents", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin") return res.status(403).json({ error: "Forbidden" });

  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const consents = await db
      .select({
        id: activityConsentsTable.id,
        parentId: activityConsentsTable.parentId,
        parentName: usersTable.name,
        status: activityConsentsTable.status,
        respondedAt: activityConsentsTable.respondedAt,
      })
      .from(activityConsentsTable)
      .leftJoin(usersTable, eq(activityConsentsTable.parentId, usersTable.id))
      .where(eq(activityConsentsTable.requestId, id));

    res.json(consents);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch consents" });
  }
});

// ── POST /api/requests ──────────────────────────────────────────────────────

router.post("/requests", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin") return res.status(403).json({ error: "Forbidden" });

  const { title, titleAr, description, descriptionAr, date, requiredItems, requiredItemsAr, cost, targetType, targetId } = req.body;
  if (!title || !description || !date) return res.status(400).json({ error: "title, description, date are required" });

  const validTargetTypes = ["all", "level", "group", "teacher"];
  const resolvedTargetType = validTargetTypes.includes(targetType) ? targetType : "all";
  const resolvedTargetId = resolvedTargetType !== "all" && targetId ? parseInt(targetId) : null;

  const items = Array.isArray(requiredItems) ? requiredItems.filter((i: any) => typeof i === "string" && i.trim()) : [];
  const itemsAr = Array.isArray(requiredItemsAr) ? requiredItemsAr.filter((i: any) => typeof i === "string" && i.trim()) : [];

  try {
    const [item] = await db
      .insert(activityRequestsTable)
      .values({
        title,
        titleAr: titleAr?.trim() || null,
        description,
        descriptionAr: descriptionAr?.trim() || null,
        date,
        requiredItems: items,
        requiredItemsAr: itemsAr,
        cost: cost ? parseInt(cost) : null,
        authorId: user.id,
        targetType: resolvedTargetType,
        targetId: resolvedTargetId,
      })
      .returning();
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: "Failed to create request" });
  }
});

// ── DELETE /api/requests/:id ────────────────────────────────────────────────

router.delete("/requests/:id", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin") return res.status(403).json({ error: "Forbidden" });

  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    await db.delete(activityRequestsTable).where(eq(activityRequestsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete request" });
  }
});

// ── POST /api/requests/:id/consent ─────────────────────────────────────────

router.post("/requests/:id/consent", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "parent") return res.status(403).json({ error: "Only parents can submit consent" });

  const requestId = parseInt(req.params.id);
  if (isNaN(requestId)) return res.status(400).json({ error: "Invalid id" });

  const { status } = req.body;
  if (!["approved", "declined"].includes(status)) return res.status(400).json({ error: "status must be 'approved' or 'declined'" });

  try {
    await db
      .delete(activityConsentsTable)
      .where(and(eq(activityConsentsTable.requestId, requestId), eq(activityConsentsTable.parentId, user.id)));

    const [consent] = await db
      .insert(activityConsentsTable)
      .values({ requestId, parentId: user.id, status })
      .returning();

    res.status(201).json(consent);
  } catch (err) {
    res.status(500).json({ error: "Failed to submit consent" });
  }
});

export default router;
```

- [ ] **Step 3: Type-check**

```bash
pnpm typecheck
```

Expected: 0 errors. Fix any that appear before proceeding.

- [ ] **Step 4: Verify response shape matches what you captured in Step 1**

```bash
curl -s -b "session_token=TOKEN" http://localhost:3000/api/requests/audience-options | head -c 500
curl -s -b "session_token=TOKEN" http://localhost:3000/api/requests | head -c 500
```

Expected: same shape as before refactor.

- [ ] **Step 5: Commit**

```bash
git add artifacts/api-server/src/routes/requests.ts
git commit -m "refactor(requests): replace db.execute raw SQL with Drizzle ORM; SQL-side parent filtering"
```

---

## Phase 3 — Performance: Eliminate N+1 Query Patterns

### Task 4: Fix N+1 in `levels.ts` — bulk teacher fetch

**Files:**
- Modify: `artifacts/api-server/src/routes/levels.ts`

`enrichLevel` currently fires one `SELECT` per teacher. With 10 groups, that's 10 extra queries. Replace with a single `inArray` query.

- [ ] **Step 1: Replace the teacher-fetching block in `enrichLevel`**

In `artifacts/api-server/src/routes/levels.ts`, find the `enrichLevel` function (lines 9–54). Change the imports line at the top:

```typescript
import { eq, sql, and, inArray } from "drizzle-orm";
```

Then replace lines 25–33 (the `teacherIds` + `Promise.all` block):

**Before:**
```typescript
const teacherIds = [...new Set(groupRows.map(g => g.teacherId).filter(Boolean) as number[])];
const teachers = await Promise.all(
  teacherIds.map(async (tid) => {
    const [t] = await db
      .select({ id: usersTable.id, name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, tid));
    return t ?? null;
  })
);
```

**After:**
```typescript
const teacherIds = [...new Set(groupRows.map(g => g.teacherId).filter(Boolean) as number[])];
const teachers = teacherIds.length > 0
  ? await db
      .select({ id: usersTable.id, name: usersTable.name })
      .from(usersTable)
      .where(inArray(usersTable.id, teacherIds))
  : [];
```

The return value is the same shape (`{ id, name }[]`), so the rest of the function is untouched.

- [ ] **Step 2: Type-check**

```bash
pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 3: Verify `/api/levels` returns same data**

```bash
curl -s -b "session_token=TOKEN" http://localhost:3000/api/levels | head -c 500
```

- [ ] **Step 4: Commit**

```bash
git add artifacts/api-server/src/routes/levels.ts
git commit -m "perf(levels): replace N+1 teacher queries with single inArray fetch"
```

---

### Task 5: Fix N+1 in `payments.ts` — `enrichPayment` uses 3 queries per payment

**Files:**
- Modify: `artifacts/api-server/src/routes/payments.ts`

`enrichPayment` fires: one query for the student, optionally one for the level, optionally one for the parent. With a list of 50 payments that's up to 150 queries. Collapse to 1 JOIN query.

- [ ] **Step 1: Replace `enrichPayment` at the top of `payments.ts`**

Update the imports line:
```typescript
import { eq, and, inArray, sql, desc, gte, ne, isNotNull } from "drizzle-orm";
```

Replace the `enrichPayment` function (lines 9–35) with:

```typescript
async function enrichPayment(payment: typeof paymentsTable.$inferSelect) {
  // One JOIN query replaces the previous 2–3 sequential queries.
  // The levels LEFT JOIN uses a literal condition derived from the payment's levelId
  // so we never join a table we don't need.
  const [row] = await db
    .select({
      studentName: studentsTable.name,
      parentName: usersTable.name,
      levelName: levelsTable.name,
    })
    .from(studentsTable)
    .leftJoin(usersTable, eq(studentsTable.parentId, usersTable.id))
    .leftJoin(
      levelsTable,
      payment.levelId ? eq(levelsTable.id, payment.levelId) : sql<boolean>`false`,
    )
    .where(eq(studentsTable.id, payment.studentId));

  const discount = parseFloat(payment.discount ?? "0");
  return {
    ...payment,
    amountDue: parseFloat(payment.amountDue),
    discount,
    amountPaid: parseFloat(payment.amountPaid),
    paidAt: payment.paidAt?.toISOString() ?? null,
    createdAt: payment.createdAt.toISOString(),
    studentName: row?.studentName ?? "",
    levelName: row?.levelName ?? null,
    parentName: row?.parentName ?? null,
  };
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm typecheck
```

- [ ] **Step 3: Verify `/api/payments` returns correct data**

```bash
curl -s -b "session_token=TOKEN" http://localhost:3000/api/payments | head -c 800
```

Check that `studentName`, `levelName`, `parentName` are populated correctly.

- [ ] **Step 4: Commit**

```bash
git add artifacts/api-server/src/routes/payments.ts
git commit -m "perf(payments): collapse enrichPayment from 3 queries to 1 JOIN query"
```

---

## Phase 4 — Optimization: Move JS Aggregation to SQL

### Task 6: Refactor `/debt-summary` — group by student in SQL

**Files:**
- Modify: `artifacts/api-server/src/routes/payments.ts`

The `/debt-summary` route fetches all underpaid payments, runs `enrichPayment` on each (N queries), then groups by student in JS. Replace with a single SQL `GROUP BY` + JOIN.

- [ ] **Step 1: Capture current response for comparison**

```bash
curl -s -b "session_token=TOKEN" http://localhost:3000/api/debt-summary | python3 -m json.tool | head -40
```

Note the structure of `students[]` entries (fields: `studentId`, `studentName`, `levelName`, `balance`, `amountDue`, `amountPaid`, `oldestDueDate`).

- [ ] **Step 2: Replace the `/debt-summary` route handler**

Find the route starting at line 446 in `payments.ts` and replace it with:

```typescript
router.get("/debt-summary", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!["admin", "accountant"].includes(user.role)) {
    res.status(403).json({ error: "Access denied." });
    return;
  }

  // Single query: join payments → students → levels, group by student,
  // filter to only students with remaining balance > 0.
  const debtRows = await db
    .select({
      studentId: paymentsTable.studentId,
      studentName: studentsTable.name,
      levelName: levelsTable.name,
      totalDue: sql<number>`CAST(SUM(CAST(${paymentsTable.amountDue} AS REAL)) AS REAL)`,
      totalPaid: sql<number>`CAST(SUM(CAST(${paymentsTable.amountPaid} AS REAL)) AS REAL)`,
      balance: sql<number>`CAST(SUM(CAST(${paymentsTable.amountDue} AS REAL) - CAST(${paymentsTable.amountPaid} AS REAL)) AS REAL)`,
      oldestDueDate: sql<string>`MIN(${paymentsTable.dueDate})`,
    })
    .from(paymentsTable)
    .innerJoin(studentsTable, eq(paymentsTable.studentId, studentsTable.id))
    .leftJoin(levelsTable, eq(studentsTable.levelId, levelsTable.id))
    .where(
      sql`CAST(${paymentsTable.amountPaid} AS REAL) < CAST(${paymentsTable.amountDue} AS REAL)`,
    )
    .groupBy(paymentsTable.studentId, studentsTable.name, levelsTable.name)
    .having(
      sql`SUM(CAST(${paymentsTable.amountDue} AS REAL) - CAST(${paymentsTable.amountPaid} AS REAL)) > 0`,
    )
    .orderBy(sql`MIN(${paymentsTable.dueDate})`);

  const totalDebt = debtRows.reduce((s, r) => s + r.balance, 0);

  res.json({
    totalDebt,
    students: debtRows.map((r) => ({
      studentId: r.studentId,
      studentName: r.studentName ?? "Unknown",
      levelName: r.levelName ?? null,
      amountDue: r.totalDue,
      amountPaid: r.totalPaid,
      balance: r.balance,
      oldestDueDate: r.oldestDueDate,
    })),
  });
});
```

**Note on behavior change:** The previous response included a `status` and `paymentId` field per entry (it was per-payment, then grouped). The new response is per-student with aggregated totals, which is more useful. If the frontend relies on `paymentId` per debt entry, keep the old route alongside under `/debt-summary-legacy` until the frontend is updated.

- [ ] **Step 3: Type-check**

```bash
pnpm typecheck
```

- [ ] **Step 4: Verify response shape**

```bash
curl -s -b "session_token=TOKEN" http://localhost:3000/api/debt-summary | python3 -m json.tool | head -40
```

Verify `totalDebt` is correct and `students[]` has the right fields.

- [ ] **Step 5: Commit**

```bash
git add artifacts/api-server/src/routes/payments.ts
git commit -m "perf(payments): debt-summary now uses SQL GROUP BY instead of JS grouping"
```

---

### Task 7: Refactor `dashboard.ts` — `/dashboard/admin` monthly revenue

**Files:**
- Modify: `artifacts/api-server/src/routes/dashboard.ts`

The admin dashboard loads every payment row into JS to compute monthly totals. With thousands of payments this is a full table scan → JS loop. Replace with SQL `GROUP BY`.

- [ ] **Step 1: Update imports in `dashboard.ts`**

Replace the import line at the top:
```typescript
import { eq, sql, and, gte, lte, desc, count, ne, isNotNull } from "drizzle-orm";
import { db, studentsTable, usersTable, levelsTable, evaluationsTable, paymentsTable, expensesTable, observationsTable } from "@workspace/db";
import { monthOf } from "@workspace/db/helpers";
import { requireAuth } from "../middlewares/auth";
```

- [ ] **Step 2: Refactor the `/dashboard/admin` handler**

Replace lines 8–64 with:

```typescript
router.get("/dashboard/admin", requireAuth, async (_req: Request, res: Response): Promise<void> => {
  const [
    [studentCount],
    [teacherCount],
    [parentCount],
    [levelCount],
    [overdueCount],
    [recentEvalCount],
    [revenue],
    [avgProgress],
  ] = await Promise.all([
    db.select({ count: count() }).from(studentsTable),
    db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "teacher")),
    db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "parent")),
    db.select({ count: count() }).from(levelsTable),
    db.select({ count: count() }).from(paymentsTable).where(eq(paymentsTable.status, "overdue")),
    db.select({ count: count() }).from(evaluationsTable),
    db.select({
      total: sql<number>`CAST(SUM(CAST(${paymentsTable.amountPaid} AS REAL)) AS REAL)`,
      pending: sql<number>`CAST(SUM(CAST(${paymentsTable.amountDue} AS REAL) - CAST(${paymentsTable.amountPaid} AS REAL)) AS REAL)`,
    }).from(paymentsTable),
    db.select({
      avg: sql<number>`CAST(AVG(CAST(${evaluationsTable.progressScore} AS REAL)) AS REAL)`,
    }).from(evaluationsTable),
  ]);

  // Students per level — SQL GROUP BY with level name via JOIN
  const studentsByLevel = await db
    .select({
      levelId: studentsTable.levelId,
      levelName: levelsTable.name,
      count: count(),
    })
    .from(studentsTable)
    .innerJoin(levelsTable, eq(studentsTable.levelId, levelsTable.id))
    .where(isNotNull(studentsTable.levelId))
    .groupBy(studentsTable.levelId, levelsTable.name);

  // Revenue by month — SQL GROUP BY using cross-DB monthOf helper
  const revenueByMonth = await db
    .select({
      month: monthOf(paymentsTable.createdAt),
      revenue: sql<number>`CAST(SUM(CAST(${paymentsTable.amountPaid} AS REAL)) AS REAL)`,
    })
    .from(paymentsTable)
    .groupBy(monthOf(paymentsTable.createdAt))
    .orderBy(monthOf(paymentsTable.createdAt));

  res.json({
    totalStudents: studentCount?.count ?? 0,
    totalRevenue: revenue?.total ?? 0,
    pendingRevenue: revenue?.pending ?? 0,
    totalLevels: levelCount?.count ?? 0,
    totalTeachers: teacherCount?.count ?? 0,
    totalParents: parentCount?.count ?? 0,
    averageProgressScore: avgProgress?.avg ?? null,
    recentEvaluationsCount: recentEvalCount?.count ?? 0,
    overduePaymentsCount: overdueCount?.count ?? 0,
    studentsByLevel: studentsByLevel.map((s) => ({
      levelId: s.levelId!,
      levelName: s.levelName ?? "Unknown",
      count: s.count,
    })),
    revenueByMonth: revenueByMonth.map((r) => ({
      month: r.month,
      revenue: r.revenue ?? 0,
    })),
  });
});
```

- [ ] **Step 3: Type-check**

```bash
pnpm typecheck
```

- [ ] **Step 4: Verify**

```bash
curl -s -b "session_token=TOKEN" http://localhost:3000/api/dashboard/admin | python3 -m json.tool | head -40
```

Check `revenueByMonth` is grouped correctly and `studentsByLevel` has levelName populated.

- [ ] **Step 5: Commit**

```bash
git add artifacts/api-server/src/routes/dashboard.ts
git commit -m "perf(dashboard): admin stats use SQL GROUP BY and count() helper; eliminates JS loops"
```

---

### Task 8: Refactor `dashboard.ts` — `/dashboard/revenue` level grouping and status breakdown

**Files:**
- Modify: `artifacts/api-server/src/routes/dashboard.ts`

`/dashboard/revenue` fetches all payments for a month, then groups by level and counts statuses in JS. Both are SQL operations.

- [ ] **Step 1: Replace the `/dashboard/revenue` handler**

Replace lines 66–111 with:

```typescript
router.get("/dashboard/revenue", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
  const [year, monthNum] = month.split("-").map(Number);
  const startDate = `${year}-${String(monthNum).padStart(2, "0")}-01`;
  const endDate = new Date(year, monthNum, 0).toISOString().slice(0, 10);

  const dateRange = and(
    gte(paymentsTable.dueDate, startDate),
    lte(paymentsTable.dueDate, endDate),
  );

  const [totals, revenueByLevel, statusCounts, [expenseTotal]] = await Promise.all([
    // Total collected and due for the month
    db
      .select({
        collected: sql<number>`CAST(SUM(CAST(${paymentsTable.amountPaid} AS REAL)) AS REAL)`,
        due: sql<number>`CAST(SUM(CAST(${paymentsTable.amountDue} AS REAL)) AS REAL)`,
      })
      .from(paymentsTable)
      .where(dateRange),

    // Revenue grouped by level — JOIN gives us levelName without a second query
    db
      .select({
        levelId: paymentsTable.levelId,
        levelName: levelsTable.name,
        collected: sql<number>`CAST(SUM(CAST(${paymentsTable.amountPaid} AS REAL)) AS REAL)`,
        due: sql<number>`CAST(SUM(CAST(${paymentsTable.amountDue} AS REAL)) AS REAL)`,
      })
      .from(paymentsTable)
      .innerJoin(levelsTable, eq(paymentsTable.levelId, levelsTable.id))
      .where(and(dateRange, isNotNull(paymentsTable.levelId)))
      .groupBy(paymentsTable.levelId, levelsTable.name),

    // Status breakdown via conditional aggregation — one row, four counters
    db
      .select({
        paid: sql<number>`CAST(SUM(CASE WHEN ${paymentsTable.status} = 'paid' THEN 1 ELSE 0 END) AS INTEGER)`,
        partially_paid: sql<number>`CAST(SUM(CASE WHEN ${paymentsTable.status} = 'partially_paid' THEN 1 ELSE 0 END) AS INTEGER)`,
        overdue: sql<number>`CAST(SUM(CASE WHEN ${paymentsTable.status} = 'overdue' THEN 1 ELSE 0 END) AS INTEGER)`,
        pending: sql<number>`CAST(SUM(CASE WHEN ${paymentsTable.status} = 'pending' THEN 1 ELSE 0 END) AS INTEGER)`,
      })
      .from(paymentsTable)
      .where(dateRange),

    // Total expenses for the same month
    db
      .select({
        total: sql<number>`CAST(SUM(CAST(${expensesTable.amount} AS REAL)) AS REAL)`,
      })
      .from(expensesTable)
      .where(
        and(
          gte(expensesTable.expenseDate, startDate),
          lte(expensesTable.expenseDate, endDate),
        ),
      ),
  ]);

  const totalCollected = totals[0]?.collected ?? 0;
  const totalDue = totals[0]?.due ?? 0;
  const totalExpenses = expenseTotal?.total ?? 0;
  const statusBreakdown = statusCounts[0] ?? { paid: 0, partially_paid: 0, overdue: 0, pending: 0 };

  res.json({
    month,
    totalCollected,
    totalDue,
    totalExpenses,
    netRevenue: totalCollected - totalExpenses,
    revenueByLevel: revenueByLevel.map((r) => ({
      levelId: r.levelId,
      levelName: r.levelName ?? "Unknown",
      collected: r.collected ?? 0,
      due: r.due ?? 0,
    })),
    paymentStatusBreakdown: {
      paid: statusBreakdown.paid ?? 0,
      partially_paid: statusBreakdown.partially_paid ?? 0,
      overdue: statusBreakdown.overdue ?? 0,
      pending: statusBreakdown.pending ?? 0,
    },
  });
});
```

- [ ] **Step 2: Type-check**

```bash
pnpm typecheck
```

- [ ] **Step 3: Verify**

```bash
curl -s -b "session_token=TOKEN" "http://localhost:3000/api/dashboard/revenue?month=2025-01" | python3 -m json.tool
```

- [ ] **Step 4: Commit**

```bash
git add artifacts/api-server/src/routes/dashboard.ts
git commit -m "perf(dashboard): revenue by level and status breakdown now use SQL aggregation"
```

---

### Task 9: Refactor `dashboard.ts` — `/dashboard/performance` SQL averages and top performers

**Files:**
- Modify: `artifacts/api-server/src/routes/dashboard.ts`

`/dashboard/performance` loads all evaluations then computes averages and rankings in JavaScript. Three `AVG()` calls and a `GROUP BY student_id ORDER BY AVG LIMIT 5` replace the JS loops.

**Note on `behavioralFlags`:** This column stores a JSON array (SQLite: JSON text, PostgreSQL: native array). Counting flag occurrences in SQL requires DB-specific JSON functions or array operators, so we keep that counting in JavaScript — it is O(n students) on the whole dataset, not O(n evaluations), and is an intentional, documented exception.

- [ ] **Step 1: Replace the `/dashboard/performance` handler**

Replace lines 113–166 with:

```typescript
router.get("/dashboard/performance", requireAuth, async (_req: Request, res: Response): Promise<void> => {
  const [scoreBreakdown, topPerformers, students] = await Promise.all([
    // Score averages — three AVG calls in one query
    db
      .select({
        avgSpeaking: sql<number>`CAST(AVG(${evaluationsTable.speakingScore}) AS REAL)`,
        avgConfidence: sql<number>`CAST(AVG(${evaluationsTable.confidenceScore}) AS REAL)`,
        avgParticipation: sql<number>`CAST(AVG(${evaluationsTable.participationScore}) AS REAL)`,
        overallAvg: sql<number>`CAST(AVG(CAST(${evaluationsTable.progressScore} AS REAL)) AS REAL)`,
      })
      .from(evaluationsTable),

    // Top 5 performers — GROUP BY student, ORDER BY average progress score DESC
    db
      .select({
        studentId: evaluationsTable.studentId,
        studentName: studentsTable.name,
        levelName: levelsTable.name,
        avgScore: sql<number>`CAST(AVG(CAST(${evaluationsTable.progressScore} AS REAL)) AS REAL)`,
      })
      .from(evaluationsTable)
      .innerJoin(studentsTable, eq(evaluationsTable.studentId, studentsTable.id))
      .leftJoin(levelsTable, eq(studentsTable.levelId, levelsTable.id))
      .groupBy(evaluationsTable.studentId, studentsTable.name, levelsTable.name)
      .orderBy(sql`AVG(CAST(${evaluationsTable.progressScore} AS REAL)) DESC`)
      .limit(5),

    // Students needed only for behavioral flag counting (JS-side, see note above)
    db
      .select({ id: studentsTable.id, behavioralFlags: studentsTable.behavioralFlags })
      .from(studentsTable),
  ]);

  const scores = scoreBreakdown[0];

  // Behavioral flag counts: O(n students), intentionally kept in JS because
  // JSON array element counting requires DB-specific functions (json_each vs @>).
  const flagCounts = { fear: 0, shyness: 0, high_potential: 0 };
  for (const s of students) {
    if (s.behavioralFlags.includes("fear")) flagCounts.fear++;
    if (s.behavioralFlags.includes("shyness")) flagCounts.shyness++;
    if (s.behavioralFlags.includes("high_potential")) flagCounts.high_potential++;
  }

  res.json({
    overallAverageScore: scores?.overallAvg ?? null,
    topPerformers: topPerformers.map((t) => ({
      studentId: t.studentId,
      studentName: t.studentName ?? "Unknown",
      progressScore: Math.round((t.avgScore ?? 0) * 10) / 10,
      levelName: t.levelName ?? null,
    })),
    behavioralFlagCounts: flagCounts,
    scoreBreakdown: {
      averageSpeaking: scores?.avgSpeaking ?? null,
      averageConfidence: scores?.avgConfidence ?? null,
      averageParticipation: scores?.avgParticipation ?? null,
    },
  });
});
```

- [ ] **Step 2: Type-check**

```bash
pnpm typecheck
```

- [ ] **Step 3: Verify**

```bash
curl -s -b "session_token=TOKEN" http://localhost:3000/api/dashboard/performance | python3 -m json.tool
```

Check `topPerformers` has at most 5 entries, `scoreBreakdown` has numeric values, and `behavioralFlagCounts` is correct.

- [ ] **Step 4: Commit**

```bash
git add artifacts/api-server/src/routes/dashboard.ts
git commit -m "perf(dashboard): performance averages and top-5 ranking now use SQL AVG/GROUP BY"
```

---

## Phase 5 — Cleanup: ORM Helpers Throughout

### Task 10: Replace `sql\`x != y\`` with `ne()` in `messages.ts` and `dashboard.ts`

**Files:**
- Modify: `artifacts/api-server/src/routes/messages.ts`
- Modify: `artifacts/api-server/src/routes/dashboard.ts`

Small but important: `sql\`${col} != ${val}\`` bypasses type-checking. `ne(col, val)` is the correct Drizzle helper.

- [ ] **Step 1: Fix `messages.ts`**

In `artifacts/api-server/src/routes/messages.ts`, the import line already includes `isNotNull` and `or`. Add `ne`:

```typescript
import { desc, eq, and, or, inArray, isNotNull, ne } from "drizzle-orm";
```

Find line 24 (in `getContactsForUser`):
```typescript
.where(sql`${usersTable.id} != ${user.id}`);
```
Replace with:
```typescript
.where(ne(usersTable.id, user.id));
```

Remove `sql` from the import if it is no longer used anywhere in the file after this change.

- [ ] **Step 2: Fix `dashboard.ts` — pending-payments route**

In `dashboard.ts`, find the `/dashboard/pending-payments` handler. Replace:
```typescript
.where(sql`${paymentsTable.status} != 'paid'`)
```
With:
```typescript
.where(ne(paymentsTable.status, "paid"))
```

Ensure `ne` is in the drizzle-orm import at the top.

- [ ] **Step 3: Type-check**

```bash
pnpm typecheck
```

- [ ] **Step 4: Commit**

```bash
git add artifacts/api-server/src/routes/messages.ts artifacts/api-server/src/routes/dashboard.ts
git commit -m "fix: replace raw sql != conditions with Drizzle ne() operator"
```

---

### Task 11: Replace `CAST(count(*) AS INTEGER)` with Drizzle `count()` in remaining routes

**Files:**
- Modify: `artifacts/api-server/src/routes/customRoles.ts`

`customRoles.ts` uses both a correlated subquery and a standalone count. The standalone count becomes `count()`. The correlated subquery stays as-is — it's valid ANSI SQL.

- [ ] **Step 1: Fix `customRoles.ts`**

Change the import:
```typescript
import { eq, sql, count } from "drizzle-orm";
```

Find the DELETE handler's guard check (around line 102):
```typescript
const [{ count }] = await db.select({ count: sql<number>`CAST(count(*) AS INTEGER)` })
  .from(usersTable).where(eq(usersTable.customRoleId, id));
```

Replace with (rename the destructured property to avoid clash with the `count` import):
```typescript
const [countRow] = await db
  .select({ total: count() })
  .from(usersTable)
  .where(eq(usersTable.customRoleId, id));

if ((countRow?.total ?? 0) > 0) {
  res.status(409).json({ error: `Cannot delete: ${countRow!.total} user(s) assigned to this role. Reassign them first.` });
  return;
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add artifacts/api-server/src/routes/customRoles.ts
git commit -m "fix(custom-roles): use Drizzle count() helper instead of raw CAST(count(*) AS INTEGER)"
```

---

## Self-Review

### Spec Coverage Check

| Requirement | Covered By |
|---|---|
| Keep SQLite for development | `monthOf` uses strftime; all `CAST` syntax is ANSI | ✅ |
| Use PostgreSQL for production | `monthOf` uses to_char for pg; union type in db/index.ts | ✅ |
| Move grouping/filtering/aggregation to DB | Tasks 7, 8, 9, 6 | ✅ |
| Replace raw SQL with Drizzle ORM | Task 3 (requests.ts), Task 10 (ne/isNotNull), Task 11 (count) | ✅ |
| Consistent behavior across environments | All SQL is ANSI except monthOf which is explicitly switched | ✅ |
| Performance at scale | Tasks 4, 5 (N+1 fixes), Tasks 6–9 (no full-table JS scans) | ✅ |

### Intentional Exceptions (JS stays, documented why)

| Location | What stays in JS | Why |
|---|---|---|
| `dashboard/performance` | `behavioralFlags` counting | Column is JSON array; cross-DB element counting requires non-ANSI functions (`json_each` vs `@>`) |
| `requests.ts` | `filtered.map(...)` for consent enrichment | Per-request consent query is unavoidable without a very complex lateral join; acceptable since request lists are small |

### No Placeholders Found
All code blocks in this plan are complete and runnable. No "TBD" or "implement later" entries.

### Type Consistency Check
- `count()` from drizzle-orm returns `SQL<number>` — used consistently
- `monthOf()` returns `SQL<string>` — used in `.select()`, `.groupBy()`, `.orderBy()` 
- `ne()` accepts `(column, value)` matching the column type — used correctly
