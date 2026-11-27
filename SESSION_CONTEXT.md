# Ledgerly Session Context

Updated: 2026-11-28

Read this file first when continuing Ledgerly work in a new assistant session. It summarizes the current product, implementation, Supabase setup, deployment, and working conventions. It contains no credentials.

## Product and data rules

Ledgerly is a private personal-finance PWA for INR-only expense tracking, savings accounts, fixed deposits, cash/bank transfers, nested categories, reconciliations, reports, and encrypted backups. Daily expenses use the `CASH` account. Transfers are excluded from expense and income totals. Account numbers are tracked as references, never as banking credentials.

The user selected Supabase as the cloud source of truth. Do not create test transactions or add financial data to the real account without permission. Never test account deletion on the user's real account; use a throwaway email.

## Current architecture

- React 19, TypeScript, Vite, `vite-plugin-pwa` (prompt-mode service worker), plain CSS in `src/App.css`.
- Supabase Auth: email/password (with full name collected at registration) and Google. Per-user data isolation via RLS.
- Supabase PostgreSQL is persistent storage. SQLite via `sql.js` is an in-memory query/calculation layer, not persistent local storage; finance data requires network access.
- The client reads `SB_URL` and `SB_ANON_KEY` (Vite `envPrefix` is `['VITE_', 'SB_']`). In dev they come from the Git-ignored `.env.local`. Never inspect, print, copy, or commit its values. Never use a service-role or secret key in frontend code. The anon key is public by design; renaming it does not make it secret.
- Source layout (App.tsx was split from 1,400+ lines into modules):
  - `src/App.tsx` — auth gate and database gate, then `<AppShell/>`.
  - `src/app/` — `AppShell` (sidebar, top bar, `<Routes>`, overview modal), `FinanceProvider` + `finance-context.ts` (`useFinance`, `useFinanceQuery`; one shared notice banner and `runAction`), `useAuthSession` (session, sign out, update name), `useFinanceDatabase`, `navigation.ts` (sections with paths, settings tabs, `sectionOf`, `pageTitle`).
  - `src/features/<name>/` — auth, overview, transactions, reports, accounts, deposits, categories, backup, settings.
  - `src/components/` — Notice, EmptyState, ComboBox, TransactionTable, Logo, InstallPrompt. `src/UpdateBanner.tsx` is the new-version banner.
  - `src/domain/`, `src/data/`, `src/lib/`, `src/test-support/fake-supabase.ts`.
