import { ThinkingLevel } from "@google/genai";
import { env } from "../config/env";
import { extractJsonBlock, getGeminiClient } from "../config/geminiClient";
import { ApiError, BadRequestError } from "../middleware/errors";
import { nlParseResultSchema, NlParseResult } from "../validation/nlEntry";
import { normalizePhotoParseResult, photoParseResultSchema, PhotoParseResult } from "../validation/photoEntry";

// Model pinned per product spec — this is the app's own runtime dependency on the
// Gemini API, independent of whichever model is answering this coding session.
const NL_PARSE_MODEL = "gemini-3.5-flash";
const PHOTO_PARSE_MODEL = "gemini-3.5-flash";

const SYSTEM_PROMPT = `You extract structured purchase records from short notes written by warehouse staff in India, often in Hinglish (mixed Hindi-English). Never translate item or supplier names — keep them exactly as written (e.g. "chawal" stays "chawal", do not change it to "rice").

Respond with ONLY a JSON object and nothing else — no markdown fences, no explanation. Shape:
{"item": string, "quantity": number, "unit": "kg"|"litre"|"pieces"|"bags"|"quintal", "unit_price": number, "total_amount": number, "supplier_name": string|null, "payment_status": "paid"|"pending"}

Rules:
- quantity, unit_price, and total_amount must be mutually consistent — if the text only states two of the three, compute the third (total_amount = quantity * unit_price).
- If payment status is not mentioned, use "paid".
- If no supplier is mentioned, use null for supplier_name.
- If the text does not clearly describe a single purchase, respond with exactly {"error": "unparseable"} instead.`;

export async function parsePurchaseText(text: string): Promise<NlParseResult> {
  if (!env.geminiConfigured) {
    throw new BadRequestError("AI text parsing isn't set up for this workspace yet. Please fill the form manually.");
  }

  let rawText: string | undefined;
  try {
    const response = await getGeminiClient().models.generateContent({
      model: NL_PARSE_MODEL,
      contents: text,
      // This is a deterministic extraction task, not a reasoning task — without capping
      // thinking, the model can spend most of maxOutputTokens "thinking" and truncate the
      // actual JSON answer, which shows up as an intermittent, hard-to-reproduce parse failure.
      config: { systemInstruction: SYSTEM_PROMPT, maxOutputTokens: 1500, thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } },
    });
    rawText = response.text;
  } catch (err) {
    console.error("Gemini NL parse request failed:", err);
    throw new ApiError(502, "Couldn't reach the AI parser. Please fill the form manually.");
  }

  if (!rawText) {
    throw new BadRequestError("Couldn't parse that — please fill the form manually.");
  }

  const parsedJson = extractJsonBlock(rawText) as { error?: string } | null;
  if (!parsedJson || parsedJson.error) {
    throw new BadRequestError("Couldn't parse that — please fill the form manually.");
  }

  const result = nlParseResultSchema.safeParse(parsedJson);
  if (!result.success) {
    throw new BadRequestError("Couldn't parse that — please fill the form manually.");
  }

  return result.data;
}

const PHOTO_SYSTEM_PROMPT = `You extract structured data from a photo of a supplier bill/invoice for a small warehouse business in India.

Respond with ONLY a JSON object and nothing else — no markdown fences, no explanation. Shape:
{"supplier_name": string|null, "invoice_number": string|null, "date": "YYYY-MM-DD"|null, "line_items": [{"item": string, "quantity": number, "unit": string, "unit_price": number, "total": number}], "gst_amount": number|null}

Rules:
- Include one line_items entry per distinct product line on the bill.
- unit should be one of: kg, litre, pieces, bags, quintal — pick the closest match to what's printed (e.g. "pcs" -> "pieces", "ltr" -> "litre").
- If unit_price or total is missing for a line, compute it from quantity and the other value.
- If the date is not clearly printed, use null.
- If the image does not appear to be a bill or invoice, respond with exactly {"error": "not_a_bill"}.`;

export async function parseBillPhoto(imageBase64: string, mediaType: "image/jpeg" | "image/png" | "image/webp"): Promise<PhotoParseResult> {
  if (!env.geminiConfigured) {
    throw new BadRequestError("AI photo parsing isn't set up for this workspace yet. Please enter the bill manually.");
  }

  let rawText: string | undefined;
  try {
    const response = await getGeminiClient().models.generateContent({
      model: PHOTO_PARSE_MODEL,
      contents: [
        {
          role: "user",
          parts: [{ inlineData: { mimeType: mediaType, data: imageBase64 } }, { text: "Extract this bill's data as JSON." }],
        },
      ],
      config: { systemInstruction: PHOTO_SYSTEM_PROMPT, maxOutputTokens: 3000, thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } },
    });
    rawText = response.text;
  } catch (err) {
    console.error("Gemini photo parse request failed:", err);
    throw new ApiError(502, "Couldn't reach the AI parser. Please enter the bill manually.");
  }

  if (!rawText) {
    throw new BadRequestError("Couldn't read that bill — please enter it manually.");
  }

  const parsedJson = extractJsonBlock(rawText) as { error?: string } | null;
  if (!parsedJson || parsedJson.error) {
    throw new BadRequestError("Couldn't read that bill — please enter it manually.");
  }

  const result = photoParseResultSchema.safeParse(parsedJson);
  if (!result.success) {
    throw new BadRequestError("Couldn't read that bill clearly — please enter it manually.");
  }

  return normalizePhotoParseResult(result.data);
}
