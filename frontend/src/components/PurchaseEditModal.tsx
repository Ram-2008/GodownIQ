import { useEffect, useState } from "react";
import { Modal } from "./ui/Modal";
import { Input } from "./ui/Input";
import { Select } from "./ui/Select";
import { Button } from "./ui/Button";
import { Autocomplete, AutocompleteOption } from "./ui/Autocomplete";
import { useToast } from "./Toast";
import { purchasesApi } from "../api/purchases";
import { suppliersApi } from "../api/suppliers";
import { Purchase, Supplier, UNITS, Unit } from "../types/domain";

export function PurchaseEditModal({
  purchase,
  onClose,
  onSaved,
  onDeleted,
}: {
  purchase: Purchase;
  onClose: () => void;
  onSaved: (updated: Purchase) => void;
  onDeleted: (id: string) => void;
}) {
  const { show } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [quantity, setQuantity] = useState(String(purchase.quantity));
  const [unit, setUnit] = useState<Unit>(purchase.unit);
  const [unitPrice, setUnitPrice] = useState(String(purchase.unit_price));
  const [total, setTotal] = useState(String(purchase.total_amount));
  const [purchaseDate, setPurchaseDate] = useState(purchase.purchase_date);
  const [supplierText, setSupplierText] = useState(purchase.supplier_name ?? "");
  const [supplierId, setSupplierId] = useState<string | null>(purchase.supplier_id);
  const [invoiceNumber, setInvoiceNumber] = useState(purchase.invoice_number ?? "");
  const [gstAmount, setGstAmount] = useState(purchase.gst_amount != null ? String(purchase.gst_amount) : "");
  const [paymentStatus, setPaymentStatus] = useState(purchase.payment_status);
  const [paymentDueDate, setPaymentDueDate] = useState(purchase.payment_due_date ?? "");
  const [note, setNote] = useState(purchase.note ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingBill, setLoadingBill] = useState(false);

  useEffect(() => {
    suppliersApi.list().then(setSuppliers).catch(() => undefined);
  }, []);

  const supplierOptions: AutocompleteOption[] = suppliers.map((s) => ({ id: s.id, name: s.name }));

  async function handleSave() {
    setSaving(true);
    try {
      const matchedSupplier = suppliers.find((s) => s.id === supplierId && s.name.toLowerCase() === supplierText.trim().toLowerCase());
      const updated = await purchasesApi.update(purchase.id, {
        quantity: parseFloat(quantity),
        unit,
        unit_price: parseFloat(unitPrice),
        total_amount: parseFloat(total),
        purchase_date: purchaseDate,
        supplier_id: matchedSupplier?.id ?? (supplierText.trim() ? supplierId : null),
        invoice_number: invoiceNumber.trim() || null,
        gst_amount: gstAmount ? parseFloat(gstAmount) : null,
        payment_status: paymentStatus,
        payment_due_date: paymentStatus === "pending" && paymentDueDate ? paymentDueDate : null,
        note: note.trim() || null,
      });
      show("Purchase updated.", "success");
      onSaved(updated);
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not update the purchase.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleViewBill() {
    setLoadingBill(true);
    try {
      const url = await purchasesApi.billImageUrl(purchase.id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not load the bill photo.", "error");
    } finally {
      setLoadingBill(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this purchase? This can't be undone from the app.")) return;
    setDeleting(true);
    try {
      await purchasesApi.remove(purchase.id);
      show("Purchase deleted.", "success");
      onDeleted(purchase.id);
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not delete the purchase.", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal title={`Edit ${purchase.item_name}`} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Quantity" type="number" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          <Select label="Unit" value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Unit price (₹)" type="number" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
          <Input label="Total (₹)" type="number" step="0.01" value={total} onChange={(e) => setTotal(e.target.value)} />
        </div>
        <Input label="Date" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
        <Autocomplete
          label="Supplier"
          options={supplierOptions}
          value={supplierText}
          onChange={(text) => {
            setSupplierText(text);
            setSupplierId(null);
          }}
          onSelectExisting={(option) => {
            setSupplierText(option.name);
            setSupplierId(option.id);
          }}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Invoice number" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
          <Input label="GST amount (₹)" type="number" step="0.01" value={gstAmount} onChange={(e) => setGstAmount(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-700">Payment</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPaymentStatus("paid")}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${paymentStatus === "paid" ? "border-brand-600 bg-brand-50 text-brand-700" : "border-gray-300 text-gray-600"}`}
            >
              Paid
            </button>
            <button
              type="button"
              onClick={() => setPaymentStatus("pending")}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${paymentStatus === "pending" ? "border-brand-600 bg-brand-50 text-brand-700" : "border-gray-300 text-gray-600"}`}
            >
              Pending
            </button>
          </div>
          {paymentStatus === "pending" && (
            <Input label="Due date" type="date" value={paymentDueDate} onChange={(e) => setPaymentDueDate(e.target.value)} />
          )}
        </div>
        <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} />

        {purchase.bill_image_path && (
          <Button variant="secondary" onClick={handleViewBill} loading={loadingBill}>
            View bill photo
          </Button>
        )}

        <div className="flex gap-2">
          <Button variant="danger" onClick={handleDelete} loading={deleting} className="flex-1">
            Delete
          </Button>
          <Button onClick={handleSave} loading={saving} className="flex-1">
            Save changes
          </Button>
        </div>
      </div>
    </Modal>
  );
}
