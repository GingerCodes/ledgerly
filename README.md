# Ledgerly — Personal Finance Tracker

A private, cloud-backed, installable PWA for recording INR expenses, income, transfers, savings accounts, and fixed deposits. Supabase PostgreSQL is the source of truth; Supabase Auth and row-level security isolate each user's records. The browser uses an in-memory SQLite database for calculations and keeps no persistent finance database locally. An internet connection is required to load and save records.

## Supabase setup

1. In Supabase, enable the Email auth provider. Set the Site URL to `http://localhost:5173` for local development.
2. In Project Settings → API, copy the Project URL and the publishable key (or legacy anon key). Never use a `service_role` or `sb_secret_` key in this browser app.
3. In Project Settings → API → Exposed schemas, include `public`. The app's RPC functions are in this schema; the finance tables remain protected by RLS and direct table grants are revoked.
4. Copy `.env.example` to `.env.local` and fill in the two values:

   ```powershell
   Copy-Item .env.example .env.local
   ```

5. Open Supabase SQL Editor and run [`supabase/migrations/20261127120000_finance_schema.sql`](./supabase/migrations/20261127120000_finance_schema.sql). It creates the finance tables, per-user RLS policies, and authenticated database functions.
   Then run [`supabase/migrations/20261127130000_fd_funding_account.sql`](./supabase/migrations/20261127130000_fd_funding_account.sql). It adds the savings account that funds each fixed deposit (the principal is debited from it). Existing projects must run it before using this version, or saving deposits will fail.
   Then run [`supabase/migrations/20261127140000_delete_account.sql`](./supabase/migrations/20261127140000_delete_account.sql). It adds the function behind Settings → Account → Delete account; without it that button shows an error.
   Finally run [`supabase/migrations/20261128100000_require_current_client.sql`](./supabase/migrations/20261128100000_require_current_client.sql). It makes the server refuse saves from older cached copies of the app (they are told to reload) so they cannot erase newer columns. **Deploy the app first, then run this one.** Whenever a later migration adds a column, raise `CLIENT_API_VERSION` in `src/data/finance-database.ts` and the number in this function's check.
   Then run [`supabase/migrations/20261128110000_fd_closed_date.sql`](./supabase/migrations/20261128110000_fd_closed_date.sql). It adds the date a fixed deposit was closed and raises the minimum app version to 3. **Deploy the app first, then run it.**
   Then run [`supabase/migrations/20261128120000_expense_any_account.sql`](./supabase/migrations/20261128120000_expense_any_account.sql). It lets expenses be paid from any account, not only Cash.
   Last, run [`supabase/migrations/20261128130000_fd_interest_payout.sql`](./supabase/migrations/20261128130000_fd_interest_payout.sql). It allows fixed deposits whose interest is paid out (monthly, quarterly, half-yearly or yearly) and requires app version 4. Deploy the app first.
6. Install and start the app:

   ```powershell
   npm install
   npm run dev
   ```

7. Create an account in Ledgerly (it asks for your full name), then confirm the email if Supabase email confirmation is enabled. Each account can access only its own finance records. The full name is stored as `full_name` in the user's Supabase Auth metadata; no finance-table migration is involved.

The client sends only changed rows to a transactional Supabase function. A per-user revision check rejects stale writes from another tab/device instead of overwriting newer data; reload the app to fetch the latest version after a conflict.

If PostgREST reports `PGRST002` or `pg_pgrst_no_exposed_schemas`, check that `public` is included in Exposed schemas, then run `NOTIFY pgrst, 'reload schema';` in SQL Editor and reload Ledgerly.

## Google sign-in

Email/password sign-in remains available. To enable **Continue with Google**:

