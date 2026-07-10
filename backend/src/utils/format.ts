import { format, parseISO } from "date-fns";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

export function formatINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "";
  return inr.format(amount);
}

export function formatDDMMYYYY(date: string | null | undefined): string {
  if (!date) return "";
  return format(parseISO(date), "dd-MM-yyyy");
}
