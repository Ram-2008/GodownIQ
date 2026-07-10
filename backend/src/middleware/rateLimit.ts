import rateLimit from "express-rate-limit";
import { Request } from "express";

function keyByUser(req: Request): string {
  return req.profile?.id ?? req.ip ?? "anonymous";
}

export const nlParseRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  keyGenerator: keyByUser,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "You've hit the natural-language entry limit (30/hour). Try the form instead, or wait a bit." },
});

export const photoParseRateLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: 20,
  keyGenerator: keyByUser,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "You've hit the photo bill limit (20/day). Please enter the remaining bills manually today." },
});
