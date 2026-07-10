import twilio from "twilio";
import { env } from "../config/env";
import { PurchaseWithNames } from "./purchaseService";

export function isValidTwilioRequest(signature: string | undefined, url: string, params: Record<string, unknown>): boolean {
  if (!env.twilioConfigured || !signature) return false;
  return twilio.validateRequest(env.TWILIO_AUTH_TOKEN, signature, url, params as Record<string, string>);
}

export function stripWhatsappPrefix(from: string): string {
  return from.replace(/^whatsapp:/i, "").trim();
}

function formatCompactINR(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  const formatted = Number.isInteger(rounded)
    ? new Intl.NumberFormat("en-IN").format(rounded)
    : new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(rounded);
  return `₹${formatted}`;
}

export function buildConfirmationReply(purchase: PurchaseWithNames): string {
  const supplierPart = purchase.supplier_name ? ` from ${purchase.supplier_name}` : "";
  return `Logged: ${purchase.quantity}${purchase.unit} ${purchase.item_name} @ ${formatCompactINR(purchase.unit_price)} = ${formatCompactINR(
    purchase.total_amount
  )}${supplierPart} ✓`;
}

export const WHATSAPP_UNREGISTERED_REPLY =
  "This WhatsApp number isn't registered with GodownIQ. Ask the warehouse owner to add it to your profile.";

export const WHATSAPP_AMBIGUOUS_REPLY =
  "Couldn't understand that. Please resend in the format: item quantity price (e.g. \"rice 50kg 2200\").";

export function buildTwiml(message: string): string {
  const MessagingResponse = twilio.twiml.MessagingResponse;
  const response = new MessagingResponse();
  response.message(message);
  return response.toString();
}
