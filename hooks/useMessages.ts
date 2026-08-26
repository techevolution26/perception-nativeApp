// hooks/useMessages.ts
import { useInfiniteQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { MessagesPage } from "../types/models";

export function useMessages(peerId: number | null, enabled: boolean) {
  return useInfiniteQuery<MessagesPage>({
    queryKey: ["messages", peerId],
    queryFn: async ({ pageParam = 1 }) => {
      const messages = await apiFetch<MessagesPage["data"]>(
        `/api/conversations/${peerId}?page=${pageParam}&limit=20`
      );
      return { data: messages, nextPage: undefined };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: Boolean(peerId) && enabled,
    staleTime: 1000 * 60 * 5,
  });
}
