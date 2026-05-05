-- ============================================================================
-- Kidspeak Hub — Financial system unification migration
--
-- Run this AFTER `pnpm --filter @workspace/db push:dev` (or push:prod), which
-- creates the new `salary_id` and `staff_payment_request_id` columns on the
-- `expenses` table. This script then:
--
--   1. Back-fills `expenses.salary_id` for already-existing rows where the
--      description matches the "راتب <name> — <period>" pattern that the old
--      handler used. Match is best-effort using (amount, expense_date).
--
--   2. Migrates rows from the legacy `teacher_payments` table into `salaries`
--      and creates the matching `expenses` rows. Migrated salaries get a
--      "[migrated]" note tag for traceability.
--
--   3. Back-fills `expenses.staff_payment_request_id` for the expenses just
--      created from migrated request payments.
--
-- The `teacher_payments` table is NOT dropped — it is left in place as an
-- audit-only ledger. New writes go to `salaries`. You can drop it once you've
-- verified everything is consistent.
--
-- This script is idempotent: re-running it has no additional effect because
-- of the WHERE clauses on NULL columns.
--
-- DIALECT: works on both SQLite and PostgreSQL (no dialect-specific syntax).
-- ============================================================================

-- ── 1. Back-fill expenses.salary_id for existing salary expenses ────────────
-- For each salary that has no linked expense yet, find the most likely
-- matching expense row (same amount, same date, salaries category, no FK yet).
UPDATE expenses
SET salary_id = (
    SELECT s.id
    FROM salaries s
    WHERE s.amount = expenses.amount
      AND s.paid_at = expenses.expense_date
    ORDER BY s.id ASC
    LIMIT 1
)
WHERE expenses.category = 'salaries'
  AND expenses.salary_id IS NULL
  AND expenses.staff_payment_request_id IS NULL
  AND EXISTS (
      SELECT 1 FROM salaries s2
      WHERE s2.amount = expenses.amount
        AND s2.paid_at = expenses.expense_date
  );

-- ── 2. Migrate teacher_payments rows into salaries ──────────────────────────
-- Only migrate rows that don't already have an equivalent in salaries (same
-- teacher_id, amount, period). This is safe to re-run.
INSERT INTO salaries (employee_id, amount, period, note, paid_at, profit_share_percent, created_at)
SELECT
    tp.teacher_id,
    tp.amount,
    tp.period,
    COALESCE('[migrated from teacher_payments] ' || COALESCE(tp.note, ''), '[migrated from teacher_payments]'),
    -- Use paid_at if set, else fall back to created_at as YYYY-MM-DD.
    -- SQLite returns a string from DATE(); pg returns a date — both compare
    -- correctly against a TEXT column.
    COALESCE(
        CAST(DATE(tp.paid_at) AS TEXT),
        CAST(DATE(tp.created_at) AS TEXT)
    ),
    NULL,
    tp.created_at
FROM teacher_payments tp
WHERE tp.status = 'paid'
  AND NOT EXISTS (
      SELECT 1 FROM salaries s
      WHERE s.employee_id = tp.teacher_id
        AND s.amount = tp.amount
        AND s.period = tp.period
  );

-- ── 3. Back-fill expenses for migrated request-driven salaries ──────────────
-- For each approved staff_payment_request whose linked_payment_id pointed
-- at a teacher_payment (now migrated into salaries) and whose request has
-- no linked expense yet, create the expense row.
INSERT INTO expenses (
    branch_id, category, description, amount, expense_date, notes,
    staff_payment_request_id, created_at
)
SELECT
    u.branch_id,
    CASE
        WHEN spr.type = 'bonus_expense' AND spr.category = 'materials'      THEN 'materials'
        WHEN spr.type = 'bonus_expense' AND spr.category = 'transportation' THEN 'other'
        ELSE 'salaries'
    END,
    'migrated: '
        || CASE WHEN spr.type = 'bonus_expense' THEN COALESCE(spr.category, 'bonus') ELSE 'payment request' END
        || ' — ' || COALESCE(u.name, '#' || spr.staff_id)
        || COALESCE(' — ' || spr.reason, '')
        || COALESCE(' (' || spr.reference_number || ')', ''),
    spr.amount,
    COALESCE(CAST(DATE(spr.approved_at) AS TEXT), CAST(DATE(spr.created_at) AS TEXT)),
    spr.reason,
    spr.id,
    spr.created_at
FROM staff_payment_requests spr
LEFT JOIN users u ON u.id = spr.staff_id
WHERE spr.status = 'approved'
  AND NOT EXISTS (
      SELECT 1 FROM expenses e
      WHERE e.staff_payment_request_id = spr.id
  );

-- ── 4. Sanity check (does NOT modify data) ──────────────────────────────────
-- After running, these queries should match what the dashboards now show.
--
-- Total paid per employee (should equal earnings.totalPaid for that user):
--   SELECT employee_id, SUM(amount) FROM salaries GROUP BY employee_id;
--
-- Total expenses per category for current month:
--   SELECT category, SUM(amount) FROM expenses
--   WHERE expense_date LIKE strftime('%Y-%m', 'now') || '%'  -- SQLite
--   GROUP BY category;
--
-- Orphan expenses (manual entries — should be only rent/utilities/etc):
--   SELECT * FROM expenses
--   WHERE salary_id IS NULL AND staff_payment_request_id IS NULL
--     AND category = 'salaries';
-- ============================================================================
