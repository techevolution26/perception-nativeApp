// hooks/useConversations.ts
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { UserWithUnread } from "../types/models";

export function useConversations(enabled: boolean) {
  return useQuery<UserWithUnread[]>({
    queryKey: ["conversations"],
    queryFn: () => apiFetch<UserWithUnread[]>("/api/conversations"),
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}
