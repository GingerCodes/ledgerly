# Personal Finance Tracking Agent — Plan

## 1. Purpose

Create a private cloud-backed PWA for organizing personal financial records. It will:

- Capture and edit daily cash expenses.
- Track savings accounts and fixed deposits (FDs).
- Organize transactions with hierarchical categories.
- Provide summaries and help reconcile recorded balances.
- Migrate historical data from the existing database once during setup.

The agent is for recording and analysis only. It must not initiate payments, move funds, or present estimates as confirmed bank balances.

## 2. Scope and assumptions

- All amounts are in INR; currency does not need to be stored per transaction.
- Daily expenses are paid from a dedicated cash-on-hand account and are not linked to bank accounts.
- Bank withdrawals that replenish cash are transfers, not expenses. Record the expense when cash is spent.
- Historical database import is a one-time initial population task. Daily activity is entered or edited through the agent.
- Transaction exports are split into year-wise files, based on transaction date; Supabase PostgreSQL remains the source of truth.
- Savings-account and FD account/reference numbers are tracked as data, not as credentials.

## 3. Data organization

Use Supabase PostgreSQL as the application's source of truth, with Supabase Auth and row-level security (RLS) isolating each user's records. In the browser PWA, SQLite runs in memory through `sql.js` for calculations and local validation; it is not persisted across reloads. An internet connection is required to load and save finance records. The app applies incremental changes through authenticated database functions and checks a per-user revision to avoid silently overwriting edits from another session. Provide year-wise UTF-8 CSV downloads and passphrase-encrypted database backups for portability:

```text
transactions-2026.csv         # Downloaded annual export
finance-backup-2026-01-31.pfbackup  # Encrypted full database backup
```

Exports contain transactions for one calendar year, based on transaction date. If an edited transaction's date changes year, it appears in the corresponding year's next export. The database retains the stable transaction ID.

### Core records

- **Transactions:** stable ID, date (`YYYY-MM-DD`), type (expense, income, transfer), account reference, description, positive INR amount, optional category, notes, and created/updated timestamps.
- **Accounts:** stable ID, name, type, institution, account number, status, opening date, and opening balance. Include a `CASH` account for cash on hand; it has no account number. Store bank account numbers as text to preserve leading zeroes. Do not repeat account numbers in transactions.
- **Categories:** stable ID, name, parent category, and status. Categories can be nested to any depth; transactions reference the most specific category.
- **Fixed deposits:** stable ID, institution, FD account/reference number, principal, start and maturity dates, interest rate and terms, linked (maturity) account, funding savings account, maturity instruction, status, and notes.
- **Balance snapshots:** stable ID, account, date, reported balance, source, and notes. Snapshots are comparisons, not replacements for transaction history.
- **Edit history (optional):** transaction ID, edit time, changed fields, old/new values, and reason. Do not copy account numbers into the log.

Transfers must identify both source and destination accounts, either in one transfer record or in linked ledger entries. They update balances but are excluded from expense and income totals. Store account numbers as sensitive data; never store PINs, passwords, CVVs, or online-banking credentials.

### Year-wise CSV export

Suggested transaction export columns:

```text
transaction_id,date,type,account_id,from_account_id,to_account_id,description,amount,category_id,notes,created_at,updated_at
```

CSV is an export and interchange format, not a second editable source of truth once the app uses Supabase. Exports must not include account numbers. The app's CSV importer validates the canonical transaction columns, account/category IDs, dates, and amounts before importing; duplicate transaction IDs are skipped.

## 4. Agent behavior and workflows

### Daily transaction capture

1. Ask for the date, amount, description, and category if not supplied.
2. Record ordinary daily expenses against `CASH`.
3. Use the existing category hierarchy. If the category is unclear, ask or leave it uncategorized for review rather than guessing.
4. Confirm the transaction details before saving when the input is ambiguous.
5. Save to Supabase and confirm the transaction ID and summary. Refresh the year-wise CSV export when requested or as part of a defined export workflow.

### Transaction editing

1. Locate the transaction by ID or by a sufficiently specific combination of date, amount, and description.
2. If multiple matches exist, ask which one to change.
3. Show the proposed changes before applying them when the target or intended value is ambiguous.
4. Preserve the transaction ID and update Supabase. A year-wise CSV export will place it under the updated transaction date.
5. Optionally record the edit in the database's change history.

### Cash and bank transfers

- A bank cash withdrawal reduces the bank balance and increases the `CASH` balance.
- Do not categorize that withdrawal as an expense.
- Cash purchases reduce `CASH` and count as expenses under their selected categories.
- Reports must avoid double-counting transfers as income or spending.

### Savings and FD tracking

- Track savings transactions and bank-reported balance snapshots separately.
- Store FD principal, dates, rate, terms, linked account, and maturity instructions.
- A new FD is funded from a savings account: its principal is debited from that account's balance (computed from the deposit, not stored as a transaction) and the save is rejected if the account would go negative. Closing an FD does not return the principal; record the maturity proceeds as income or a transfer.
- Provide maturity reminders and balance summaries.
- Do not infer missing FD terms or claim projected interest is an exact payout.

### Reporting

Support summaries by date range, year, category path, account, and transaction type. Separate expenses, income, and transfers. Clearly distinguish recorded transaction totals, reported balances, and calculated estimates.

## 5. Mobile-ready application architecture

