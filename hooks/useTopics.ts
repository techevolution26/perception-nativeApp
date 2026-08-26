// hooks/useTopics.ts
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { Topic, TopicsResponse } from "../types/models";

export default function useTopics() {
  return useQuery<Topic[]>({
    queryKey: ["topics"],
    queryFn: async () => {
      const data = await apiFetch<Topic[] | TopicsResponse>("/api/topics", { auth: false });
      return Array.isArray(data) ? data : data.topics;
    },
    staleTime: 1000 * 60 * 5,
  });
}
