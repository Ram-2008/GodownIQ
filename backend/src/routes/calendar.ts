import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { calendarDayQuerySchema, calendarMonthQuerySchema } from "../validation/calendar";
import { getCalendarDay, getCalendarMonth } from "../services/calendarService";

export const calendarRouter = Router();

calendarRouter.use(authenticate);

calendarRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { year, month } = calendarMonthQuerySchema.parse(req.query);
    const days = await getCalendarMonth(req.supabase!, year, month);
    res.json({ days });
  })
);

calendarRouter.get(
  "/day",
  asyncHandler(async (req, res) => {
    const { date } = calendarDayQuerySchema.parse(req.query);
    const purchases = await getCalendarDay(req.supabase!, req.profile!, date);
    res.json({ purchases });
  })
);
