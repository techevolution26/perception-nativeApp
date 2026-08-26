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

export async function apiFetch<T = unknown>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { auth = true, json, body, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(headers as Record<string, string>),
  };

  if (auth) {
    const token = await getToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
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
    throw new ApiError(res.status, data, typeof data?.detail === "string" ? data.detail : undefined);
  }

  return data as T;
}

export { API_BASE };
