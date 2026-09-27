# Outcome Feedback — incremental update

Apply after both the Supplier Incidents and Supplier Advisor patches.
This adds owner-reported outcomes and recalls those observations in later advice.

## 1. Apply from your project root

```powershell
git apply --check "$env:USERPROFILE\Downloads\godowniq-outcome-feedback.patch"
git apply "$env:USERPROFILE\Downloads\godowniq-outcome-feedback.patch"
```

Only run the second command if the check succeeds. Share conflict output rather
than forcing an overwrite. Existing environment files and package manifests are
not modified. The existing Hindsight SDK and Gemini settings are reused.

## 2. Apply the new database migration once

Open `supabase/migrations/0007_supplier_outcomes.sql` and run its entire contents
in the SQL Editor of the same Supabase project used by GodownIQ. Migration 0006
must already be installed. Do not rerun 0006. The new table links each outcome to
an existing incident and enforces owner access, matching supplier/demo mode and
completed dates. Existing incidents are not changed.

## 3. Restart from the project root, in separate terminals

```powershell
npm run dev:backend
```

```powershell
npm run dev:frontend
```

Stop old processes with Ctrl+C first.

## 4. Run the feedback loop

1. Sign in as an approved owner and open Supplier Advisor.
2. Select Sharma Traders (or the supplier with your clean synthetic incident).
3. Turn ON **Use synthetic demo incidents only**.
4. Ask the order question and click **Recall history & advise**.
5. Scroll down to the new **Outcome Feedback** form.
6. Select the relevant original incident. Enter the example values below only if
   you are running the synthetic demonstration; do not present them as real events.

| Field | Synthetic example value |
|---|---|
| Action actually taken | Requested moisture-resistant packaging and inspected every bag on arrival. |
| How did it work? | Worked |
| Date the result was observed | 2026-09-27 |
| Observed result | In this synthetic follow-up delivery, all 100 bags arrived dry and none were spoiled. |

The outcome date must be on or after the related incident and on or before today
in Asia/Kolkata. This is an additional synthetic follow-up event, not a claim that
a future order due by 1 October has already arrived.

7. Tick the completed synthetic scenario confirmation.
8. Click **Save outcome & remember**. Wait for **Remembered**.
9. Ask again: `For the next 100 rice bags, what precautions should I take based on past incidents and the actions we tried?`
10. Inspect the evidence: it should include a recalled outcome with its action,
    result and source IDs. The advice can refer to reported successful packaging,
    without claiming one observation proves causation or guarantees future quality.

The model's wording and evidence selection can vary; inspect the source records.
The test is that the new reported outcome becomes available as verified evidence,
not that a specific sentence or source number always appears.

## Retry and history

- Saving to Supabase happens before the memory request. Hindsight failures leave a
  saved, pending record with **Retry outcome sync**.
- The outcome history remains available after a refresh once a supplier and mode
  are selected, even before a new advisor question is asked.
- The same outcome document ID is reused on retry. Synced records are not resent.
- Real and synthetic records remain in separate recall filters and lists.
- Record failed and partial outcomes honestly; do not select Worked by default if
  the action was not effective. Unfinished actions do not belong in this form.

## Implementation and limits

The original incident and outcome are separate immutable source records. A fixed
Hindsight bank stores both, distinguished by document prefixes and an outcome tag.
The advisor performs the general memory search and a dedicated outcome search,
verifies returned IDs against the database, and supplies up to eight sources to
Gemini. Evidence includes both kinds where available. A failed outcome search is
labelled as incomplete rather than silently claiming full history.

The prompt now distinguishes a deadline (by 1 October) from a confirmed arrival
date, and asks for inspection on arrival. This is a prompt improvement, not a
guarantee that generated wording will always be correct.

An outcome is the owner's report of an action and result. It links to an incident;
this version does not persist full advisor conversations or prove that an action
was performed because of a particular AI answer. Recommendations themselves are
not stored as verified outcomes. No model weights are trained: future answers
adapt because the agent retrieves the additional experience.

## Verification

Both production builds and 85 unit tests passed during development. Tests cover
date rules, real/demo isolation, source validation, outcomes before/after recall,
provider failures, safe retry, and evidence citation limits. Cloud services are
mocked in unit tests. The new SQL and UI workflow must still be exercised against
your own local app and Supabase project. No GitHub push or deployment was done.