- Use Supabase as the cloud source of truth. A network connection is required for finance data; the browser keeps only an in-memory working copy.
- Require Supabase Auth and RLS for all finance records. Never embed a service-role/secret key in the browser; use only the publishable/anon key.
- Keep the data model, validation rules, and finance operations independent of the user interface. Put persistence behind a repository/data-access boundary so a future mobile UI can use the same domain rules.
- Use explicit database schema migrations and stable IDs from the beginning.
- Support export and restore workflows. Backups containing financial records must be encrypted and stored separately from source code.
- Use optimistic revision checks so stale sessions cannot silently overwrite newer data. Reload on conflict before retrying.
- Expose the `public` schema to Supabase's Data API so the authenticated RPC functions are callable. Keep direct table grants revoked and use RLS; schema exposure alone must not grant access to users' finance records.
- Keep GitHub repositories limited to application source, documentation, and non-sensitive test fixtures. Never commit the live database, CSV exports, account numbers, or backups. A private GitHub repository is not a substitute for an encrypted backup.

### Implemented backend

- Supabase Auth provides email/password and Google sessions. The user's full name is collected at registration (or taken from the Google profile) and stored as `full_name` user metadata; it can be edited in Settings → Account. The browser uses only the publishable/anon key (`SB_URL` / `SB_ANON_KEY`); the service-role key is never used in client code.
- The migrations create per-user finance tables with RLS and three authenticated RPC functions: `finance_load_snapshot`, `finance_apply_changes`, and `finance_delete_account` (deletes the caller's auth user, cascading to all of their finance data and freeing the email for a fresh sign-up).
- `finance_apply_changes` applies only changed rows in one transaction and checks the user's revision to reject stale edits from another session.
- SQLite in `sql.js` is an in-memory query/calculation layer. Supabase PostgreSQL is the persistent source of truth; internet access is required for finance data.
- The PWA includes nested categories, cash/savings accounts, transactions, fixed deposits (funded from a savings account), balance snapshots, period/category reports with insights and charts, annual CSV import/export, and encrypted backup/restore.
- Settings groups Categories, Backup & import, and Account (edit name, sign out, delete account). The app offers installation in browsers, shows a "new version available" banner after each deployment, and shows the release tag and commit in the footer.

### Application structure and delivery

- Front end modules: `src/app` (shell, shared finance context, auth and database hooks), `src/features/<area>` (pages, forms, panels), `src/components`, `src/domain` (rules, no I/O), `src/data` (SQLite + Supabase persistence), `src/lib`. See README for the full map.
- Merging to `main` deploys to production through one GitHub Action (lint, tests, remote Vercel build, release tag). SQL migrations are applied by hand in Supabase before merging code that needs them.

## 6. Required agent skills

1. **Daily transaction capture** — gather missing details, apply the cash-account default for expenses, assign an ID, and save to Supabase.
2. **Transaction search and editing** — find records unambiguously, update them safely, refresh year-wise exports when needed, and report the result.
3. **Hierarchical categorization** — use and maintain the category tree, ask about uncertain classifications, and support uncategorized review.
4. **Account and cash tracking** — maintain account references, distinguish cash from bank activity, and model withdrawals as transfers.
5. **Savings reconciliation** — compare recorded transactions with user-provided balance snapshots and explain differences without silently changing data.
6. **FD tracking** — manage FD details and maturity dates, and provide clearly labeled projections only when terms are available.
7. **Reporting** — produce period and category summaries without double-counting transfers.
8. **One-time historical migration** — inspect the source schema, map fields, populate and validate Supabase, and produce year-wise CSV exports. This skill is used during setup, not for routine daily entry.

## 7. Historical data migration

1. Identify the source database type, schema, date range, and existing account/category conventions.
2. Map source records to the target fields and document unresolved or ambiguous values.
3. Convert a small sample first and compare record counts, totals, dates, and categories with the source.
4. Populate Supabase and generate year-wise CSV exports.
5. Validate the complete conversion and retain an untouched backup of the original database.
6. Do not invent missing transaction details; preserve them as unknown or flag them for review.

## 8. Privacy and data safety

- Financial data is stored in the user's Supabase project. Review the provider's privacy, retention, and free-tier policies.
- RLS must limit every read and write to `auth.uid()`; server functions must derive ownership from the signed-in user and never trust a client-supplied owner ID.
- Use the publishable/anon key in the client only. Never put a service-role/secret key in source code or frontend environment variables.
- Account numbers are sensitive: protect access to the Supabase account and use device encryption for devices used to access it.
- Never put transaction history, account numbers, database files, CSV exports, or backups in Git or agent/skill instruction files.
- Use encrypted backups stored separately from the device and source repository; periodically verify that a backup can be restored.
- Do not include full account numbers in routine summaries; use account names or masked numbers where practical.

## 9. Suggested implementation phases

1. **Agree on schema:** confirm source database details, category structure, account types, and FD fields.
2. **Build the cloud data layer:** create the Supabase schema, RLS policies, validation rules, migration support, and year-wise CSV export.
3. **Migrate history once:** convert and validate historical records.
4. **Implement daily workflows:** capture, search, edit, categorize, and handle cash transfers.
5. **Add balances and FDs:** record snapshots, FD terms, and maturity dates.
6. **Add reporting and validation:** check totals, duplicate IDs, missing categories, invalid dates, and reconciliation differences.
7. **Prepare for mobile:** keep domain and persistence interfaces UI-independent and reuse the authenticated Supabase backend.

## 10. Acceptance checks

- A cash purchase appears as an expense from `CASH`, not from a bank account.
- A bank withdrawal into cash changes both account balances but is excluded from expense totals.
- Supabase is the source of truth; exports are split by transaction year and retain stable unique IDs.
- Each authenticated user can only read and modify their own finance records; stale concurrent writes are detected rather than silently replacing newer data.
- Editing a transaction updates the intended record; ambiguous matches require clarification.
- Category paths can have multiple levels and appear correctly in reports.
- Savings account and FD account numbers are preserved as text and are not repeated in transaction rows.
- Historical migration totals and record counts are checked against the source before the converted data is used.
- Financial records and account numbers are excluded from Git, and an encrypted backup can be restored.
