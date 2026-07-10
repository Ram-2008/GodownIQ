/**
 * Dev-only seed script — generates ~75 days of realistic warehouse purchase history.
 * Guarded against production use. Run with: npm run seed --workspace backend
 *
 * Requires at least one profile to already exist (sign up through the app once first).
 * Optionally set SEED_USER_EMAIL to attribute seeded rows to a specific account;
 * otherwise the first profile found is used.
 */
import "dotenv/config";
import { addDays, format, subDays } from "date-fns";
import { createClient } from "@supabase/supabase-js";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed data in production (NODE_ENV=production).");
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in backend/.env before seeding.");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const TODAY = new Date();
const HISTORY_DAYS = 75;
const dateStr = (d: Date) => format(d, "yyyy-MM-dd");

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomFloat(min: number, max: number, decimals = 2): number {
  const v = Math.random() * (max - min) + min;
  return Number(v.toFixed(decimals));
}
function pick<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

async function getSeedProfile(): Promise<{ id: string; full_name: string }> {
  const email = process.env.SEED_USER_EMAIL;
  if (email) {
    const { data: userList, error } = await db.auth.admin.listUsers();
    if (error) throw error;
    const match = userList.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!match) throw new Error(`No auth user found with email ${email}`);
    const { data: profile, error: profileError } = await db.from("profiles").select("id, full_name").eq("id", match.id).single();
    if (profileError || !profile) throw new Error(`No profile row for ${email} — sign up through the app first.`);
    return profile;
  }

  const { data, error } = await db.from("profiles").select("id, full_name").limit(1).single();
  if (error || !data) {
    throw new Error("No profiles found. Sign up through the app once (to create the owner account) before seeding.");
  }
  return data;
}

async function findOrCreateItem(name: string, defaultUnit: string, trackStock: boolean, threshold?: number): Promise<{ id: string; current_stock: number | null }> {
  const { data: existing } = await db.from("items").select("id, current_stock").ilike("name", name).maybeSingle();
  if (existing) return existing;
  const { data, error } = await db
    .from("items")
    .insert({ name, default_unit: defaultUnit, track_stock: trackStock, low_stock_threshold: threshold ?? null })
    .select("id, current_stock")
    .single();
  if (error || !data) throw error ?? new Error(`Could not create item ${name}`);
  return data;
}

async function findOrCreateSupplier(name: string, phone?: string): Promise<string> {
  const { data: existing } = await db.from("suppliers").select("id").ilike("name", name).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await db.from("suppliers").insert({ name, phone: phone ?? null }).select("id").single();
  if (error || !data) throw error ?? new Error(`Could not create supplier ${name}`);
  return data.id;
}

interface PurchaseSeed {
  itemId: string;
  itemTrackStock: boolean;
  supplierId: string;
  date: Date;
  quantity: number;
  unit: string;
  unitPrice: number;
  gstAmount?: number;
  paymentStatus: "paid" | "pending";
  paymentDueDate?: Date;
  invoiceNumber?: string;
  createdBy: string;
}

async function insertPurchase(p: PurchaseSeed): Promise<string> {
  const totalAmount = Number((p.quantity * p.unitPrice).toFixed(2));
  const { data: purchase, error } = await db
    .from("purchases")
    .insert({
      item_id: p.itemId,
      quantity: p.quantity,
      unit: p.unit,
      unit_price: p.unitPrice,
      total_amount: totalAmount,
      purchase_date: dateStr(p.date),
      supplier_id: p.supplierId,
      invoice_number: p.invoiceNumber ?? null,
      gst_amount: p.gstAmount ?? null,
      payment_status: p.paymentStatus,
      payment_due_date: p.paymentDueDate ? dateStr(p.paymentDueDate) : null,
      entry_source: "form",
      created_by: p.createdBy,
    })
    .select("id")
    .single();
  if (error || !purchase) throw error ?? new Error("Could not insert seed purchase");

  await db.from("purchase_audit_log").insert({
    purchase_id: purchase.id,
    action: "create",
    changed_by: p.createdBy,
    new_values: { item_id: p.itemId, quantity: p.quantity, unit_price: p.unitPrice, total_amount: totalAmount },
  });

  if (p.itemTrackStock) {
    await db.from("stock_movements").insert({
      item_id: p.itemId,
      type: "in",
      quantity: p.quantity,
      movement_date: dateStr(p.date),
      purchase_id: purchase.id,
      created_by: p.createdBy,
    });
  }

  return purchase.id;
}

