import { useCallback, useRef } from "react";
import { apiFetch } from "../lib/api";
import { queryClient } from "../lib/queryClient";
import type { FollowToggle } from "../types/models";

type UpdateFn = (followed: boolean) => void;
type ErrorFn = (error: unknown) => void;

/**
 * Canonical user-to-topic follow mutation.
 *
 * Topic interest is deliberately separate from user-to-user following so
 * recommendation and intelligence layers can distinguish the two signals.
 */
export default function useTopicFollowToggle() {
  const pendingIds = useRef(new Set<number>());

  return useCallback(
    async (
      topicId: number,
      isFollowing: boolean,
      updateFn: UpdateFn,
      onError?: ErrorFn,
    ): Promise<boolean> => {
      if (pendingIds.current.has(topicId)) return false;

      pendingIds.current.add(topicId);

      try {
        const method = isFollowing ? "DELETE" : "POST";
        const result = await apiFetch<FollowToggle>(
          `/api/topics/${topicId}/follow`,
          { method },
        );
        const followed = result.followed ?? !isFollowing;
        queryClient.invalidateQueries({ queryKey: ["topics"] });
        updateFn(followed);
        return followed;
      } catch (error) {
        onError?.(error);
        return isFollowing;
      } finally {
        pendingIds.current.delete(topicId);
      }
    },
    [],
  );
}
