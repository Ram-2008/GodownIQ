import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { nlParseRateLimit } from "../middleware/rateLimit";
import { nlParseRequestSchema } from "../validation/nlEntry";
import { parsePurchaseText } from "../services/geminiService";

export const nlEntryRouter = Router();

nlEntryRouter.use(authenticate);

nlEntryRouter.post(
  "/parse",
  nlParseRateLimit,
  asyncHandler(async (req, res) => {
    const { text } = nlParseRequestSchema.parse(req.body);
    const result = await parsePurchaseText(text);
    res.json({ result });
  })
);
