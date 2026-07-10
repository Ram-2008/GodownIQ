import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { photoParseRateLimit } from "../middleware/rateLimit";
import { photoParseRequestSchema, savePhotoEntrySchema } from "../validation/photoEntry";
import { parseBillPhoto } from "../services/claudeService";
import { saveConfirmedPhotoEntries } from "../services/photoEntryService";

export const photoEntryRouter = Router();

photoEntryRouter.use(authenticate);

photoEntryRouter.post(
  "/parse",
  photoParseRateLimit,
  asyncHandler(async (req, res) => {
    const { image_base64, media_type } = photoParseRequestSchema.parse(req.body);
    const result = await parseBillPhoto(image_base64, media_type);
    res.json({ result });
  })
);

photoEntryRouter.post(
  "/save",
  asyncHandler(async (req, res) => {
    const input = savePhotoEntrySchema.parse(req.body);
    const purchases = await saveConfirmedPhotoEntries(req.supabase!, req.profile!, input);
    res.status(201).json({ purchases });
  })
);
