# Supplier Advisor — incremental update

Apply this only after the Supplier Incidents patch. Existing records stay in place.
This patch adds no database tables and requires no new SQL migration.

## Apply from the project root in PowerShell

```powershell
git apply --check "$env:USERPROFILE\Downloads\godowniq-supplier-advisor.patch"
git apply "$env:USERPROFILE\Downloads\godowniq-supplier-advisor.patch"
```

Run the second command only if the check succeeds. If your files changed since the
first patch, share the conflict output instead of forcing an overwrite.

## Environment and restart

Keep the Hindsight settings you already tested. The advisor also needs the existing
`GEMINI_API_KEY` in `backend/.env`. Do not share the key or put it in frontend code.
It uses `gemini-3.5-flash`, matching this repository's existing Gemini features.
Optionally set `SUPPLIER_ADVISOR_MODEL` to another compatible Gemini model available
to your account. The request uses JSON output and minimal thinking.

From the project root, restart backend and frontend in separate terminals:

```powershell
npm run dev:backend
```

```powershell
npm run dev:frontend
```

## First demo

1. Sign in as an approved owner. Open **Supplier Advisor**.
2. Select the same supplier used in Supplier Incidents.
3. Turn ON **Use synthetic demo incidents only** if that incident was labelled
   synthetic. OFF retrieves only real records. The modes never mix records.
4. Ask: `I need 100 rice bags by 1 October. What should I confirm before ordering?`
5. Click **Recall history & advise**.
6. Compare the fixed general checklist with the evidence-based Gemini response.
   Click E1/E2 links to inspect original incident and resolution dates.

Hindsight retrieves tagged memories. Their source document IDs are then matched
to actual Supabase records for the selected supplier and mode. Gemini receives
those source records rather than relying on guessed dates in extracted memory.
Returned evidence IDs are validated; this does not guarantee every inference is
correct, so the UI exposes the original records for review.

No memory means no supplier-specific answer. If Gemini is missing or fails, source
evidence remains visible, with an explicit message instead of a fake AI response.
Hindsight failures do not fall back to database-only advice disguised as memory.

## Date fix

New incidents and completed resolutions cannot have a future date (Asia/Kolkata),
including synthetic examples. Existing records are not deleted or rewritten. If
an older record claims a resolution in the future, the advisor excludes that
resolution and displays a note. A planned precaution should not be entered as a
completed resolution. Use a new, accurately labelled demo incident if needed.

## What this version covers

- Owner-only advisor; general checklist beside memory-informed advice.
- Strict supplier filtering and separate real/demo modes.
- Up to eight recalled source incidents with clickable citations.
- Server/client date checks and safe handling of old future-dated resolutions.
- Authenticated, rate-limited advisor requests (30/hour per owner).
- No automatic ordering, messaging, editing of incidents, or outcome-feedback
  capture. Recording the results of advice is the next feature.

## Verification

Frontend/backend production builds and unit tests cover validation, strict memory
filters, provenance, cross-supplier/demo exclusion, unavailable providers and invalid
AI citations. Cloud services are mocked in these tests. This patch has not been
tested against your live credentials or deployed; complete the local demo above.
