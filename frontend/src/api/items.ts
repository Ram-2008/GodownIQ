import { api } from "./client";
import { Item, Unit } from "../types/domain";

export const itemsApi = {
  list: (q?: string) => api.get<{ items: Item[] }>(`/items${q ? `?q=${encodeURIComponent(q)}` : ""}`).then((r) => r.items),
  create: (name: string, default_unit: Unit) => api.post<{ item: Item }>("/items", { name, default_unit }).then((r) => r.item),
  update: (id: string, patch: Partial<Pick<Item, "name" | "default_unit" | "track_stock" | "low_stock_threshold">>) =>
    api.patch<{ item: Item }>(`/items/${id}`, patch).then((r) => r.item),
};
