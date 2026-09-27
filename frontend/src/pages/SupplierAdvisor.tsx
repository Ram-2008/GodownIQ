import { FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { suppliersApi } from "../api/suppliers";
import { AdvisorResponse, supplierAdvisorApi } from "../api/supplierAdvisor";
import { Supplier } from "../types/domain";
import { Button } from "../components/ui/Button";
import { Select } from "../components/ui/Select";
import { SupplierOutcomeFeedback } from "../components/SupplierOutcomeFeedback";

function EvidenceLinks({ ids }: { ids: string[] }) {
  return <span className="ml-2 inline-flex flex-wrap gap-1">{[...new Set(ids)].map((id) =>
    <a key={id} href={`#evidence-${id}`} className="rounded bg-brand-100 px-1.5 py-0.5 text-xs font-semibold text-brand-800 underline" aria-label={`Read source ${id}`}>{id}</a>
  )}</span>;
}

export function SupplierAdvisorPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [question, setQuestion] = useState("");
  const [demoMode, setDemoMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<AdvisorResponse | null>(null);
  const [memoryChanged, setMemoryChanged] = useState(false);
  const lock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let active = true;
    setLoading(true); setLoadError("");
    suppliersApi.list().then((rows) => { if (active) setSuppliers(rows); }).catch(() => {
      if (active) setLoadError("Could not load suppliers. Check your connection and retry.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    if (question.trim().length < 10) { setError("Describe your order or concern in at least 10 characters."); return; }
    lock.current = true; setBusy(true); setError(""); setResult(null); setMemoryChanged(false);
    try {
      const response = await supplierAdvisorApi.ask(supplierId, question.trim(), demoMode);
      if (mounted.current) setResult(response);
    } catch (err) {
      if (mounted.current) setError(err instanceof Error ? err.message : "Could not get advice. Please retry.");
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return <div className="space-y-6">
    <header>
      <h1 className="text-2xl font-bold text-gray-900">Supplier Advisor</h1>
      <p className="mt-1 text-sm text-gray-600">Ask about your next order. See what past incidents suggest, with the original records behind each recommendation.</p>
    </header>
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      {loadError && <div role="alert" className="text-sm text-red-700"><p>{loadError}</p><Button type="button" variant="secondary" onClick={() => setReload((n) => n + 1)}>Retry suppliers</Button></div>}
      <fieldset disabled={loading || busy || !!loadError || !suppliers.length} className="space-y-4 disabled:opacity-60">
        <Select id="advisor-supplier" label="Supplier" required value={supplierId} onChange={(e) => { setSupplierId(e.target.value); setResult(null); }}>
          <option value="">Choose a supplier</option>
          {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
        </Select>
        <div className="space-y-1">
          <label htmlFor="advisor-question" className="block text-sm font-medium text-gray-700">What do you need to decide?</label>
          <textarea id="advisor-question" required minLength={10} maxLength={600} rows={3} value={question}
            onChange={(e) => { setQuestion(e.target.value); setResult(null); }}
            placeholder="I need 100 rice bags by 1 October. What should I confirm with this supplier before ordering?"
            className="w-full rounded-lg border border-gray-300 p-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={demoMode} onChange={(e) => { setDemoMode(e.target.checked); setResult(null); }} className="mt-1" />
          <span>Use synthetic demo incidents only.<span className="block text-xs text-gray-500">Off: real incidents only. On: demo incidents only.</span></span>
        </label>
        <Button type="submit" loading={busy}>Recall history & advise</Button>
      </fieldset>
      {loading && <p role="status" className="text-sm text-gray-500">Loading suppliers...</p>}
      {!loading && !loadError && !suppliers.length && <p className="text-sm text-gray-600">Add a supplier from Add Purchase first.</p>}
      {busy && <p role="status" className="text-sm text-gray-600">Recalling saved memories and checking source records. This can take a little while.</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <Link to="/supplier-incidents" className="inline-block text-sm text-brand-700 underline">Record or sync a supplier incident</Link>
    </form>
    {result && <div className="space-y-5">
      {memoryChanged && <p role="status" className="rounded-xl bg-brand-50 p-4 text-sm">A new outcome has been remembered since this answer. <a href="#advisor-question" className="font-semibold underline">Ask the question again</a> to include the new experience.</p>}
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">Advice for {result.supplier.name}</h2>
        {result.demo_mode && <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-800">SYNTHETIC DEMO</span>}
      </div>
      {result.warning && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{result.warning}</p>}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
          <h3 className="font-semibold text-gray-800">Without supplier history</h3>
          <p className="mt-1 text-xs text-gray-500">General checklist · fixed guidance, not an AI response</p>
          <ul className="mt-4 list-disc space-y-3 pl-5 text-sm text-gray-600">{result.baseline.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
        <section className="rounded-xl border border-brand-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900">With recalled supplier history</h3>
          {result.advice ? <>
            <p className="mt-3 text-sm text-gray-800">{result.advice.assessment}<EvidenceLinks ids={result.advice.assessment_evidence_ids} /></p>
            {result.advice.risks.length > 0 && <><h4 className="mt-5 text-sm font-semibold">Risks to consider</h4><ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-gray-700">{result.advice.risks.map((risk, index) => <li key={index}>{risk.text}<EvidenceLinks ids={risk.evidence_ids} /></li>)}</ul></>}
            <h4 className="mt-5 text-sm font-semibold">Suggested actions</h4>
            <ol className="mt-2 list-decimal space-y-3 pl-5 text-sm">{result.advice.actions.map((action, index) => <li key={index}><p className="font-medium">{action.text}</p><p className="mt-1 text-gray-600">{action.reason}<EvidenceLinks ids={action.evidence_ids} /></p></li>)}</ol>
            {result.advice.questions_to_confirm.length > 0 && <><h4 className="mt-5 text-sm font-semibold">Still to confirm</h4><ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-gray-600">{result.advice.questions_to_confirm.map((item, index) => <li key={index}>{item}</li>)}</ul></>}
            <p className="mt-5 border-t pt-3 text-xs text-gray-500">AI advice based on a limited set of recalled incidents. Check the source details and current supplier commitments before deciding.</p>
          </> : <p className="mt-3 text-sm text-gray-600">Supplier-specific advice is not available for this request. See the message above and any recalled evidence below.</p>}
        </section>
      </div>
      {result.evidence.length > 0 && <section className="space-y-3" aria-label="Recalled source evidence">
        <h3 className="text-lg font-semibold">Sources recalled by Hindsight ({result.evidence.length})</h3>
        {result.evidence.map((source) => <article id={`evidence-${source.id}`} key={source.id} tabIndex={-1} className="scroll-mt-6 rounded-xl border border-gray-200 bg-white p-5 focus:outline-none focus:ring-2 focus:ring-brand-500">
          <h4 className="font-semibold">{source.id} · {source.event_date} · {source.source_type === "outcome" ? `Outcome: ${source.outcome_status?.replace(/_/g, " ")}` : source.category.replace(/_/g, " ")}</h4>
          {source.action_taken && <p className="mt-2 whitespace-pre-wrap break-words text-sm"><strong>Action reported:</strong> {source.action_taken}</p>}
          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-800">{source.description}</p>
          {source.source_type === "incident" && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-600">{source.resolution ? `Resolution on ${source.resolved_date}: ${source.resolution}` : "No valid completed resolution recorded."}</p>}
          {source.note && <p className="mt-2 text-sm text-amber-800">{source.note}</p>}
          <details className="mt-3 text-xs text-gray-500"><summary className="cursor-pointer">Source identifiers</summary><p className="mt-2 break-all">{source.source_type}: {source.source_id}</p><p className="mt-1 break-all">Related incident: {source.related_incident_id}</p><p className="mt-1 break-all">Hindsight facts: {source.memory_ids.join(", ")}</p></details>
        </article>)}
      </section>}
    </div>}
    {supplierId && <SupplierOutcomeFeedback key={`${supplierId}:${demoMode}`} supplierId={supplierId} demoMode={demoMode}
      evidence={result?.evidence ?? []} suggestions={result?.advice?.actions.map((action) => action.text) ?? []}
      onRemembered={() => setMemoryChanged(true)} />}
  </div>;
}
