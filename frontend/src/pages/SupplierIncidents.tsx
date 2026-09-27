import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { suppliersApi } from "../api/suppliers";
import { IncidentInput, IncidentType, SupplierIncident, supplierIncidentsApi } from "../api/supplierIncidents";
import { Supplier } from "../types/domain";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";

const TYPES: Record<IncidentType, string> = {
  late_delivery: "Late delivery", shortage: "Missing items", damage: "Damaged goods", other: "Other",
};
function newForm(): IncidentInput {
  return {
    id: crypto.randomUUID(), supplier_id: "", incident_date: format(new Date(), "yyyy-MM-dd"),
    incident_type: "late_delivery", description: "", resolution: null, resolved_date: null, is_demo: false,
  };
}
function errorText(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export function SupplierIncidentsPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [incidents, setIncidents] = useState<SupplierIncident[]>([]);
  const [form, setForm] = useState<IncidentInput>(newForm);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const requestVersion = useRef(0);
  const saveLock = useRef(false);
  const syncLock = useRef(false);

  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    setLoadError("");
    try {
      const [supplierRows, result] = await Promise.all([suppliersApi.list(), supplierIncidentsApi.list(page)]);
      if (version !== requestVersion.current) return;
      setSuppliers(supplierRows);
      setIncidents(result.incidents);
      setTotal(result.total);
    } catch (error) {
      if (version === requestVersion.current) setLoadError(errorText(error));
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [page]);
  useEffect(() => {
    void load();
    return () => { requestVersion.current += 1; };
  }, [load, reload]);

  async function syncMemory(id: string) {
    if (syncLock.current) return;
    syncLock.current = true;
    setSyncing(id);
    setNotice("Incident saved. Syncing its memory...");
    try {
      const result = await supplierIncidentsApi.sync(id);
      setIncidents((rows) => rows.map((row) => row.id === id ? result.incident : row));
      setNotice(result.warning ?? "Incident saved and remembered. You can find its source in Hindsight.");
    } catch (error) {
      setNotice(`Incident is saved. Memory sync is still pending: ${errorText(error)}`);
    } finally {
      syncLock.current = false;
      setSyncing(null);
      setReload((value) => value + 1);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saveLock.current || syncLock.current) return;
    setFormError("");
    const resolution = form.resolution?.trim() || null;
    if ((resolution === null) !== (form.resolved_date === null)) {
      setFormError("Enter both a resolution and its date, or leave both empty."); return;
    }
    if (form.resolved_date && form.resolved_date < form.incident_date) {
      setFormError("Resolution date cannot be before the incident."); return;
    }
    if (form.description.trim().length < 10 || (resolution && resolution.length < 3)) {
      setFormError("Describe the problem in at least 10 characters and the resolution in at least 3."); return;
    }
    saveLock.current = true;
    setSaving(true);
    setNotice("");
    let saved: SupplierIncident;
    try {
      saved = await supplierIncidentsApi.create({ ...form, description: form.description.trim(), resolution });
    } catch (error) {
      setFormError(errorText(error));
      setSaving(false);
      saveLock.current = false;
      return;
    }
    // Clear the form only after database confirmation. Never repeat create after a sync error.
    setForm(newForm());
    setPage(1);
    setIncidents((rows) => [saved, ...rows.filter((row) => row.id !== saved.id)].slice(0, 20));
    setTotal((value) => value + 1);
    setSaving(false);
    saveLock.current = false;
    await syncMemory(saved.id);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Supplier Incidents</h1>
        <p className="mt-1 text-sm text-gray-600">Record delivery problems and what resolved them, so the next order can benefit from past experience.</p>
      </header>
      {notice && <p role="status" className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-gray-800">{notice}</p>}
      {loadError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <p>{loadError}</p><Button variant="secondary" className="mt-2" onClick={() => setReload((n) => n + 1)}>Retry loading</Button>
      </div>}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Record an incident</h2>
          {!loading && !loadError && !suppliers.length && <p className="mb-4 text-sm text-amber-800">Add a supplier from Add Purchase first, then return here.</p>}
          <form onSubmit={submit} className="space-y-4">
            <fieldset disabled={saving || syncing !== null || loading || !!loadError || !suppliers.length} className="space-y-4 disabled:opacity-60">
              <Select id="incident-supplier" label="Supplier" required value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}>
                <option value="">Choose a supplier</option>
                {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </Select>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input id="incident-date" label="Incident date" type="date" required value={form.incident_date} onChange={(e) => setForm({ ...form, incident_date: e.target.value })} />
                <Select id="incident-type" label="Problem type" value={form.incident_type} onChange={(e) => setForm({ ...form, incident_type: e.target.value as IncidentType })}>
                  {Object.entries(TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </Select>
              </div>
              <div className="space-y-1">
                <label htmlFor="incident-description" className="block text-sm font-medium text-gray-700">What happened?</label>
                <textarea id="incident-description" required minLength={10} maxLength={3000} rows={4} value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Include promised and actual delivery dates, quantities and damage details when known."
                  className="w-full rounded-lg border border-gray-300 p-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div className="space-y-1">
                <label htmlFor="incident-resolution" className="block text-sm font-medium text-gray-700">How was it resolved? (optional)</label>
                <textarea id="incident-resolution" minLength={3} maxLength={2000} rows={3} value={form.resolution ?? ""}
                  onChange={(e) => setForm({ ...form, resolution: e.target.value || null })}
                  placeholder="Record only the action and outcome that actually happened."
                  className="w-full rounded-lg border border-gray-300 p-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <Input id="resolution-date" label="Resolution date (if resolved)" type="date" min={form.incident_date} value={form.resolved_date ?? ""}
                onChange={(e) => setForm({ ...form, resolved_date: e.target.value || null })} />
              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.is_demo} onChange={(e) => setForm({ ...form, is_demo: e.target.checked })} className="mt-1" />
                This is synthetic data for a demo.
              </label>
              <p className="text-xs text-gray-500">Use factual details. Records in this first version cannot be edited after saving.</p>
              <Button type="submit" loading={saving} className="w-full">Save incident & remember</Button>
            </fieldset>
            {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
          </form>
        </section>
        <section className="space-y-4" aria-label="Incident history">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Incident history <span className="text-sm font-normal text-gray-500">({total})</span></h2>
            <Button variant="secondary" disabled={loading || saving || syncing !== null} onClick={() => setReload((n) => n + 1)}>Refresh</Button>
          </div>
          {loading ? <p role="status" className="p-6 text-gray-500">Loading incidents...</p> : !loadError && incidents.length === 0 ?
            <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">No incidents recorded yet. Add the first one using the form.</div> : null}
          {!loading && incidents.map((incident) => <article key={incident.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><h3 className="font-semibold text-gray-900">{incident.supplier_name}</h3><p className="mt-1 text-xs text-gray-500">{incident.incident_date} · {TYPES[incident.incident_type]}</p></div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${incident.memory_status === "synced" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                {syncing === incident.id ? "Syncing memory..." : incident.memory_status === "synced" ? "Remembered" : "Saved · memory pending"}
              </span>
            </div>
            {incident.is_demo && <p className="mt-2 text-xs font-semibold text-purple-700">SYNTHETIC DEMO</p>}
            <p className="mt-3 whitespace-pre-wrap break-words text-sm text-gray-800">{incident.description}</p>
            <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm">
              <p className="font-medium">{incident.resolution ? `Resolution · ${incident.resolved_date}` : "Resolution not recorded"}</p>
              {incident.resolution && <p className="mt-1 whitespace-pre-wrap break-words text-gray-600">{incident.resolution}</p>}
            </div>
            <p className="mt-3 break-all text-xs text-gray-400">Record ID: {incident.id}</p>
            {incident.memory_status === "pending" && <Button variant="secondary" className="mt-3" disabled={syncing !== null || saving} loading={syncing === incident.id} onClick={() => void syncMemory(incident.id)}>Retry memory sync</Button>}
          </article>)}
          <div className="flex items-center justify-between gap-3">
            <Button variant="secondary" disabled={page <= 1 || loading || saving || syncing !== null} onClick={() => setPage((value) => value - 1)}>Previous</Button>
            <span className="text-sm text-gray-500">Page {page} of {Math.max(1, Math.ceil(total / 20))}</span>
            <Button variant="secondary" disabled={page * 20 >= total || loading || saving || syncing !== null} onClick={() => setPage((value) => value + 1)}>Next</Button>
          </div>
        </section>
      </div>
    </div>
  );
}