1. In [Google Auth Platform](https://console.cloud.google.com/auth/overview), select or create a Google Cloud project and configure branding and audience. If the app is in testing mode, add your Google account as a test user. Under Data Access, configure the `openid`, `email`, and `profile` scopes.
2. Create an OAuth client of type **Web application**. Add the app origins (for example, `http://localhost:5173` and your deployed Vercel origin) under Authorized JavaScript origins. Under Authorized redirect URIs, add the callback URL shown on the Google provider page in Supabase, typically `https://<project-ref>.supabase.co/auth/v1/callback`.
3. In Supabase Authentication → Sign In / Providers → Google, enable Google and enter the Google OAuth client ID and client secret. Keep the client secret in Supabase; do not put it in the app, GitHub Actions, or Vercel environment variables.
4. In Supabase Authentication → URL Configuration, add the app's local and deployed URLs (for example, `http://localhost:5173/` and `https://your-app.vercel.app/`) to the redirect allow list. Set the Site URL as appropriate for the deployed app.
5. Restart the app if necessary and try **Continue with Google**. Supabase automatically links identities with the same verified email address; a different email creates a separate account with separate finance records. The full name comes from the Google (OpenID) profile through the `openid`, `email`, and `profile` scopes. A name edited in Settings → Account may be overwritten by Google on the next Google sign-in; this has not been verified.

See the [Supabase Google sign-in guide](https://supabase.com/docs/guides/auth/social-sign-in/auth-google) for the current provider setup.

## Deploy to Vercel with GitHub Actions

Production is deployed only by the GitHub Action in [`.github/workflows/deploy-vercel.yml`](./.github/workflows/deploy-vercel.yml), and only when a change is merged to `main`. [`vercel.json`](./vercel.json) turns off Vercel's own Git deployments, so there are no PR previews and no second production build.

1. Create a Vercel project for this repository. Link the project locally with the Vercel CLI (`vercel link`) to find its `orgId` and `projectId` in `.vercel/project.json`; `.vercel/` is ignored by Git.
2. In the Vercel project settings, add `SB_URL` and `SB_ANON_KEY` as Production environment variables. Use the Supabase project URL and publishable/anon key, never a service-role key. They may be marked **Sensitive**: the workflow builds on Vercel (not on the GitHub runner), because `vercel pull` cannot read Sensitive values and would bake `[SENSITIVE]` placeholders into the bundle.
3. In the GitHub repository, open Settings → Secrets and variables → Actions:
   - Add `VERCEL_TOKEN` as a repository secret. Create the token in your Vercel account settings with access to the project's team.
   - Add `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` as repository variables, using the `orgId` and `projectId` from `.vercel/project.json`.
4. Merge to `main` to deploy. The workflow runs lint and tests, then runs `vercel deploy --prod` (Vercel builds the project), then creates a GitHub release tagged `vYYYY.MM.DD-<run number>`. A deploy runs for every merge, but a queued run is cancelled when a newer one is waiting; the newest run always contains all merged changes.
5. The tag and commit are passed to the build as `VITE_RELEASE_TAG` and `VITE_COMMIT_SHA` and shown in the footer (for example `v2026.11.27-26 · 1d347f9`; local builds show `dev`).
6. In Supabase Authentication URL Configuration, set the deployed app URL as the Site URL and allow the deployed URL as a redirect URL. Google sign-in always returns to `/` (the app then redirects to `/overview`), so only the root URL needs to be on the allow list.
   `vercel.json` rewrites every path that is not a file to `index.html`, which is what makes deep links such as `/settings/account` work on a refresh.
7. Run any new SQL migration in Supabase **before** merging the change that needs it, because the merge deploys immediately.

The workflow limits secrets to the steps that use them, does not persist git credentials after checkout, and pins the Vercel CLI version.

## Security settings

**Headers.** `vercel.json` sends a Content-Security-Policy and other headers on every response: the page cannot be shown inside another site's frame, scripts load only from the app itself and Google Tag Manager, and network calls go only to the app, `*.supabase.co` and Google Analytics. If you move Supabase to a custom domain or add another service, add its address to `connect-src` there, or the browser will block the calls.

**Supabase (set in the dashboard, not in code).** The sign-up form asks for a 12-character password, but anyone can call Supabase directly, so also set these under Authentication:
- Minimum password length 12, and turn on leaked-password protection.
- Require email confirmation, and turn on CAPTCHA (hCaptcha or Turnstile) for sign-up and sign-in.
- Review the rate limits, and use your own SMTP provider for reliable sign-up emails.

**Tag Manager.** A container can run any script in the app's page, which can read the signed-in session and the finance data. Keep it safe:
- Turn on two-step verification for every Google account that can publish, and give publish rights to as few people as possible.
- Use only the built-in GA4 tags. Do not add Custom HTML tags or Custom JavaScript variables (the Content-Security-Policy also blocks inline scripts, so such tags would not work).
- Review each version in Preview before publishing.

## Google Analytics through Tag Manager (optional)

Page-view analytics is off unless you set `VITE_GTM_ID` to a Google Tag Manager container ID such as `GTM-XXXXXXX` (it is public, not a secret). For the deployed app add it as a Production environment variable in the Vercel project; for local development put it in `.env.local`.

- Nothing is loaded and nothing is sent until the user clicks **Allow** on the "Help improve Ledgerly?" banner. They can change their mind in Settings → Account → Usage analytics. Saying no or ignoring the banner means no Google script is ever requested. After a "no" following an earlier "yes", the app stops sending events and tells GTM `analytics_storage: denied`; the already-loaded container stays in memory until the page reloads.
- The app pushes one `virtual_page_view` event to `dataLayer` per screen (it has no URL router), with `page_path`, `page_title` and `page_location`. Paths are fixed: `/sign-in`, `/sign-up`, `/overview`, `/transactions`, `/reports`, `/accounts` (cash, savings accounts and fixed deposits; `/deposits` redirects to it), `/settings/categories`, `/settings/backups`, `/settings/account`. Names, emails, amounts, descriptions and user IDs are never sent.
- Configure the container once (GTM Preview mode helps to check it):
  1. Add a **Google tag** with your GA4 measurement ID, trigger **Initialization - All Pages**, and under configuration settings add the parameter `send_page_view` = `false`.
  2. Create a **Custom Event** trigger with the event name `virtual_page_view`.
  3. Create three **Data Layer Variables**: `page_path`, `page_title`, `page_location`.
  4. Add a **Google Analytics: GA4 Event** tag with event name `page_view`, the three parameters set from those variables, and the custom event trigger.
  5. Publish the container.
- Disable Google signals and ad personalization in the GA4 property settings, and mention Google Analytics in your privacy policy: Google still receives the usual request data (IP address, browser, device) once a user allows it.

## Included workflows

- Add and edit dated expenses, income, and transfers. The type is chosen with Expense / Income / Transfer buttons; the category field is searchable and is suggested from earlier transactions with the same description; **Save & add another** keeps the form open for fast entry. Daily expenses are restricted to the `CASH` account; transfers update both account balances without counting as income or expenses.
- Maintain savings accounts and FD references. Savings accounts are shown as bank plus last four digits (for example `HDFC •••• 1234`) in every dropdown. Account numbers are masked in account views and are not included in transaction CSV files.
- Fixed deposits can compound, pay simple interest at maturity, or **pay interest out** monthly, quarterly, half-yearly or yearly. A payout deposit returns only its principal at maturity; each payout is added with **Record interest** (date and amount editable) as income in the receiving account, and Overview reminds you of payouts that are due.
- Create fixed deposits funded from a savings account: the principal is debited from that account's balance (and from balance-snapshot comparisons from the deposit's start date), and saving fails if the account would go negative. Older deposits without a funding account keep working unchanged. **Closing** a deposit asks when it closed, which account received the money, and the interest paid: the principal goes back to that account from the closing date, and the interest is recorded there as income (so principal is never counted as income).
- Organize transactions with nested categories; archived categories remain available to existing records.
- Generate expense reports for an inclusive date range, filtered by category, with an option to include subcategories. Results include a plain-English summary, daily average and largest expense, a category donut with shares, a spending-by-weekday chart, monthly/category breakdowns, matching transactions, and CSV export.
- Switch every year-based view (Overview, Transactions, Reports defaults, CSV export names) between the Indian **financial year** (1 April to 31 March, the default) and the **calendar year**. Pick it once in Settings → Account → Year view; it is saved on your account (as `year_view` in your Supabase Auth profile data), so it applies on every device. Overview is the exception: it shows one month at a time, with previous/next arrows and a month picker to look at earlier months.
- The Overview shows one month at a time: net worth (with a 12-month line behind the card, from recorded cash, savings and fixed-deposit principal; deposit interest is not included), income, expenses and how much you saved, each compared with the previous month. Below: a spending doughnut by category with change since last month, daily average, largest expense and a month-end projection; fixed deposits maturing in the next 90 days; and your 10 latest transactions.
- Review period totals, category spending, account balances, and reported balance snapshots compared with recorded activity.
- Export transactions as year-wise CSV and import validated CSV data. Existing transaction IDs are skipped during import.
- Create and restore a full-database backup encrypted with AES-256-GCM and a passphrase.
- Every screen has its own URL, so links, bookmarks, refresh and the browser's back and forward buttons work: `/overview`, `/transactions`, `/reports`, `/accounts` (cash, savings accounts and fixed deposits; `/deposits` redirects to it), `/settings/categories`, `/settings/backups`, `/settings/account`. `/` and unknown paths go to `/overview`. The browser tab title follows the screen.
- **Settings** groups three tabs: Categories, Backup & import, and Account. Account lets you update your full name, choose the year view, sign out (installed app and phones), and permanently delete your account and all its data; the same email can then register again as a brand-new account.
- Install the app: a banner offers installation in a browser (native prompt on Chrome, Edge, and Android; Add to Home Screen steps on iOS) and is hidden in the installed app and for 30 days after "Not now". A "new version available" banner offers a reload after each deployment.
- Choose a colour theme and a mode in Settings → Account → Theme: **Classic** (green) or **Aurora** (indigo, violet and mint, with gradients and soft glow), each in **Light**, **Dark** or **Match device**. The choices are saved on the device (browser storage) and applied before the page paints, so there is no flash of the wrong colours.
- Layouts are responsive: on phones the bottom bar holds Overview, Transactions and Reports, a hamburger button in the top bar opens a menu with Accounts and Settings, and transaction tables become cards. Sign out and the signed-in name sit at the bottom of the sidebar in a browser, and in Settings → Account in the installed app and on phones.

See [PLAN.md](./PLAN.md) for the data model, workflows, and architecture, and [SESSION_CONTEXT.md](./SESSION_CONTEXT.md) for the current implementation notes.

## Project structure

```text
src/App.tsx            auth gate -> database gate -> <AppShell/> (inside a BrowserRouter from main.tsx)
src/app/               AppShell (sidebar, top bar, routes), FinanceProvider and finance-context
                       (useFinance, useFinanceQuery), useAuthSession, useFinanceDatabase, navigation (paths, page titles)
src/components/        shared UI: Notice, EmptyState, ComboBox, TransactionTable, Logo, InstallPrompt
src/features/<name>/   one folder per area: auth, overview, transactions, reports, accounts,
                       deposits, categories, backup, settings (page, forms, panels)
src/domain/            finance rules and report summaries (no UI, no I/O)
src/data/              in-memory SQLite + Supabase persistence, encrypted backup, CSV, client setup
src/lib/               dates, formatting, version, install state, user name helpers
src/test-support/      fake Supabase client used by tests
supabase/migrations/   SQL schema, RLS, and RPC functions, applied in file-name order
```

## Development

```powershell
npm run dev      # Vite dev server on http://localhost:5173
npm run lint     # oxlint
npm test         # Vitest (node environment; jsdom for files marked "@vitest-environment jsdom")
npm run build    # type-check and production build
```

Tests run the real in-memory SQLite layer against a fake Supabase client (`src/test-support/fake-supabase.ts`); the SQL functions themselves are only exercised against a real Supabase project. Merges to `main` deploy to production, so work on a branch and open a pull request.

The icons in `public/` (favicon, PWA, maskable, and Apple touch icons) are rendered from the same SVG artwork (a mint coin with an L on a dark emerald tile); the in-app logo uses `favicon.svg`.

## Data and privacy

Financial records are stored in Supabase and accessed only after sign-in. Every table is protected by row-level security, and database functions derive ownership from the authenticated user rather than trusting a client-supplied user ID. The publishable/anon key is intended for browser use; it is not an authorization boundary by itself. Never place service-role or secret keys in frontend configuration.

Deleting your account (Settings → Account) calls a database function that removes your Supabase Auth user, which cascades to every finance table, so all your data is permanently erased and the email can be reused. Download an encrypted backup first if you may want the data later. The app's `.env.local` file is ignored by Git. Supabase is a cloud service, so review its privacy, retention, and free-tier policies for your needs. Account numbers are sensitive: never store banking passwords, PINs, CVVs, or online-banking credentials. Download encrypted backups regularly, keep the passphrase separately, and verify that backups can be restored. The app cannot recover a lost passphrase.

If analytics is enabled (see above) Google only receives screen names and the standard browser data it collects; it is off until the user agrees.

Keep downloaded CSV exports, `.pfbackup` files, and source financial records out of GitHub. `.gitignore` excludes these files, but check `git status` before committing.

## Historical data

The CSV importer accepts the app's canonical transaction format, not arbitrary database dumps. Convert a source database to the documented fields and ensure account/category IDs map to records in Ledgerly before importing. Validate a small sample against source totals before doing the one-time bulk import.

