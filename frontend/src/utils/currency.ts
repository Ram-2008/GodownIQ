const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const inrNoDecimals = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatINR(amount: number, opts?: { decimals?: boolean }): string {
  if (!Number.isFinite(amount)) return "₹0";
  return opts?.decimals === false ? inrNoDecimals.format(amount) : inr.format(amount);
}

export function formatIndianNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}
