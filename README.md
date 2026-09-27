# GodownIQ

**A warehouse supplier advisor that remembers incidents and the outcomes of owner decisions.**

Built for the Hack With Hyderabad 3.0 business-workflow track. GodownIQ combines everyday warehouse operations with Hindsight-backed supplier memory and Gemini-generated, source-linked advice.

## The problem

Warehouse owners track purchases in bills and spreadsheets, but supplier experience often stays in someone's memory. A late delivery, damaged shipment, or failed corrective action can be forgotten before the next order. A generic assistant cannot account for that history unless it is supplied again.

GodownIQ records those experiences, recalls relevant history for the selected supplier, and helps the owner decide what to check before ordering again. The owner remains responsible for the decision.

## What is implemented

| Feature | Workflow |
| --- | --- |
| Supplier Incidents | Record a dated delay, shortage, damage, or other issue, with an optional resolution. Save to Supabase and sync to Hindsight. |
| Supplier Advisor | Ask about a supplier; view recalled source records alongside an assessment, risks, suggested actions, and questions to confirm. |
| Outcome Feedback | Link an action and its observed result to an incident. Retain that owner-reported outcome so later advice can use it. |
| Warehouse operations | Purchase entry, bill-photo parsing, inventory, expenses, payments, supplier price comparisons, alerts, reports, and forecasts. |
| Optional WhatsApp | Twilio integration, disabled by default. Not needed for the supplier-memory demo. |

The three supplier-memory workflows are owner-only. This app is designed for one warehouse per deployment.

## How Hindsight is used

1. **Retain incidents:** the API saves the original record in Supabase, then separately syncs its text and metadata through the Hindsight client. A failed sync leaves the saved record available for retry.
2. **Recall history:** the advisor queries Hindsight with strict supplier-ID and demo/real tags. It also makes an outcome-specific recall so action results can contribute evidence.
3. **Verify sources:** recalled document IDs are matched against Supabase records for the selected supplier and data mode. The backend checks dates and passes the original source records to Gemini.
4. **Generate advice:** Gemini returns structured advice with evidence references. The backend validates the response and references before displaying it with source cards.
5. **Retain outcomes:** the owner records what they actually did and what happened. After successful sync, a fresh advisor question can recall that outcome.

The shared memory bank is `<HINDSIGHT_BANK_ID>-supplier-incidents` (default: `godowniq-demo-supplier-incidents`). Incident documents use `supplier-incident-<id>` and outcome documents use `supplier-outcome-<id>`. Stable document IDs make retries target the same record. Both use supplier and data-mode tags; outcomes also use the `outcome` tag.

Hindsight supplies persistent retrieval context; this workflow does **not** train model weights. Supabase remains the source of the original records. The app uses Hindsight `retain` and `recall`, followed by Gemini for advice.

### Behavior and limitations

- Demo mode recalls **demo records only**; real mode recalls **real records only**.
- No matching verified memory means no supplier-specific recommendation. Missing history is not proof of reliability.
- If Hindsight is unavailable, the advisor reports that it cannot recall history. If Gemini is unavailable, verified evidence can still be displayed.
- The “without supplier history” comparison is a fixed generic checklist, not a second AI response or a measured benchmark.
- Outcomes are owner-reported observations, not proof that an action caused a result or guarantees about future deliveries.
- Recording an outcome does not update an already displayed answer; ask again after syncing. Retrieval may not return every saved record.
- The system does not automatically place orders or make payments. Source-linked AI advice still requires human review.

## Stack and source map

React, TypeScript, Vite, Tailwind CSS, and Recharts on the frontend; Express and TypeScript on the backend; Supabase Postgres/Auth; Hindsight memory; Google Gemini; optional Twilio.