async function seedRegularItem(opts: {
  itemId: string;
  itemTrackStock: boolean;
  supplierId: string;
  createdBy: string;
  unit: string;
  intervalDays: number;
  jitterDays: number;
  qtyRange: [number, number];
  priceAt: (daysAgo: number) => number;
  pendingChance?: number;
}) {
  let daysAgo = HISTORY_DAYS;
  while (daysAgo > 0) {
    const date = subDays(TODAY, daysAgo);
    const isPending = Math.random() < (opts.pendingChance ?? 0.1);
    await insertPurchase({
      itemId: opts.itemId,
      itemTrackStock: opts.itemTrackStock,
      supplierId: opts.supplierId,
      date,
      quantity: randomFloat(opts.qtyRange[0], opts.qtyRange[1]),
      unit: opts.unit,
      unitPrice: opts.priceAt(daysAgo),
      paymentStatus: isPending ? "pending" : "paid",
      paymentDueDate: isPending ? addDays(date, pick([7, 14, -3])) : undefined,
      createdBy: opts.createdBy,
    });
    daysAgo -= opts.intervalDays + randomInt(-opts.jitterDays, opts.jitterDays);
  }
}

async function main() {
  console.log("Seeding GodownIQ dev data...");
  const profile = await getSeedProfile();
  console.log(`Attributing seed data to ${profile.full_name} (${profile.id})`);

  const rice = await findOrCreateItem("Rice", "kg", false);
  const wheat = await findOrCreateItem("Wheat", "kg", false);
  const sugar = await findOrCreateItem("Sugar", "kg", false);
  const oil = await findOrCreateItem("Oil", "litre", false);
  const diesel = await findOrCreateItem("Diesel", "litre", true, 50);
  const bags = await findOrCreateItem("Bags", "pieces", true, 200);

  const sharma = await findOrCreateSupplier("Sharma Traders", "+919812345001");
  const patelOil = await findOrCreateSupplier("Patel Oil Co", "+919812345002");
  const bharatBags = await findOrCreateSupplier("Bharat Bags Pvt Ltd", "+919812345003");
  const fuelStation = await findOrCreateSupplier("Highway Fuel Station");

  // Rice — steady weekly buying, stable price.
  await seedRegularItem({
    itemId: rice.id,
    itemTrackStock: false,
    supplierId: sharma,
    createdBy: profile.id,
    unit: "kg",
    intervalDays: 6,
    jitterDays: 1,
    qtyRange: [40, 60],
    priceAt: () => randomFloat(42, 45),
  });

  // Wheat — every ~5 days.
  await seedRegularItem({
    itemId: wheat.id,
    itemTrackStock: false,
    supplierId: sharma,
    createdBy: profile.id,
    unit: "kg",
    intervalDays: 5,
    jitterDays: 1,
    qtyRange: [30, 50],
    priceAt: () => randomFloat(28, 31),
  });

  // Sugar — stable ~₹41/kg for most of the window, then a sharp last-purchase spike to
  // ~₹48/kg (the "one anomaly" — >15% above the trailing average).
  let sugarDaysAgo = HISTORY_DAYS;
  while (sugarDaysAgo > 7) {
    await insertPurchase({
      itemId: sugar.id,
      itemTrackStock: false,
      supplierId: sharma,
      date: subDays(TODAY, sugarDaysAgo),
      quantity: randomFloat(20, 35),
      unit: "kg",
      unitPrice: randomFloat(40, 42),
      paymentStatus: "paid",
      createdBy: profile.id,
    });
    sugarDaysAgo -= 7 + randomInt(-1, 1);
  }
  await insertPurchase({
    itemId: sugar.id,
    itemTrackStock: false,
    supplierId: sharma,
    date: subDays(TODAY, 1),
    quantity: 30,
    unit: "kg",
    unitPrice: 48,
    paymentStatus: "paid",
    createdBy: profile.id,
  });

  // Oil — the "one price-rise trend": gradually climbs over the whole window.
  await seedRegularItem({
    itemId: oil.id,
    itemTrackStock: false,
    supplierId: patelOil,
    createdBy: profile.id,
    unit: "litre",
    intervalDays: 10,
    jitterDays: 2,
    qtyRange: [15, 25],
    priceAt: (daysAgo) => {
      const progress = 1 - daysAgo / HISTORY_DAYS; // 0 (oldest) -> 1 (newest)
      return Number((95 + progress * 20).toFixed(2)); // ₹95 -> ₹115/litre
    },
  });

  // Diesel — tracked stock, bought every ~4 days (drives both stock levels and the
  // recurring-reminder example from the spec), with regular stock-out usage between fills.
  let dieselDaysAgo = HISTORY_DAYS;
  const dieselPurchaseDates: Date[] = [];
  while (dieselDaysAgo > 6) {
    const date = subDays(TODAY, dieselDaysAgo);
    dieselPurchaseDates.push(date);
    await insertPurchase({
      itemId: diesel.id,
      itemTrackStock: true,
      supplierId: fuelStation,
      date,
      quantity: randomFloat(80, 100),
      unit: "litre",
      unitPrice: randomFloat(88, 94),
      paymentStatus: "paid",
      createdBy: profile.id,
    });
    dieselDaysAgo -= 4;
  }
  // Last diesel purchase was 6 days ago with a consistent ~4-day cadence — mirrors the
  // spec's own recurring-reminder example ("last purchase was 6 days ago").
  for (let d = HISTORY_DAYS; d > 6; d -= randomInt(2, 5)) {
    const date = subDays(TODAY, d);
    await db.from("stock_movements").insert({
      item_id: diesel.id,
      type: "out",
      quantity: randomFloat(15, 25),
      movement_date: dateStr(date),
      created_by: profile.id,
    });
  }

  // Bags — tracked stock, irregular buying, occasional stock-out.
  let bagsDaysAgo = HISTORY_DAYS;
  while (bagsDaysAgo > 0) {
    await insertPurchase({
      itemId: bags.id,
      itemTrackStock: true,
      supplierId: bharatBags,
      date: subDays(TODAY, bagsDaysAgo),
      quantity: randomInt(300, 600),
      unit: "pieces",
      unitPrice: randomFloat(4, 5.5),
      gstAmount: randomFloat(50, 200),
      invoiceNumber: `BB-${randomInt(1000, 9999)}`,
      paymentStatus: bagsDaysAgo < 10 && Math.random() < 0.4 ? "pending" : "paid",
      paymentDueDate: bagsDaysAgo < 10 ? addDays(subDays(TODAY, bagsDaysAgo), 15) : undefined,
      createdBy: profile.id,
    });
    bagsDaysAgo -= randomInt(12, 20);
  }
  for (let d = HISTORY_DAYS; d > 0; d -= randomInt(5, 10)) {
    await db.from("stock_movements").insert({
      item_id: bags.id,
      type: "out",
      quantity: randomInt(100, 250),
      movement_date: dateStr(subDays(TODAY, d)),
      created_by: profile.id,
    });
  }

  // Illustrative alerts, matching the spec's own worked examples.
  await db.from("alerts").insert([
    {
      type: "price_anomaly",
      message: "Sugar at ₹48/kg is 17% above your ₹41 average",
      related_id: null,
    },
    {
      type: "reorder_reminder",
      message: "You usually buy Diesel every 4 days — last purchase was 6 days ago",
      related_id: diesel.id,
    },
  ]);

  console.log("Seed complete: 6 items, 4 suppliers, ~75 days of purchase history, stock movements, and sample alerts.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  });
