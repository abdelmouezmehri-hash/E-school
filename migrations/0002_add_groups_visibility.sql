-- ============================================================================
-- Kidspeak Hub — Public group visibility migration
--
-- Run this AFTER `pnpm --filter @workspace/db push:dev`, which adds the new
-- `is_public` column to the `groups` table.
--
-- The default is FALSE (closed), which is what we want for safety: existing
-- groups remain hidden from the public landing page until an admin
-- explicitly opens them. There is therefore no data migration needed —
-- this script is purely for verification.
--
-- Drizzle-kit's push:dev already applies `DEFAULT FALSE` to existing rows
-- on most providers, but on rare configurations it may leave NULLs. The
-- UPDATE below normalises any NULLs to false (idempotent).
--
-- DIALECT: works on both SQLite and PostgreSQL.
-- ============================================================================

-- Normalise any NULLs to FALSE (no-op on healthy schemas).
UPDATE groups SET is_public = FALSE WHERE is_public IS NULL;

-- Sanity check (does NOT modify data) — uncomment to verify after running:
--
--   SELECT id, name, is_public FROM groups ORDER BY id;
--
-- Expected: every row has is_public = 0 (SQLite) or false (Postgres).
-- ============================================================================
