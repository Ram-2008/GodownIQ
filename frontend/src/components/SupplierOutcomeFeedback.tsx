import { FormEvent, useEffect, useRef, useState } from "react";
import { AdvisorEvidence } from "../api/supplierAdvisor";
import { OutcomeStatus, SupplierOutcome, supplierOutcomesApi } from "../api/supplierOutcomes";
import { indiaToday } from "../utils/indiaDate";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Select } from "./ui/Select";

const STATUS: Record<OutcomeStatus, string> = { worked: "Worked", partly_worked: "Partly worked", did_not_work: "Did not work" };
function freshForm() {
  return { id: crypto.randomUUID(), related_incident_id: "", action_taken: "", outcome_status: "worked" as OutcomeStatus,
    result_details: "", outcome_date: indiaToday() };
}
function message(error: unknown) { return error instanceof Error ? error.message : "Please try again."; }

export function SupplierOutcomeFeedback({ supplierId, demoMode, evidence, suggestions, onRemembered }: {
  supplierId: string; demoMode: boolean; evidence: AdvisorEvidence[]; suggestions: string[]; onRemembered: () => void;
}) {
  const [form, setForm] = useState(freshForm);
  const [confirmed, setConfirmed] = useState(false);
  const [rows, setRows] = useState<SupplierOutcome[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const saveLock = useRef(false);
  const syncLock = useRef(false);
  // Deduplicate related incidents if several recalled outcomes refer to one incident.
  const related = [...new Map(evidence.map((source) => [source.related_incident_id, source])).values()];

  useEffect(() => {
    let active = true;
    setLoading(true); setLoadError("");
    supplierOutcomesApi.list(supplierId, demoMode, page).then((result) => {
      if (active) { setRows(result.outcomes); setTotal(result.total); }
    }).catch((err) => { if (active) setLoadError(message(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [supplierId, demoMode, page, reload]);

  async function sync(id: string) {
    if (syncLock.current) return;
    syncLock.current = true; setSyncing(id); setNotice("Outcome saved. Syncing its memory...");
    try {
      const response = await supplierOutcomesApi.sync(id);
      setRows((previous) => previous.map((row) => row.id === id ? response.outcome : row));
      setNotice(response.warning ?? "Outcome remembered. Ask the advisor again to use this new experience.");
      if (!response.warning) onRemembered();
    } catch (err) { setNotice(`Outcome is saved. Memory sync is pending: ${message(err)}`); }
    finally { syncLock.current = false; setSyncing(null); setReload((n) => n + 1); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saveLock.current || syncLock.current) return;
    setError("");
    const action = form.action_taken.trim(); const details = form.result_details.trim();
    if (!confirmed || action.length < 10 || details.length < 10) { setError("Describe the action and observed result in at least 10 characters each, and confirm this is a completed observation."); return; }
    if (form.outcome_date > indiaToday()) { setError("A completed outcome cannot be dated in the future."); return; }
    saveLock.current = true; setSaving(true); setNotice("");
    let saved: SupplierOutcome;
    try {
      saved = await supplierOutcomesApi.create({ ...form, action_taken: action, result_details: details, supplier_id: supplierId, is_demo: demoMode });
    } catch (err) { setError(message(err)); setSaving(false); saveLock.current = false; return; }
    setForm(freshForm()); setConfirmed(false); setPage(1);
    setRows((previous) => [saved, ...previous.filter((row) => row.id !== saved.id)].slice(0, 10));
    setTotal((n) => n + 1); setSaving(false); saveLock.current = false;
    await sync(saved.id);
  }

  return <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm" aria-label="Outcome feedback">
    <div><h2 className="text-lg font-semibold">Outcome Feedback</h2><p className="mt-1 text-sm text-gray-600">After taking an action, record what happened. The next advice can use what worked and what did not.</p></div>
    {demoMode && <p className="rounded-lg bg-purple-50 p-3 text-sm text-purple-800">Demo mode: all outcomes entered here will be labelled synthetic.</p>}
    {notice && <p role="status" className="rounded-lg bg-brand-50 p-3 text-sm text-gray-800">{notice}</p>}
    {loadError && <div role="alert" className="text-sm text-red-700"><p>{loadError}</p><Button variant="secondary" className="mt-2" onClick={() => setReload((n) => n + 1)}>Retry loading outcomes</Button></div>}
    {!related.length && <p className="text-sm text-gray-600">Recall this supplier's history above to select a related incident before recording an outcome.</p>}
    <form onSubmit={submit} className="space-y-4">
      <fieldset disabled={saving || syncing !== null || !related.length || !!loadError} className="space-y-4 disabled:opacity-60">
        <Select id="outcome-related" label="Related incident" value={form.related_incident_id} required onChange={(e) => setForm({ ...form, related_incident_id: e.target.value })}>
          <option value="">Choose the incident this action addressed</option>
          {related.map((source) => <option key={source.related_incident_id} value={source.related_incident_id}>{source.source_type === "incident" ? `${source.event_date} · ${source.description.slice(0, 75)}` : `Incident ${source.related_incident_id.slice(0, 8)} linked to ${source.id}`}</option>)}
        </Select>
        {suggestions.length > 0 && <div className="space-y-1"><p className="text-xs text-gray-500">Optional: use a suggestion as a starting point, then describe what you actually did.</p><div className="flex flex-wrap gap-2">{suggestions.map((text, index) => <Button key={index} type="button" variant="secondary" onClick={() => setForm({ ...form, action_taken: text })}>Use action {index + 1}</Button>)}</div></div>}
        <div className="space-y-1"><label htmlFor="outcome-action" className="block text-sm font-medium">Action actually taken</label><textarea id="outcome-action" required minLength={10} maxLength={2000} rows={2} value={form.action_taken} onChange={(e) => setForm({ ...form, action_taken: e.target.value })} placeholder="Describe what you did, not just what the advisor suggested." className="w-full rounded-lg border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-brand-500" /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select id="outcome-status" label="How did it work?" value={form.outcome_status} onChange={(e) => setForm({ ...form, outcome_status: e.target.value as OutcomeStatus })}>{Object.entries(STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>
          <Input id="outcome-date" label="Date the result was observed" type="date" max={indiaToday()} required value={form.outcome_date} onChange={(e) => setForm({ ...form, outcome_date: e.target.value })} />
        </div>
        <div className="space-y-1"><label htmlFor="outcome-result" className="block text-sm font-medium">Observed result</label><textarea id="outcome-result" required minLength={10} maxLength={3000} rows={3} value={form.result_details} onChange={(e) => setForm({ ...form, result_details: e.target.value })} placeholder="What changed? Include actual quantities and any remaining problems." className="w-full rounded-lg border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-brand-500" /></div>
        <label className="flex items-start gap-2 text-sm text-gray-700"><input type="checkbox" required checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1" /><span>{demoMode ? "This is a completed event within a labelled synthetic scenario." : "I am recording an observed result, not a prediction or an action I plan to take."}</span></label>
        <Button type="submit" loading={saving}>Save outcome & remember</Button>
      </fieldset>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </form>
    <div className="border-t pt-4"><h3 className="font-semibold">Reported outcomes ({total})</h3>
      {loading ? <p role="status" className="mt-3 text-sm text-gray-500">Loading outcomes...</p> : rows.length === 0 && !loadError ? <p className="mt-3 text-sm text-gray-500">No outcomes recorded in this data mode yet.</p> : null}
      {!loading && rows.map((row) => <article key={row.id} className="mt-3 rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap justify-between gap-2 text-sm"><p className="font-semibold">{row.outcome_date} · {STATUS[row.outcome_status]}</p><span className={row.memory_status === "synced" ? "text-green-700" : "text-amber-800"}>{syncing === row.id ? "Syncing..." : row.memory_status === "synced" ? "Remembered" : "Saved · memory pending"}</span></div>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm"><strong>Action:</strong> {row.action_taken}</p>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm"><strong>Result:</strong> {row.result_details}</p>
        {row.is_demo && <p className="mt-2 text-xs font-semibold text-purple-700">SYNTHETIC DEMO</p>}
        {row.memory_status === "pending" && <Button className="mt-3" variant="secondary" disabled={saving || syncing !== null} onClick={() => void sync(row.id)}>Retry outcome sync</Button>}
      </article>)}
      <div className="mt-4 flex items-center justify-between gap-2"><Button variant="secondary" disabled={page <= 1 || loading || saving || syncing !== null} onClick={() => setPage((n) => n - 1)}>Previous</Button><span className="text-xs text-gray-500">Page {page} of {Math.max(1, Math.ceil(total / 10))}</span><Button variant="secondary" disabled={page * 10 >= total || loading || saving || syncing !== null} onClick={() => setPage((n) => n + 1)}>Next</Button></div>
    </div>
  </section>;
}
