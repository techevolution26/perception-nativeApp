import { useCallback, useRef } from "react";
import { apiFetch } from "../lib/api";

export const PERCEPTION_REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "hate", label: "Hate or hateful conduct" },
  { value: "sexual", label: "Sexual content" },
  { value: "violence", label: "Violence or threats" },
  { value: "misinformation", label: "Misinformation" },
  { value: "impersonation", label: "Impersonation" },
  { value: "privacy", label: "Privacy concern" },
  { value: "other", label: "Something else" },
] as const;

export type PerceptionReportReason = (typeof PERCEPTION_REPORT_REASONS)[number]["value"];

interface CreateReportResponse {
  id: number;
  perception_id: number;
  reason: PerceptionReportReason;
  details: string | null;
  status: "pending" | "reviewed" | "actioned" | "dismissed";
}

type ErrorFn = (error: unknown) => void;

/** Canonical report mutation. Reporting is a moderation event, not a local perception state toggle. */
export default function useReportPerception() {
  const pendingIds = useRef(new Set<number>());

  return useCallback(
    async (
      perceptionId: number,
      reason: PerceptionReportReason,
      details?: string,
      onError?: ErrorFn,
    ): Promise<boolean> => {
      if (pendingIds.current.has(perceptionId)) return false;
      pendingIds.current.add(perceptionId);

      try {
        await apiFetch<CreateReportResponse>(
          `/api/perceptions/${perceptionId}/reports`,
          {
            method: "POST",
            body: { reason, details: details?.trim() || null },
          },
        );
        return true;
      } catch (error) {
        onError?.(error);
        return false;
      } finally {
        pendingIds.current.delete(perceptionId);
      }
    },
    [],
  );
}