- Migrations in `supabase/migrations/` (run in order, by hand in the SQL editor):
  1. `20261127120000_finance_schema.sql` — tables, RLS, `finance_load_snapshot`, `finance_apply_changes`.
  2. `20261127130000_fd_funding_account.sql` — `funding_account_id` on fixed deposits and an updated `finance_apply_changes`.
  3. `20261127140000_delete_account.sql` — `finance_delete_account()` (security definer; deletes the caller's `auth.users` row, which cascades to all finance tables).
- `finance_apply_changes` sends incremental row changes in a transaction and checks a per-user revision to reject stale writes. If a function gains a column, its recordset list in the SQL must be updated too, or the field is silently dropped.
- The Supabase project must expose the `public` schema (Settings → API). If PostgREST reports `PGRST002`, verify that and run `NOTIFY pgrst, 'reload schema';`.

## Implemented features

- Overview, transactions, savings accounts, fixed deposits, categories, reconciliations, backups/import, reports.
- Transaction form: Expense/Income/Transfer buttons, searchable category, category suggested from the last transaction with the same description, Save & add another, autofocus, Esc to cancel.
- Savings accounts display as `Bank •••• 1234` (`accountLabel()` in `src/domain/models.ts`).
- Fixed deposits require a funding savings account for new deposits; the principal reduces that account's balance (computed in SQL, not stored as a transaction, so it does not appear in the transactions list). Saving fails if the balance would go negative (checked against today). Closing a deposit does not return the principal.
- Year view: Overview, Transactions and report defaults follow a financial-year (Apr to Mar, default) or calendar-year mode (`src/lib/period.ts`, `PeriodToggle`, remembered in localStorage). DB queries take ISO date ranges (`getTransactions(start, end, search)`, `getPeriodSummary`, `getRecentTransactions`).
- Net worth chart on Overview (`src/domain/networth.ts`, `NetWorthChart`): month-end balances plus FD principal for 12 months; accounts count from their opening date; a closed FD is assumed paid out on its maturity date (no closed-on date is stored).
- Optional Google Tag Manager page views (`src/lib/analytics.ts`): off unless `VITE_GTM_ID` (`GTM-XXXXXXX`) is set, and nothing loads until the user clicks Allow (banner, or Settings → Account → Usage analytics). Pushes a `virtual_page_view` event with the screen's URL path to `dataLayer`; the GTM container must have a Custom Event trigger and a GA4 Event tag (steps in README). Set the ID as a Vercel Production env var.
- Reports: summary sentence, daily average, largest expense, category donut, weekday chart, monthly and category breakdowns.
- Settings (tabs): Categories, Backup & import, Account (edit full name, sign out on phones/installed app, delete account with type-DELETE confirmation).
- Routing uses `react-router` (`BrowserRouter` in `main.tsx`, routes in `AppShell`): `/overview`, `/transactions`, `/reports`, `/accounts`, `/deposits`, `/settings/:tab` (categories, backups, account); `/` and unknown paths redirect to `/overview`, `/settings` to the categories tab. The open transaction form is stored with the path it was opened on and only shows on that path, so back/forward never leaves a stray form or modal. `vercel.json` rewrites non-file paths to `index.html`; the PWA service worker already falls back to `index.html`. Page views and the browser tab title come from the path (`pageTitle`).
- Sign out placement is pure CSS: sidebar bottom account block in a normal browser; Settings → Account when `(display-mode: standalone)` or width ≤ 760px.
- PWA: install banner (`beforeinstallprompt`; iOS shows Add to Home Screen steps; hidden when standalone and for 30 days after dismissal), new-version banner (prompt mode), icons (coin-L favicon, 192/512, maskable, Apple touch).
- Footer shows release tag and short commit (`VITE_RELEASE_TAG`, `VITE_COMMIT_SHA`); no "Supabase" wording appears in user-visible text.
- Responsive: transaction tables become cards on phones; bottom nav fits six items.
- Year-wise CSV export, validated CSV import, AES-GCM encrypted backups.

## Deployment (important)

- Merging to `main` deploys to production. The only deploy path is `.github/workflows/deploy-vercel.yml`: lint, tests, `vercel deploy --prod` (Vercel builds remotely), then a GitHub release tagged `vYYYY.MM.DD-<run number>`. `vercel.json` disables Vercel's own Git deployments (no previews).
- Build happens on Vercel because `SB_URL` / `SB_ANON_KEY` are Sensitive variables that `vercel pull` cannot read (it wrote `[SENSITIVE]` placeholders and the app reported "not configured").
- Secrets: `VERCEL_TOKEN` (secret), `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (variables). A bad or wrong-scope token fails at "Could not retrieve Project Settings".
- Queued runs are cancelled when a newer one waits (concurrency group), so rapid merges may show "cancelled" runs and skip tag numbers; the newest run includes everything.
- Run a new migration in Supabase before merging the code that needs it.
- Latest known release at the time of writing: `v2026.11.27-26`. The live site is a Vercel project named `ledgerly`.

## Verification state

- 20 test files, 46 tests pass (`npm test`); `npm run lint` and `npm run build` pass. Tests use a real in-memory SQLite database with a fake Supabase client (`src/test-support/fake-supabase.ts`) and jsdom + Testing Library for components. The SQL functions are not tested outside a real Supabase project.
- The user confirmed on real devices: the FD funding migration and delete-account work, and the iPad/phone layouts are fine after the responsive fixes.
- UI was also checked in headless Chromium and WebKit with a fake signed-in session (route-mocked `finance_load_snapshot`, `finance_apply_changes`, and `/auth/v1/**`, plus a `sb-test-auth-token` localStorage entry and a dev server started with fake `SB_URL` / `SB_ANON_KEY`). Chromium cannot emulate `display-mode: standalone`; real installed-app mode was only simulated.

## Known gaps and open questions

- Editing the name of a Google account may be overwritten by Google on the next Google sign-in (unverified). Fix, if needed: store the edited name in a separate metadata field.
- iOS cannot detect "already installed" from a Safari tab, so the Add to Home Screen steps can appear after installing until dismissed.
- Existing accounts created before full names were collected have no name and show their email until one is saved in Settings → Account. The top-bar name label was removed; the name now shows in the sidebar block (hidden on phones and the installed app).
- `App.css` is 700+ lines with several override layers (a11y and responsive passes); splitting it was deliberately not done to avoid cascade regressions.
- The bundle contains the Supabase library's own internal strings (for example the `X-Supabase-Api-Version` header); only app-written UI text was changed.
- On a 320px-wide phone the first two bottom-nav labels sit close together.

## Working conventions with this user

- One branch and one PR per change (stack PRs when they depend on each other; retarget the next PR to `main` before merging it). Merge only when asked; after merging, they usually ask to delete the merged branches (local and remote).
- Commit messages and PR bodies end with the attribution lines the environment specifies. PR bodies say that merging deploys to production and creates a release tag, and call out required migrations.
- Be honest about what was not tested (real devices, real Supabase, Google sign-in).

## Continue safely

Check `git status` before making further changes. Do not commit credentials, financial records, CSV exports, backups, or browser auth tokens; The local `exports/` folder holds historical CSVs and stays out of Git through the `*.csv` rule in `.gitignore`. After a stale-write conflict, reload to fetch the latest Supabase revision. Preserve `.env.local` as ignored.