| Source | Purpose |
| --- | --- |
| [frontend/src/pages/SupplierIncidents.tsx](frontend/src/pages/SupplierIncidents.tsx) | Incident capture and sync status |
| [frontend/src/pages/SupplierAdvisor.tsx](frontend/src/pages/SupplierAdvisor.tsx) | Advice and evidence UI |
| [frontend/src/components/SupplierOutcomeFeedback.tsx](frontend/src/components/SupplierOutcomeFeedback.tsx) | Outcome capture and retry |
| [backend/src/services/supplierMemoryService.ts](backend/src/services/supplierMemoryService.ts) | Incident retention |
| [backend/src/services/supplierAdvisorService.ts](backend/src/services/supplierAdvisorService.ts) | Recall, source verification, and Gemini generation |
| [backend/src/services/supplierOutcomeMemoryService.ts](backend/src/services/supplierOutcomeMemoryService.ts) | Outcome retention |
| [supabase/migrations](supabase/migrations) | Schema and row-level security policies |

## Local setup

### 1. Install

Use Node.js 20+ and npm. The full supplier-memory demo requires a Supabase project, a Hindsight API key and endpoint, and a Gemini API key with access to the configured advisor model.

```sh
git clone https://github.com/Ram-2008/GodownIQ.git
cd GodownIQ
npm ci
```

The root uses npm workspaces and installs both apps, including the Hindsight client.

### 2. Apply database migrations

For a **fresh Supabase project**, run these SQL files in order in the Supabase SQL Editor:

1. [0001_init.sql](supabase/migrations/0001_init.sql)
2. [0002_bill_photos.sql](supabase/migrations/0002_bill_photos.sql)
3. [0003_expenses.sql](supabase/migrations/0003_expenses.sql)
4. [0004_staff_signup_approval.sql](supabase/migrations/0004_staff_signup_approval.sql)
5. [0005_user_revoke_delete.sql](supabase/migrations/0005_user_revoke_delete.sql)
6. [0006_supplier_incidents.sql](supabase/migrations/0006_supplier_incidents.sql)
7. [0007_supplier_outcomes.sql](supabase/migrations/0007_supplier_outcomes.sql)

For an existing project, apply only migrations that have not already been applied. Do not rerun the entire sequence against an existing database.

### 3. Configure environment variables

Copy [backend/.env.example](backend/.env.example) to `backend/.env` and [frontend/.env.example](frontend/.env.example) to `frontend/.env`. Preserve existing `.env` files when updating an installation.

Backend settings:

| Variable | Value |
| --- | --- |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service-role key; backend only |
| `HINDSIGHT_API_KEY` | Your Hindsight API key; backend only |
| `HINDSIGHT_API_URL` | Your Hindsight API base URL; default `https://api.hindsight.vectorize.io` |
| `HINDSIGHT_BANK_ID` | Bank prefix, default `godowniq-demo`; use a distinct prefix for each deployment |
| `GEMINI_API_KEY` | Your Gemini API key; backend only |
| `SUPPLIER_ADVISOR_MODEL` | Defaults to `gemini-3.5-flash` in this repository; choose a model available to your account if needed |
| `PORT` | `4000` locally |
| `FRONTEND_URL` | `http://localhost:5173` locally; comma-separated allowed origins |
| `WHATSAPP_ENABLED` | Keep `false` unless configuring Twilio |

The bank prefix accepts letters, numbers, underscores, and hyphens, up to 100 characters. The application appends `-supplier-incidents`; do not append it yourself unless that is intentionally part of your prefix.

Frontend settings:

```dotenv
VITE_SUPABASE_URL=<your Supabase project URL>
VITE_SUPABASE_ANON_KEY=<your Supabase anon key>
VITE_API_BASE_URL=http://localhost:4000/api
```

Never put service-role, Hindsight, Gemini, or Twilio secrets in `VITE_*` variables or commit real `.env` files. Restart the affected development server after changing environment variables.

### 4. Run both apps

Use two terminals from the repository root:

```sh
npm run dev:backend
```

```sh
npm run dev:frontend
```

Open `http://localhost:5173`. `http://localhost:4000/api/health` checks that the API is running; it does not verify database access or cloud AI credentials.

### 5. Create the first owner

Sign up in the app and complete any email confirmation required by your Supabase project. Find the new account UUID in Supabase Authentication → Users, then run:

```sql
update public.profiles
set role = 'owner', approval_status = 'approved'
where id = '<YOUR_USER_UUID>';
```

