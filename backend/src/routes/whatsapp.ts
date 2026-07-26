import express, { Router } from "express";
import { format } from "date-fns";
import { env } from "../config/env";
import { asyncHandler } from "../middleware/asyncHandler";
import { supabaseAdmin } from "../config/supabase";
import { parsePurchaseText } from "../services/geminiService";
import { createPurchase } from "../services/purchaseService";
import {
  buildConfirmationReply,
  buildTwiml,
  isValidTwilioRequest,
  stripWhatsappPrefix,
  WHATSAPP_AMBIGUOUS_REPLY,
  WHATSAPP_UNREGISTERED_REPLY,
} from "../services/twilioService";
import { AuthenticatedProfile } from "../types/express";

function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export const whatsappRouter = Router();

whatsappRouter.use(express.urlencoded({ extended: false }));

whatsappRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    if (!env.twilioConfigured) {
      res.status(404).send("WhatsApp entry is not enabled.");
      return;
    }

    const from = String(req.body.From ?? "");
    const body = String(req.body.Body ?? "");
    console.log(`[whatsapp] inbound from=${from} body=${JSON.stringify(body)}`);

    const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
    const signature = req.header("X-Twilio-Signature");
    if (!isValidTwilioRequest(signature, fullUrl, req.body)) {
      console.warn("[whatsapp] rejected request with invalid Twilio signature");
      res.status(403).send("Invalid signature");
      return;
    }

    const whatsappNumber = stripWhatsappPrefix(from);
    const { data: profileRow, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, role, whatsapp_number")
      .eq("whatsapp_number", whatsappNumber)
      .maybeSingle();

    if (profileError) console.error("[whatsapp] profile lookup failed:", profileError.message);

    if (!profileRow) {
      res.type("text/xml").send(buildTwiml(WHATSAPP_UNREGISTERED_REPLY));
      return;
    }
    const profile = profileRow as AuthenticatedProfile;

    try {
      const parsed = await parsePurchaseText(body);
      const purchase = await createPurchase(supabaseAdmin, profile, {
        item_name: parsed.item,
        quantity: parsed.quantity,
        unit: parsed.unit,
        unit_price: parsed.unit_price,
        total_amount: parsed.total_amount,
        purchase_date: todayISO(),
        supplier_name: parsed.supplier_name ?? undefined,
        payment_status: parsed.payment_status,
        entry_source: "whatsapp",
      });
      res.type("text/xml").send(buildTwiml(buildConfirmationReply(purchase)));
    } catch (err) {
      console.error("[whatsapp] could not log purchase from message:", err);
      res.type("text/xml").send(buildTwiml(WHATSAPP_AMBIGUOUS_REPLY));
    }
  })
);
