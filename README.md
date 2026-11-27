# Ledgerly — Personal Finance Tracker

A private, cloud-backed PWA for recording INR expenses, income, transfers, savings accounts, and fixed deposits. Supabase PostgreSQL is the source of truth; Supabase Auth and row-level security isolate each user's records. The browser uses an in-memory SQLite database for calculations and keeps no persistent finance database locally. An internet connection is required to load and save records.

## Supabase setup

1. In Supabase, enable the Email auth provider. Set the Site URL to `http://localhost:5173` for local development.
2. In Project Settings → API, copy the Project URL and the publishable key (or legacy anon key). Never use a `service_role` or `sb_secret_` key in this browser app.
3. In Project Settings → API → Exposed schemas, include `public`. The app's RPC functions are in this schema; the finance tables remain protected by RLS and direct table grants are revoked.
4. Copy `.env.example` to `.env.local` and fill in the two values:

   ```powershell
   Copy-Item .env.example .env.local
   ```

5. Open Supabase SQL Editor and run [`supabase/migrations/20261127120000_finance_schema.sql`](./supabase/migrations/20261127120000_finance_schema.sql). It creates the finance tables, per-user RLS policies, and authenticated database functions.
6. Install and start the app:

   ```powershell
   npm install
   npm run dev
   ```

7. Create an account in Ledgerly, then confirm the email if Supabase email confirmation is enabled. Each account can access only its own finance records.

The client sends only changed rows to a transactional Supabase function. A per-user revision check rejects stale writes from another tab/device instead of overwriting newer data; reload the app to fetch the latest version after a conflict.

If PostgREST reports `PGRST002` or `pg_pgrst_no_exposed_schemas`, check that `public` is included in Exposed schemas, then run `NOTIFY pgrst, 'reload schema';` in SQL Editor and reload Ledgerly.

## Deploy to Vercel with GitHub Actions

1. Create a Vercel project for this repository. Link the project locally with the Vercel CLI (`vercel link`) to find its `orgId` and `projectId` in `.vercel/project.json`; `.vercel/` is ignored by Git.
2. In the Vercel project settings, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Production environment variables. Use the Supabase project URL and publishable/anon key, never a service-role key.
3. In the GitHub repository, open Settings → Secrets and variables → Actions:
   - Add `VERCEL_TOKEN` as a repository secret. Create the token in your Vercel account settings.
   - Add `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` as repository variables, using the `orgId` and `projectId` from `.vercel/project.json`.
4. Push to `main` to run the production deployment, or start **Deploy to Vercel** from the repository's Actions tab. The workflow runs lint, tests, and a production build before deploying the prebuilt output.
5. In Supabase Authentication URL Configuration, set the deployed app URL as the Site URL and allow the deployed URL as a redirect URL.

## Included workflows

- Add and edit dated expenses, income, and transfers. Daily expenses are restricted to the `CASH` account; transfers update both account balances without counting as income or expenses.
- Maintain savings accounts and FD references. Account numbers are masked in account views and are not included in transaction CSV files.
- Organize transactions with nested categories; archived categories remain available to existing records.
- Generate expense reports for an inclusive date range, filtered by category, with an option to include subcategories, monthly/category breakdowns, matching transactions, and CSV export.
- Review annual totals, category spending, account balances, and reported balance snapshots compared with recorded activity.
- Export transactions as year-wise CSV and import validated CSV data. Existing transaction IDs are skipped during import.
- Create and restore a full-database backup encrypted with AES-256-GCM and a passphrase.

See [PLAN.md](./PLAN.md) for the data model, workflows, and architecture.

## Data and privacy

Financial records are stored in Supabase and accessed only after sign-in. Every table is protected by row-level security, and database functions derive ownership from the authenticated user rather than trusting a client-supplied user ID. The publishable/anon key is intended for browser use; it is not an authorization boundary by itself. Never place service-role or secret keys in frontend configuration.

The app's `.env.local` file is ignored by Git. Supabase is a cloud service, so review its privacy, retention, and free-tier policies for your needs. Account numbers are sensitive: never store banking passwords, PINs, CVVs, or online-banking credentials. Download encrypted backups regularly, keep the passphrase separately, and verify that backups can be restored. The app cannot recover a lost passphrase.

Keep downloaded CSV exports, `.pfbackup` files, and source financial records out of GitHub. `.gitignore` excludes these files, but check `git status` before committing.

## Historical data

The CSV importer accepts the app's canonical transaction format, not arbitrary database dumps. Convert a source database to the documented fields and ensure account/category IDs map to records in Ledgerly before importing. Validate a small sample against source totals before doing the one-time bulk import.

