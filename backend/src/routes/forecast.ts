import { Router } from "express";
import { authenticate, requireOwner } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { getForecast, regenerateForecast } from "../services/forecastService";

export const forecastRouter = Router();

forecastRouter.use(authenticate, requireOwner);

forecastRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const forecast = await getForecast(req.supabase!);
    res.json(forecast);
  })
);

forecastRouter.post(
  "/regenerate",
  asyncHandler(async (req, res) => {
    const forecast = await regenerateForecast(req.supabase!);
    res.json(forecast);
  })
);