Self-signups start pending, so the first owner needs both fields updated. Sign in again or refresh. The owner can manage subsequent staff access from the Staff page.

Create a supplier through the Add Purchase workflow before recording its incidents. Optional warehouse sample purchases can be generated with `npm run seed` after a profile exists; use a development database only. The purchase seed is not a substitute for the supplier-memory demo below.

## Demo walkthrough

Use fictional records marked as demo data. Prepare a supplier and an incident before recording the video; use actual past dates, not future dates.

Example fixture: **Demo Rice Traders** delivered an order two days late last week. Ask: **“What should I check before placing another urgent order with this supplier?”**

1. In Supplier Incidents, save the fictional late-delivery incident with demo enabled. Confirm successful memory sync; retry if pending.
2. In Supplier Advisor, select the same supplier and enable demo mode. Ask the question above.
3. Show the generic checklist beside the memory-backed answer. Open a source card to show the incident supporting the advice.
4. In Outcome Feedback, select the related recalled incident. For this fictional scenario, record that the owner requested written dispatch confirmation, the result was `worked`, and the next shipment arrived on the agreed date. Choose an outcome date on or after the incident and no later than today.
5. Confirm outcome sync, then ask again about the supplier and that action's result. Show the recalled outcome source if returned. Present this as a simulated history, not a real measured business result.

Suggested **60-second recording**:

| Time | Show |
| --- | --- |
| 0–10s | Explain the forgotten-supplier-history problem. |
| 10–25s | Show a saved incident and successful Hindsight sync. |
| 25–40s | Ask the advisor; show source-linked advice and the generic comparison. |
| 40–55s | Show a prepared, synced outcome and a fresh answer recalling it. |
| 55–60s | Explain that the next decision can use both the incident and what happened afterward. |

Prepare synced demo records in advance so provider latency does not consume the recording. Do not present a pending or failed sync as successful memory recall.

## Verification

From the repository root:

```sh
npm run build:backend
npm run build:frontend
npm run test:backend
```

Backend tests cover supplier validation, source verification, mode separation, memory retention, and outcome handling. Cloud calls in unit tests are mocked; passing tests do not confirm live credentials, quotas, or deployed database migrations. Run the demo walkthrough against your configured services before presenting.

## Deployment notes

Build from the repository root using the commands above. The frontend output is `frontend/dist`. With the current backend TypeScript configuration, the compiled server is `backend/dist/src/server.js`; from the `backend` directory, run `node dist/src/server.js`. The current backend `npm start` script points at a different path, so use the explicit command when configuring a persistent Node host.

Set backend secrets in the host environment, `NODE_ENV=production`, and `FRONTEND_URL` to the frontend origin. Build the frontend with `VITE_API_BASE_URL` pointing to the deployed backend's `/api` URL and the appropriate Supabase public settings. Apply missing migrations to that database and verify owner access and the full memory workflow after deployment. Do not seed production data.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Incident or outcome saved but memory pending | Backend Hindsight key, endpoint, connectivity, and quota; retry sync on the saved record. |
| No recalled evidence | Same supplier, correct demo/real toggle, successful sync, and a question relevant to the saved history. |
| Evidence visible but advice unavailable | Gemini key, advisor model access, quota, and backend logs. |
| Supplier tables missing | Migrations `0006` and `0007` in the connected Supabase project. |
| Supplier features inaccessible | Signed-in profile has owner role and approved status. |
| Old answer after saving an outcome | Wait for successful sync, then ask again. |

## Submission checklist

- [ ] Repository contains the latest code and reproducible setup instructions.
- [ ] Full incident → recall → advice → outcome → recall flow works with live services.
- [ ] A 60-second demo video is recorded and its link added to the submission.
- [ ] Live demonstration is rehearsed with prepared demo data.
- [ ] Each team member completes the required content submission using the organizers' content guide.
- [ ] Final submission explains Hindsight's role and includes all links requested by the organizers.

This checklist tracks preparation; it does not claim the video, live deployment, or team content has already been submitted.
