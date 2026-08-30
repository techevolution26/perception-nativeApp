// lib/api.ts
//
// Unlike the web app, there's no Next.js BFF proxy layer here — a native
// app has no same-origin/CORS constraint forcing requests through a
// server-side hop, so this calls the FastAPI backend directly. Same
// backend, same JWT-bearer contract, one fewer layer.
import { getToken } from "./storage";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, message?: string) {
    super(message || `Request failed with status ${status}`);
    this.status = status;
    this.body = body;
  }
}

interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: BodyInit | Record<string, unknown> | null;
  auth?: boolean; // attach Authorization header (default true)
  json?: boolean; // JSON.stringify a plain-object body (default true unless body is FormData)
}

// The web app ended up patching "clear the stale token on 401" into several
// separate call sites (useCurrentUser, NewPerceptionForm) as bugs surfaced
// one at a time. Centralizing it here means any authenticated request that
// comes back 401 anywhere in the app triggers the same single cleanup path
// — registered by useAuthStore at startup, so this module never has to
// import the store directly (would be circular).
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void): void {
  onUnauthorized = fn;
}

export async function apiFetch<T = unknown>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { auth = true, json, body, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(headers as Record<string, string>),
  };

  let sentAuthHeader = false;
  if (auth) {
    const token = await getToken();
    if (token) {
      finalHeaders.Authorization = `Bearer ${token}`;
      sentAuthHeader = true;
    }
  }

  let finalBody: BodyInit | null | undefined;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const shouldJson = json ?? (body != null && !isFormData && typeof body !== "string");

  if (shouldJson) {
    finalHeaders["Content-Type"] = "application/json";
    finalBody = JSON.stringify(body);
  } else {
    finalBody = body as BodyInit | null | undefined;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: finalBody,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    // Only a *stale/expired session* should trigger a global logout — a 401
    // on a request that never carried a token (e.g. an anonymous guest
    // browsing) is not a session expiry, it's just "this needs login."
    if (res.status === 401 && sentAuthHeader) {
      onUnauthorized?.();
    }
    throw new ApiError(res.status, data, typeof data?.detail === "string" ? data.detail : undefined);
  }

  return data as T;
}

export { API_BASE };
