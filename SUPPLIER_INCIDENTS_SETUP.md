# Supplier Incidents — first application integration

This adds an owner-only incident entry/history page, Supabase storage, and real
Hindsight retention with a visible retry action. It does not yet add the supplier
advisor, recall UI, or editing an incident/resolution after creation.

## Apply the patch in your local project

The patch targets GodownIQ commit 157a561dbf707d7ccc5b615c90c2c4d968e67145.
It excludes package manifests/lockfiles because you have already installed the SDK.
It does not modify your `.env` or `scripts/test-hindsight.ts`.

From the project root (the directory containing frontend, backend and supabase):

```powershell
git apply --check "$env:USERPROFILE\Downloads\godowniq-supplier-incidents.patch"
git apply "$env:USERPROFILE\Downloads\godowniq-supplier-incidents.patch"
```

Adjust the download path if you saved it elsewhere. If the check reports a
conflict, stop and share the error; do not overwrite local work or force the patch.

## Database

Use your development/demo Supabase project. With migrations 0001 through 0005
already applied, open SQL Editor and run the complete contents of
`supabase/migrations/0006_supplier_incidents.sql` once. This creates a new table and
owner policies; it does not change existing purchase records. This app is designed
for a single warehouse per deployment, not multiple unrelated businesses.

## Backend settings

Keep these in `backend/.env` with the existing Supabase/Gemini settings:

```dotenv
HINDSIGHT_API_URL=https://api.hindsight.vectorize.io
HINDSIGHT_API_KEY=YOUR_PRIVATE_KEY
HINDSIGHT_BANK_ID=godowniq-demo
```

The feature uses bank `godowniq-demo-supplier-incidents`, separate from the earlier
connection-test bank. Keep this bank ID stable after syncing. The SDK must be
installed in the backend workspace (verified against version 0.10.1):

```powershell
npm install @vectorize-io/hindsight-client --workspace backend
```

The URL and key stay on the backend. No secret should use a VITE_ prefix.

## Run and try it

From the project root, use two terminals:

```powershell
npm run dev:backend
```

```powershell
npm run dev:frontend
```

Restart existing processes so the backend loads the new environment settings.
Sign in as an approved owner and open **Supplier Incidents**. Add a supplier using
the existing Add Purchase flow if none exists.

Enter this synthetic example and select **This is synthetic data for a demo**:

- Incident date: 2026-09-24
- Problem type: Damaged goods
- Problem: Of 100 rice bags delivered on 2026-09-24, 10 bags were damaged.
- Resolution: The supplier issued a credit note for the 10 damaged bags.
- Resolution date: 2026-09-27

Click **Save incident & remember**. First the database confirms the record; then
memory sync runs. It should change from **Saved · memory pending** to **Remembered**.
Reload the page to verify persistence. In Hindsight, open the supplier-incidents
bank and inspect document `supplier-incident-<record ID>`.

If Hindsight is unavailable or the key is missing, the database record remains
saved. Correct the setting, restart the backend, and click **Retry memory sync**.
A stable document ID is reused, and an already-synced record does not sync again.
Do not create a second incident just to retry its memory.

Date-only events use an explicit Asia/Kolkata calendar date and a noon timestamp
as an indexing anchor, not as the actual time of the incident. The text contains
both event and resolution dates, avoiding reliance on the time of the API request.

## Verification and limitations

Run `npm run build:frontend`, `npm run build:backend`, and `npm run test:backend`.
Existing alert tests require Supabase environment values to initialize their module;
test-only dummy values are sufficient for those unit tests and do not verify live
Supabase access. New tests mock Hindsight and check date validation, secret-safe
errors, timeout behavior, stable source IDs and retry status handling.

No live Supabase migration or Hindsight request has been executed from this patch's
development environment. Your previous connection test verifies your cloud setup,
but the new UI/database workflow still needs the above local run. No GitHub push or
deployment has been performed.
