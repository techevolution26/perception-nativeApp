import { useCallback, useRef } from "react";
import { apiFetch } from "../lib/api";
import type { FollowToggle } from "../types/models";

type UpdateFn = (followed: boolean) => void;
type ErrorFn = (error: unknown) => void;

/**
 * Canonical user-to-user follow mutation.
 *
 * Screens own presentation state; this hook owns the API mutation and
 * prevents duplicate requests for the same target user.
 */
export default function useFollowToggle() {
  const pendingIds = useRef(new Set<number>());

  return useCallback(
    async (
      userId: number,
      isFollowing: boolean,
      updateFn: UpdateFn,
      onError?: ErrorFn,
    ): Promise<boolean> => {
      if (pendingIds.current.has(userId)) return false;

      pendingIds.current.add(userId);

      try {
        const method = isFollowing ? "DELETE" : "POST";
        const result = await apiFetch<FollowToggle>(
          `/api/users/${userId}/follow`,
          { method },
        );
        const followed = result.followed ?? !isFollowing;
        updateFn(followed);
        return followed;
      } catch (error) {
        onError?.(error);
        return isFollowing;
      } finally {
        pendingIds.current.delete(userId);
      }
    },
    [],
  );
}
