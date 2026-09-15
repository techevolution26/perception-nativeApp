// lib/perceptionAnalytics.ts
//
// Canonical client-side telemetry for Perception interactions.
// The backend remains responsible for deduplication and persistence.

import { apiFetch } from "./api";

type PerceptionAnalyticsEvent = "VIEW" | "SHARE";

interface AnalyticsEventRequest {
  perception_id: number;
  event_type: PerceptionAnalyticsEvent;
}

export async function recordPerceptionAnalyticsEvent(
  perceptionId: number,
  eventType: PerceptionAnalyticsEvent,
): Promise<void> {
  const payload: AnalyticsEventRequest = {
    perception_id: perceptionId,
    event_type: eventType,
  };

  await apiFetch<void>("/api/analytics/events", {
    method: "POST",
    body: JSON.stringify(payload),
    json: false,
  });
}
