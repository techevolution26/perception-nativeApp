import { useCallback, useRef } from "react";
import { apiFetch } from "../lib/api";
import type { Perception, SaveToggle } from "../types/models";

type UpdateFn = (saved: boolean) => void;
type ErrorFn = (error: unknown) => void;

/** Canonical save/unsave mutation for Perceptions. */
export default function useSaveToggle() {
  const pendingIds = useRef(new Set<number>());

  return useCallback(
    async (
      perception: Perception,
      updateFn: UpdateFn,
      onError?: ErrorFn,
    ): Promise<boolean> => {
      if (pendingIds.current.has(perception.id)) return Boolean(perception.saved_by_user);

      pendingIds.current.add(perception.id);

      try {
        const method = perception.saved_by_user ? "DELETE" : "POST";
        const result = await apiFetch<SaveToggle>(
          `/api/perceptions/${perception.id}/save`,
          { method },
        );
        updateFn(result.saved);
        return result.saved;
      } catch (error) {
        onError?.(error);
        return Boolean(perception.saved_by_user);
      } finally {
        pendingIds.current.delete(perception.id);
      }
    },
    [],
  );
}
