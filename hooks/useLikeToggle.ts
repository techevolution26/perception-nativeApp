// hooks/useLikeToggle.ts
import { useCallback } from "react";
import { apiFetch } from "../lib/api";
import type { Perception, LikeToggle } from "../types/models";

type UpdateFn = (id: number, liked: boolean, likesCount: number) => void;

export default function useLikeToggle() {
  return useCallback(async (perception: Perception, updateFn: UpdateFn) => {
    const method = perception.liked_by_user ? "DELETE" : "POST";
    const json = await apiFetch<LikeToggle>(`/api/perceptions/${perception.id}/like`, { method });
    updateFn(perception.id, json.liked, json.likes_count);
  }, []);
}
