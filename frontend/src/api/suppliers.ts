import { api } from "./client";
import { Supplier } from "../types/domain";

export const suppliersApi = {
  list: () => api.get<{ suppliers: Supplier[] }>("/suppliers").then((r) => r.suppliers),
  create: (name: string, phone?: string) =>
    api.post<{ supplier: Supplier }>("/suppliers", { name, phone }).then((r) => r.supplier),
  update: (id: string, patch: Partial<Pick<Supplier, "name" | "phone">>) =>
    api.patch<{ supplier: Supplier }>(`/suppliers/${id}`, patch).then((r) => r.supplier),
};
