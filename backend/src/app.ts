import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { healthRouter } from "./routes/health";
import { authRouter } from "./routes/auth";
import { itemsRouter } from "./routes/items";
import { suppliersRouter } from "./routes/suppliers";
import { purchasesRouter } from "./routes/purchases";
import { dashboardRouter } from "./routes/dashboard";
import { calendarRouter } from "./routes/calendar";
import { alertsRouter } from "./routes/alerts";
import { paymentsRouter } from "./routes/payments";
import { reportsRouter } from "./routes/reports";
import { stockRouter } from "./routes/stock";
import { comparisonRouter } from "./routes/comparison";
import { supplierComparisonRouter } from "./routes/supplierComparison";
import { nlEntryRouter } from "./routes/nlEntry";
import { forecastRouter } from "./routes/forecast";
import { photoEntryRouter } from "./routes/photoEntry";
import { whatsappRouter } from "./routes/whatsapp";
import { auditLogRouter } from "./routes/auditLog";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();

  // Correct req.protocol/host behind Railway/Render's reverse proxy — needed to
  // reconstruct the exact URL Twilio signed for webhook signature validation.
  app.set("trust proxy", true);

  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_URLS,
      credentials: true,
    })
  );
  app.use(morgan(env.isProduction ? "combined" : "dev"));
  app.use(express.json({ limit: "10mb" })); // 10mb to allow base64 bill photos on the JSON body route

  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/items", itemsRouter);
  app.use("/api/suppliers", suppliersRouter);
  app.use("/api/purchases", purchasesRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/calendar", calendarRouter);
  app.use("/api/alerts", alertsRouter);
  app.use("/api/payments", paymentsRouter);
  app.use("/api/reports", reportsRouter);
  app.use("/api/stock", stockRouter);
  app.use("/api/comparison", comparisonRouter);
  app.use("/api/supplier-comparison", supplierComparisonRouter);
  app.use("/api/nl-entry", nlEntryRouter);
  app.use("/api/forecast", forecastRouter);
  app.use("/api/photo-entry", photoEntryRouter);
  app.use("/api/webhooks/whatsapp", whatsappRouter);
  app.use("/api/audit-log", auditLogRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
