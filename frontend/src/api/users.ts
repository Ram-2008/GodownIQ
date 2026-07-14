import { api } from "./client";
import { Role } from "../auth/AuthContext";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "revoked";

export interface UserProfile {
  id: string;
  full_name: string;
  role: Role;
  whatsapp_number: string | null;
  approval_status: ApprovalStatus;
  created_at: string;
}

export const usersApi = {
  list: () => api.get<{ users: UserProfile[] }>("/auth/users").then((r) => r.users),
  invite: (email: string, full_name: string, whatsapp_number?: string) =>
    api.post("/auth/invite-staff", { email, full_name, whatsapp_number: whatsapp_number || undefined }),
  update: (id: string, patch: { full_name?: string; whatsapp_number?: string | null }) =>
    api.patch<{ user: UserProfile }>(`/auth/users/${id}`, patch).then((r) => r.user),
  approve: (id: string) => api.post<{ user: UserProfile }>(`/auth/users/${id}/approve`).then((r) => r.user),
  reject: (id: string) => api.post<{ user: UserProfile }>(`/auth/users/${id}/reject`).then((r) => r.user),
  revoke: (id: string) => api.post<{ user: UserProfile }>(`/auth/users/${id}/revoke`).then((r) => r.user),
  remove: (id: string) => api.delete<void>(`/auth/users/${id}`),
};
