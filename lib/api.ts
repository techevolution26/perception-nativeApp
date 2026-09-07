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

export function getValidationErrors(error: unknown): Record<string, string[]> {
  if (!(error instanceof ApiError)) return {};

  const body = error.body as {
    errors?: unknown;
    detail?: unknown;
  } | null;

  if (body?.errors && typeof body.errors === "object" && !Array.isArray(body.errors)) {
    const entries = Object.entries(body.errors as Record<string, unknown>).map(([field, value]) => [
      field,
      Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [],
    ] as const);
    return Object.fromEntries(entries);
  }

  if (Array.isArray(body?.detail)) {
    const result: Record<string, string[]> = {};
    for (const item of body.detail) {
      if (!item || typeof item !== "object") continue;
      const record = item as { loc?: unknown; msg?: unknown };
      const loc = Array.isArray(record.loc) ? record.loc : [];
      const field = typeof loc[loc.length - 1] === "string" ? String(loc[loc.length - 1]) : "form";
      const message = typeof record.msg === "string" ? record.msg : "Invalid value.";
      (result[field] ??= []).push(message);
    }
    return result;
  }

  return {};
}

export function getAuthErrorMessage(error: unknown, fallback = "Authentication failed. Please try again."): string {
  if (!(error instanceof ApiError)) return fallback;

  if (error.status === 403) {
    const detail = (error.body as { detail?: unknown } | null)?.detail;
    return typeof detail === "string" ? detail : "This account is not allowed to sign in.";
  }

  if (error.status === 429) {
    return "Too many login attempts. Please try again shortly.";
  }

  if (error.status === 503) {
    return "Authentication is temporarily unavailable. Please try again later.";
  }

  if (error.status === 422) {
    const detail = (error.body as { detail?: unknown } | null)?.detail;
    const errors = getValidationErrors(error);
    const firstValidationError = Object.values(errors).flat().find((message): message is string => typeof message === "string");

    if (firstValidationError && /credentials are incorrect/i.test(firstValidationError)) {
      return "Invalid email or password. Please check your credentials.";
    }

    if (typeof detail === "string") return detail;
    if (firstValidationError) return firstValidationError;
    return "Invalid email or password. Please check your credentials.";
  }

  return error.message === `Request failed with status ${error.status}` ? fallback : error.message;
}

interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: BodyInit | Record<string, unknown> | null;
  auth?: boolean; // attach Authorization header (default true)
  json?: boolean; // JSON.stringify a plain-object body (default true unless body is FormData)
  clearOnUnauthorized?: boolean; // disable global session cleanup for explicit logout
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
  const { auth = true, json, body, headers, clearOnUnauthorized = true, ...rest } = options;

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
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { detail: text.slice(0, 500) };
    }
  }

  if (!res.ok) {
    // Only a *stale/expired session* should trigger a global logout — a 401
    // on a request that never carried a token (e.g. an anonymous guest
    // browsing) is not a session expiry, it's just "this needs login."
    if (res.status === 401 && sentAuthHeader && clearOnUnauthorized) {
      onUnauthorized?.();
    }
    throw new ApiError(res.status, data, typeof (data as { detail?: unknown } | null)?.detail === "string" ? (data as { detail: string }).detail : undefined);
  }

  return data as T;
}

export { API_BASE };

/**
 * The backend returns media/avatar URLs as root-relative paths
 * (`/storage/perceptions/xyz.jpg`) — correct for the web app, which proxies
 * `/storage/*` through Next.js's rewrites so the browser resolves it
 * against its own origin. There is no such origin here: this app calls
 * the backend directly, so a relative path has nothing to resolve
 * against and silently fails to load (shows blank, not an error) in
 * `expo-image`/`expo-video`. This prefixes the API base onto anything
 * that isn't already an absolute URL.
 */
export function resolveMediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url) || url.startsWith("file://") || url.startsWith("data:")) {
    return url;
  }
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}
