import { useEffect, useState } from "react";
import { Autocomplete, AutocompleteOption } from "../components/ui/Autocomplete";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { QuickAddChips } from "../components/QuickAddChips";
import { NlQuickEntry } from "../components/NlQuickEntry";
import { PhotoBillEntry } from "../components/PhotoBillEntry";
import { CardSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/Toast";
import { itemsApi } from "../api/items";
import { suppliersApi } from "../api/suppliers";
import { purchasesApi } from "../api/purchases";
import { NlParseResult } from "../api/nlEntry";
import { EntrySource, Item, QuickChip, Supplier, UNITS, Unit } from "../types/domain";
import { todayISO } from "../utils/date";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function PurchaseEntryPage() {
  const { show } = useToast();
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [chips, setChips] = useState<QuickChip[]>([]);

  const [itemText, setItemText] = useState("");
  const [itemId, setItemId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<Unit>("kg");
  const [unitPrice, setUnitPrice] = useState("");
  const [total, setTotal] = useState("");
  const [totalTouched, setTotalTouched] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState(todayISO());
  const [supplierText, setSupplierText] = useState("");
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [gstAmount, setGstAmount] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "pending">("paid");
  const [paymentDueDate, setPaymentDueDate] = useState("");
  const [note, setNote] = useState("");
  const [entrySource, setEntrySource] = useState<EntrySource>("form");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([itemsApi.list(), suppliersApi.list(), purchasesApi.quickChips()])
      .then(([itemsRes, suppliersRes, chipsRes]) => {
        setItems(itemsRes);
        setSuppliers(suppliersRes);
        setChips(chipsRes);
      })
      .catch(() => show("Could not load items/suppliers. Try refreshing.", "error"))
      .finally(() => setLoadingLookups(false));
  }, [show]);

  useEffect(() => {
    if (totalTouched) return;
    const q = parseFloat(quantity);
    const p = parseFloat(unitPrice);
    if (Number.isFinite(q) && Number.isFinite(p)) {
      setTotal(round2(q * p).toString());
    } else {
      setTotal("");
    }
  }, [quantity, unitPrice, totalTouched]);

  const itemOptions: AutocompleteOption[] = items.map((i) => ({ id: i.id, name: i.name, subtitle: i.default_unit }));
  const supplierOptions: AutocompleteOption[] = suppliers.map((s) => ({ id: s.id, name: s.name }));

  function handlePickChip(chip: QuickChip) {
    setItemText(chip.item_name);
    setItemId(chip.item_id);
    setUnit(chip.unit);
    setUnitPrice(chip.last_unit_price.toString());
    setQuantity(chip.median_quantity.toString());
    setTotalTouched(false);
    setEntrySource("quick_chip");
    window.scrollTo({ top: window.scrollY + 200, behavior: "smooth" });
  }

  async function refreshLookups() {
    const [itemsRes, chipsRes] = await Promise.all([itemsApi.list(), purchasesApi.quickChips()]);
    setItems(itemsRes);
    setChips(chipsRes);
  }

  function handleNlParsed(result: NlParseResult) {
    const matchedItem = items.find((i) => i.name.toLowerCase() === result.item.trim().toLowerCase());
    setItemText(result.item);
    setItemId(matchedItem?.id ?? null);
    setUnit(result.unit);
    setQuantity(result.quantity.toString());
    setUnitPrice(result.unit_price.toString());
    setTotal(result.total_amount.toString());
    setTotalTouched(true);
    if (result.supplier_name) {
      const matchedSupplier = suppliers.find((s) => s.name.toLowerCase() === result.supplier_name!.trim().toLowerCase());
      setSupplierText(result.supplier_name);
      setSupplierId(matchedSupplier?.id ?? null);
    }
    setPaymentStatus(result.payment_status);
    setEntrySource("nl_text");
  }

  function resetForm() {
    setItemText("");
    setItemId(null);
    setQuantity("");
    setUnitPrice("");
    setTotal("");
    setTotalTouched(false);
    setSupplierText("");
    setSupplierId(null);
    setInvoiceNumber("");
    setGstAmount("");
    setPaymentStatus("paid");
    setPaymentDueDate("");
    setNote("");
    setEntrySource("form");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const matchedItem = items.find((i) => i.id === itemId && i.name.toLowerCase() === itemText.trim().toLowerCase());
      const matchedSupplier = suppliers.find(
        (s) => s.id === supplierId && s.name.toLowerCase() === supplierText.trim().toLowerCase()
      );

      await purchasesApi.create({
        item_id: matchedItem?.id,
        item_name: matchedItem ? undefined : itemText.trim(),
        default_unit_for_new_item: unit,
        quantity: parseFloat(quantity),
        unit,
        unit_price: parseFloat(unitPrice),
        total_amount: parseFloat(total),
        purchase_date: purchaseDate,
        supplier_id: matchedSupplier?.id,
        supplier_name: !matchedSupplier && supplierText.trim() ? supplierText.trim() : undefined,
        invoice_number: invoiceNumber.trim() || undefined,
        gst_amount: gstAmount ? parseFloat(gstAmount) : undefined,
        payment_status: paymentStatus,
        payment_due_date: paymentStatus === "pending" && paymentDueDate ? paymentDueDate : undefined,
        note: note.trim() || undefined,
        entry_source: entrySource,
      });

      show("Purchase saved.", "success");
      resetForm();
      await refreshLookups();
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not save the purchase.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingLookups) {
    return (
      <div className="flex flex-col gap-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-4 text-xl font-bold text-gray-900">Add Purchase</h1>

      <QuickAddChips chips={chips} onPick={handlePickChip} />

      <NlQuickEntry onParsed={handleNlParsed} />

      <PhotoBillEntry onSaved={refreshLookups} />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <Autocomplete
          label="Item"
          required
          options={itemOptions}
          value={itemText}
          onChange={(text) => {
            setItemText(text);
            setItemId(null);
          }}
          onSelectExisting={(option) => {
            setItemText(option.name);
            setItemId(option.id);
            const matched = items.find((i) => i.id === option.id);
            if (matched) setUnit(matched.default_unit);
          }}
          placeholder="e.g. Rice"
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Quantity"
            type="number"
            step="0.01"
            min="0.01"
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <Select label="Unit" value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Unit price (₹)"
            type="number"
            step="0.01"
            min="0"
            required
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
          />
          <Input
            label="Total (₹)"
            type="number"
            step="0.01"
            min="0"
            required
            value={total}
            onChange={(e) => {
              setTotal(e.target.value);
              setTotalTouched(true);
            }}
          />
        </div>

        <Input
          label="Date"
          type="date"
          required
          value={purchaseDate}
          max={todayISO()}
          onChange={(e) => setPurchaseDate(e.target.value)}
        />

        <Autocomplete
          label="Supplier (optional)"
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
          placeholder="e.g. Sharma Traders"
        />

        <div className="grid grid-cols-2 gap-3">
          <Input label="Invoice number" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
          <Input
            label="GST amount (₹)"
            type="number"
            step="0.01"
            min="0"
            value={gstAmount}
            onChange={(e) => setGstAmount(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-700">Payment</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPaymentStatus("paid")}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                paymentStatus === "paid" ? "border-brand-600 bg-brand-50 text-brand-700" : "border-gray-300 text-gray-600"
              }`}
            >
              Paid
            </button>
            <button
              type="button"
              onClick={() => setPaymentStatus("pending")}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                paymentStatus === "pending" ? "border-brand-600 bg-brand-50 text-brand-700" : "border-gray-300 text-gray-600"
              }`}
            >
              Pending
            </button>
          </div>
          {paymentStatus === "pending" && (
            <Input
              label="Due date (optional)"
              type="date"
              value={paymentDueDate}
              onChange={(e) => setPaymentDueDate(e.target.value)}
            />
          )}
        </div>

        <Input label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />

        <Button type="submit" loading={submitting} className="w-full">
          Save purchase
        </Button>
      </form>
    </div>
  );
}
