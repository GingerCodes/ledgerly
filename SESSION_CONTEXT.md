# Ledgerly Session Context

Updated: 2026-11-27

Read this file first when continuing Ledgerly work in a new assistant session. It summarizes the current product, implementation, Supabase setup, and verification state. It contains no credentials.

## Product and data rules

Ledgerly is a private personal-finance PWA for INR-only expense tracking, savings accounts, fixed deposits, cash/bank transfers, nested categories, reconciliations, reports, and encrypted backups. Daily expenses use the `CASH` account. Transfers are excluded from expense and income totals. Account numbers are tracked as references, never as banking credentials.

The user selected Supabase as the cloud source of truth. They reported no existing records to migrate. Do not create test transactions or add financial data without permission.

## Current architecture

- React, TypeScript, Vite, and a responsive PWA.
- Supabase Auth email/password sign-in; per-user data isolation via RLS.
- Supabase PostgreSQL is persistent storage. SQLite via `sql.js` is an in-memory query/calculation layer, not persistent local storage; finance data requires network access.
- The client uses `SB_URL` and `SB_ANON_KEY` from `.env.local`. That file is Git-ignored. Never inspect, print, copy, or commit its values. Never use a service-role or secret key in frontend code.
- `supabase/migrations/20261127120000_finance_schema.sql` creates the tables, RLS policies, and two authenticated RPC functions: `finance_load_snapshot` and `finance_apply_changes`.
- `finance_apply_changes` sends incremental row changes in a transaction and checks a per-user revision to reject stale writes instead of silently overwriting changes from another session.
- The Supabase project must expose the `public` schema in Project Settings → API → Exposed schemas. If PostgREST reports `PGRST002` or `pg_pgrst_no_exposed_schemas`, verify `public` is exposed and run `NOTIFY pgrst, 'reload schema';` in SQL Editor.

## Implemented features

- Dashboard, transactions, savings accounts, fixed deposits, categories, reconciliations, backups/import, and category/date-range reports.
- Year-wise transaction CSV export and validated CSV import.
- AES-GCM encrypted full-database backups.
- Readability/accessibility styling with keyboard focus, 320px reflow checks, and reduced-motion support.
- `.env.local`, financial exports, and backups are excluded from Git.

## Important files

- `src/App.tsx` — app screens, Supabase authentication, and workflows.
- `src/data/finance-database.ts` — in-memory SQLite and authenticated Supabase persistence.
- `src/data/supabase-client.ts` — environment configuration and publishable-key validation.
- `supabase/migrations/20261127120000_finance_schema.sql` — PostgreSQL schema, RLS, and RPC functions.
- `src/domain/models.ts` and `src/domain/reports.ts` — finance rules and report summaries.
- `README.md` — setup and privacy instructions.
- `PLAN.md` — product plan and implemented architecture.

## Live setup and verification

- `.env.local` is present and ignored by Git; do not include it in handoff or commit.
- The user applied the Supabase migration, enabled API exposure for `public`, and signed in to the local app.
- The app loaded the dashboard and default cash account/categories from Supabase; the defaults remained after a full page reload. No transactions were inserted for testing.
- The initial PostgREST issue was caused by no exposed schemas, not by the migration or RLS. After exposing `public`, authenticated data loading succeeded.
- The local app is available at `http://127.0.0.1:5173/`.
- Validation: 13 tests pass, lint passes, production build succeeds. Vite reports a JavaScript chunk-size warning above 500 KB; it is not a build failure.

## Continue safely

Check `git status` before making further changes. Do not commit credentials, financial records, CSV exports, backups, or browser auth tokens. After a stale-write conflict, reload to fetch the latest Supabase revision. The user asked that current source, docs, and this context file be committed together; preserve `.env.local` as ignored.
