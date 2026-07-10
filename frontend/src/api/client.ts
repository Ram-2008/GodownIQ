import { supabaseAuth } from "../auth/supabaseClient";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export class ApiClientError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabaseAuth.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(await authHeader()),
      ...(options.headers ?? {}),
    },
  });

  const contentType = res.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await res.json() : undefined;

  if (!res.ok) {
    throw new ApiClientError(res.status, body?.error ?? res.statusText, body?.details);
  }

  return body as T;
}

/** For CSV/file downloads: returns a Blob instead of parsing JSON. */
export async function apiDownload(path: string): Promise<Blob> {
  const res = await fetch(`${BASE_URL}${path}`, { headers: await authHeader() });
  if (!res.ok) {
    const body = await res.json().catch(() => undefined);
    throw new ApiClientError(res.status, body?.error ?? res.statusText);
  }
  return res.blob();
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
