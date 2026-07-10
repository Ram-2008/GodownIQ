import { api } from "./client";
import { Alert } from "../types/domain";

export const alertsApi = {
  list: () => api.get<{ alerts: Alert[] }>("/alerts").then((r) => r.alerts),
  dismiss: (id: string) => api.patch<{ alert: Alert }>(`/alerts/${id}/dismiss`).then((r) => r.alert),
};
