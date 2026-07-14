import { useRef, useState } from "react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Select } from "./ui/Select";
import { useToast } from "./Toast";
import { fileToBase64, photoEntryApi, PhotoParseResult } from "../api/photoEntry";
import { ApiClientError } from "../api/client";
import { UNITS, Unit } from "../types/domain";
import { todayISO } from "../utils/date";

interface ReviewRow {
  item_name: string;
  quantity: string;
  unit: Unit;
  unit_price: string;
  total_amount: string;
}

function toReviewRows(result: PhotoParseResult): ReviewRow[] {
  return result.line_items.map((li) => ({
    item_name: li.item,
    quantity: String(li.quantity),
    unit: li.unit,
    unit_price: String(li.unit_price),
    total_amount: String(li.total),
  }));
}

export function PhotoBillEntry({ onSaved }: { onSaved: () => void }) {
  const { show } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parseFailed, setParseFailed] = useState(false);

  const [supplierName, setSupplierName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(todayISO());
  const [gstAmount, setGstAmount] = useState("");
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  function reset() {
    setSupplierName("");
    setInvoiceNumber("");
    setPurchaseDate(todayISO());
    setGstAmount("");
    setRows([]);
    setParseFailed(false);
    setSelectedFile(null);
  }

  async function handleFileSelected(file: File) {
    setOpen(true);
    setParsing(true);
    setParseFailed(false);
    setSelectedFile(file);
    try {
      const result = await photoEntryApi.parse(file);
      setSupplierName(result.supplier_name ?? "");
      setInvoiceNumber(result.invoice_number ?? "");
      setPurchaseDate(result.date ?? todayISO());
      setGstAmount(result.gst_amount != null ? String(result.gst_amount) : "");
      setRows(toReviewRows(result));
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Couldn't read that bill. You can enter it manually instead.";
      show(message, "error");
      setParseFailed(true);
    } finally {
      setParsing(false);
    }
  }

  function updateRow(index: number, patch: Partial<ReviewRow>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const line_items = rows.map((r) => ({
        item_name: r.item_name.trim(),
        quantity: parseFloat(r.quantity),
        unit: r.unit,
        unit_price: parseFloat(r.unit_price),
        total_amount: parseFloat(r.total_amount),
      }));
      const image_base64 = selectedFile ? await fileToBase64(selectedFile) : undefined;
      const media_type = selectedFile ? ((selectedFile.type || "image/jpeg") as "image/jpeg" | "image/png" | "image/webp") : undefined;
      await photoEntryApi.save({
        supplier_name: supplierName.trim() || undefined,
        invoice_number: invoiceNumber.trim() || undefined,
        purchase_date: purchaseDate,
        gst_amount: gstAmount ? parseFloat(gstAmount) : undefined,
        line_items,
        image_base64,
        media_type,
      });
      show(`Saved ${line_items.length} purchase${line_items.length === 1 ? "" : "s"} from the bill.`, "success");
      setOpen(false);
      reset();
      onSaved();
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not save these purchases.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelected(file);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="mb-4 w-full rounded-xl border border-dashed border-gray-300 bg-white py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
      >
        Scan a bill photo
      </button>

      {open && (
        <Modal title="Review bill" onClose={() => setOpen(false)}>
          <div className="mb-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
            Always verify extracted amounts against the bill before saving.
          </div>

          {parsing ? (
            <div className="py-8 text-center text-sm text-gray-400">Reading the bill…</div>
          ) : parseFailed ? (
            <div className="py-6 text-center text-sm text-gray-500">
              Couldn't read this bill automatically.
              <div className="mt-3">
                <Button variant="secondary" onClick={() => setOpen(false)}>
                  Close and enter manually
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Supplier" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
                <Input label="Invoice number" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Date" type="date" value={purchaseDate} max={todayISO()} onChange={(e) => setPurchaseDate(e.target.value)} />
                <Input label="GST amount (₹, optional)" type="number" step="0.01" value={gstAmount} onChange={(e) => setGstAmount(e.target.value)} />
              </div>

              <div className="flex flex-col gap-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Line items</div>
                {rows.map((row, i) => (
                  <div key={i} className="rounded-lg border border-gray-200 p-3">
                    <Input label="Item" value={row.item_name} onChange={(e) => updateRow(i, { item_name: e.target.value })} />
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Input
                        label="Quantity"
                        type="number"
                        step="0.01"
                        value={row.quantity}
                        onChange={(e) => updateRow(i, { quantity: e.target.value })}
                      />
                      <Select label="Unit" value={row.unit} onChange={(e) => updateRow(i, { unit: e.target.value as Unit })}>
                        {UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Input
                        label="Unit price (₹)"
                        type="number"
                        step="0.01"
                        value={row.unit_price}
                        onChange={(e) => updateRow(i, { unit_price: e.target.value })}
                      />
                      <Input
                        label="Total (₹)"
                        type="number"
                        step="0.01"
                        value={row.total_amount}
                        onChange={(e) => updateRow(i, { total_amount: e.target.value })}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <Button onClick={handleSave} loading={saving} disabled={rows.length === 0}>
                Save {rows.length} purchase{rows.length === 1 ? "" : "s"}
              </Button>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
