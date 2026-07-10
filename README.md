# GodownIQ

A warehouse expense, inventory, and purchase-intelligence app for a single-warehouse
business in India. Log purchases in seconds (tap a chip, type a sentence, or snap a
photo of a bill), track stock, catch overpriced or overdue bills automatically, and
get a lightweight AI forecast of what to reorder next.

## Stack

- **Frontend**: React + TypeScript + Vite, Tailwind CSS, Recharts — deployed to Vercel
- **Backend**: Node.js + Express (TypeScript) — deployed to Railway or Render
- **Database & Auth**: Supabase (Postgres + Supabase Auth). The frontend never talks to
  the database directly — every read/write goes through the backend API, which is the
  only thing holding the Supabase service-role key.
- **AI**: Anthropic Claude API (natural-language entry, photo bill parsing, demand
  forecast) — every AI feature has a non-AI fallback, so the app is fully usable with
  no Claude key configured.
- **WhatsApp**: Twilio WhatsApp API — optional, feature-flagged off by default.

## Repository layout

```
/frontend            React app (Vite)
/backend             Express API
/backend/scripts      seed.ts — dev-only sample data generator
/supabase/migrations  0001_init.sql — full schema + Row Level Security
```

---

## 1. Local setup

### Prerequisites

- Node.js 20+
- A free [Supabase](https://supabase.com) account
- (Optional) An [Anthropic API key](https://console.anthropic.com) for AI features
- (Optional) A [Twilio](https://www.twilio.com) account for WhatsApp entry

### Install

```sh
git clone <this repo>
cd godowniq
npm install
```

This installs both `frontend` and `backend` via npm workspaces.

### Create the Supabase project

1. Create a new project at [supabase.com](https://supabase.com/dashboard).
2. Open **SQL Editor** in the Supabase dashboard, paste the contents of
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), and run it.
   (Alternatively, if you use the Supabase CLI: `supabase link` then `supabase db push`.)
3. Open **Project Settings → API** and copy three values you'll need below:
   `Project URL`, `anon public` key, and `service_role` key (keep the service-role key
   secret — never put it in frontend code or commit it).

### Configure environment variables

```sh
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Fill in `backend/.env`:

| Variable | Where to get it |
|---|---|
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role key (secret!) |
| `ANTHROPIC_API_KEY` | Leave blank to run without AI features, or paste a key from console.anthropic.com |
| `WHATSAPP_ENABLED` | `false` unless you've set up Twilio (see §4) |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_WHATSAPP_NUMBER` | Only needed if `WHATSAPP_ENABLED=true` |
| `FRONTEND_URL` | `http://localhost:5173` for local dev |

Fill in `frontend/.env`:

| Variable | Where to get it |
|---|---|
| `VITE_SUPABASE_URL` | Same Project URL as above |
| `VITE_SUPABASE_ANON_KEY` | Same anon public key as above (this one is safe to expose — it only allows what your RLS policies allow) |
| `VITE_API_BASE_URL` | `http://localhost:4000/api` for local dev |

### Create the owner account

1. Run the apps (next section), open the frontend, and use **"Create the owner
   account"** on the login page to sign up with your own email/password.
2. In the Supabase SQL Editor, promote that account to owner (replace the UUID with
   your new user's ID — find it in **Authentication → Users**):

   ```sql
   update profiles set role = 'owner' where id = '<your-user-uuid>';
   ```

3. Sign in again (or refresh) — you now have full owner access, including inviting
   staff from the **Staff** page.

### Run it

```sh
npm run dev:backend    # http://localhost:4000
npm run dev:frontend   # http://localhost:5173
```

### Seed sample data (optional, dev only)

Guarded against running with `NODE_ENV=production`. Generates ~75 days of realistic
purchase history (rice, wheat, sugar, oil, diesel, bags) with weekly buying patterns,
a gradual oil price rise, a one-off sugar price spike, some pending/overdue payments,
and stock movements for the two tracked items:

```sh
npm run seed
```

Requires at least one profile to already exist (sign up once first, per above). To
attribute seed data to a specific account, set `SEED_USER_EMAIL=you@example.com` before
running.

---

## 2. Environment variables reference

See `backend/.env.example` and `frontend/.env.example` for the authoritative list —
every variable the app reads is listed there with a comment. Never commit a real
`.env` file; `.gitignore` already excludes it.

**Security note**: `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, and the Twilio
credentials only ever live in `backend/.env` / your hosting provider's backend
environment settings. They are never sent to, or readable by, the frontend.

---

## 3. Twilio WhatsApp sandbox setup (optional)

WhatsApp entry is off by default (`WHATSAPP_ENABLED=false`). To turn it on:

1. In the [Twilio Console](https://console.twilio.com), open **Messaging → Try it
   out → Send a WhatsApp message** to activate the WhatsApp sandbox, and note the
   sandbox number and the join code shown there.
2. Under **Sandbox settings**, set **"When a message comes in"** to your deployed
   backend's webhook URL: `https://<your-backend-domain>/api/webhooks/whatsapp`
   (method `POST`). For local testing, use a tunnel (e.g. `ngrok http 4000`) and point
   the sandbox at `https://<ngrok-domain>/api/webhooks/whatsapp`.
3. Copy the **Account SID** and **Auth Token** from the Twilio Console dashboard into
   `backend/.env` as `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN`, and the sandbox's
   `whatsapp:+1415XXXXXXX` number as `TWILIO_WHATSAPP_NUMBER`. Set `WHATSAPP_ENABLED=true`.
4. From your own phone, send the sandbox's join code to the sandbox number on
   WhatsApp once (Twilio sandbox requires this per phone number).
5. In the app's **Staff** page, set that same phone number (E.164 format, e.g.
   `+919876543210`) on the profile that should be allowed to log purchases via
   WhatsApp.
6. Send a message like `rice 50kg 2200` to the sandbox number — you should get a
   confirmation reply and see the purchase appear in the app.

Messages from numbers not registered on any profile get a polite rejection reply, and
every inbound message is logged on the backend for debugging. If Claude can't parse a
message clearly, the reply asks the sender to resend in `item quantity price` format —
nothing is ever auto-saved on an ambiguous read.

---

## 4. Deployment

### Backend → Railway or Render

1. Create a new service pointed at this repo, root directory `backend/`.
2. Build command: `npm install && npm run build`. Start command: `npm start`.
3. Set all the variables from `backend/.env.example` in the service's environment
   settings (use your production Supabase project's keys, not local ones).
4. Set `FRONTEND_URL` to your deployed Vercel URL (comma-separate multiple origins if
   needed) once you have it, so CORS allows the real frontend.
5. Note the deployed backend URL — you'll need it for the frontend's
   `VITE_API_BASE_URL` and, if using WhatsApp, the Twilio webhook.

### Frontend → Vercel

1. Import this repo into Vercel, set the project root to `frontend/`.
2. Framework preset: Vite. Build command: `npm run build`. Output directory: `dist`.
3. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_API_BASE_URL` (pointing
   at your deployed backend, e.g. `https://your-backend.up.railway.app/api`) in
   Vercel's environment variables.
4. Deploy. Update the backend's `FRONTEND_URL` to match the final Vercel domain.

### Post-deploy checklist

- [ ] Sign up as owner on the production URL, promote via SQL as described above.
- [ ] Invite any staff accounts from the Staff page.
- [ ] If using AI features, confirm `ANTHROPIC_API_KEY` is set on the backend only.
- [ ] If using WhatsApp, point the Twilio sandbox/production webhook at the deployed
      backend URL and register staff WhatsApp numbers.
- [ ] Do **not** run `npm run seed` against the production database — it's guarded by
      `NODE_ENV=production`, but double-check your hosting provider sets that variable.

---

## 5. Client user guide

*(Share this section, or a copy of it, with the warehouse team.)*

### Signing in

Owner and staff each sign in with their own email and password. The owner invites
staff from the **Staff** page — an invite email is sent automatically.

### Adding a purchase — four ways

1. **Quick-add chips** (top of the Add Purchase page): once you've logged a handful of
   purchases, your most frequently-bought items show up as tappable chips (e.g. "Rice
   ₹44/kg"). Tap one to pre-fill the form with the usual quantity and price, then just
   confirm or adjust.
2. **Type it in plain English (or Hinglish)**: use the text box below the chips — e.g.
   *"bought 50kg chawal for 2200 from Sharma traders pending payment"*. It fills in the
   form for you to check before saving — nothing saves automatically.
3. **Scan a bill photo**: tap "Scan a bill photo", take or upload a photo of a supplier
   invoice. The app reads the supplier, date, GST, and every line item into an editable
   table — check the numbers against the paper bill, then save. Always double-check
   before saving; photo reading can make mistakes on a blurry or crumpled bill.
4. **WhatsApp** (if enabled by your owner): message the registered WhatsApp number in
   the form `item quantity price`, e.g. `rice 50kg 2200`, or a full sentence. You'll get
   a confirmation reply, and the purchase appears in the app immediately. If the
   message is unclear, you'll be asked to resend in the simple format.

Staff can edit or delete their own entries only on the same day they were created;
older entries need the owner.

### Calendar

The **Calendar** page shows a month grid — darker days mean higher spend. Tap any day
to see every purchase logged that day, with edit buttons where you have permission.
Use the arrows to browse past months.

### Stock

For items the owner has turned on stock tracking for, the **Stock** page shows current
stock, a low-stock threshold, and an estimated "days left" based on recent usage.
Anyone can log a **Stock Out** (e.g. after using diesel or bags); the owner can also
run a stock **Adjustment** after a physical count.

### Payments (owner only)

Shows every pending bill grouped by supplier, with overdue ones highlighted in red.
"Mark paid" clears it and records who did it and when.

### Reports & exports (owner only)

Pick a month to see totals, GST, and per-item/per-supplier breakdowns, with a one-click
CSV download. A full all-time backup CSV and a stock-movements CSV are also available.

### Forecast (owner only)

Shows a predicted next-month quantity and spend per item, with a plain-English reason
and a confidence level. Items with under three weeks of history are always marked
"low confidence" — the forecast gets more accurate the longer you use the app. If the
AI is unavailable, you'll see a simple average-based forecast instead, clearly labeled.

### Alerts

The dashboard's alerts panel flags: a price that's jumped more than 15% above your
usual average, low stock, overdue payments, and reminders when you're overdue for a
purchase you normally make on a regular schedule (e.g. diesel every few days).
Dismiss any alert once you've dealt with it.

---

## 6. Notes for future maintenance

- Rate limits: natural-language parsing is capped at 30 requests/hour/user, photo
  parsing at 20/day/user, and the AI forecast can only regenerate once every 24 hours
  (cached in between). These are enforced server-side.
- All Claude and Twilio calls are wrapped in try/catch with a graceful fallback — a
  Claude or Twilio outage degrades those specific features, never the rest of the app.
- Row Level Security in `supabase/migrations/0001_init.sql` is the real access-control
  boundary (owners full access; staff limited per the role rules above) — the backend's
  role checks are a defense-in-depth / better-error-message layer on top of it, not the
  sole guard.
