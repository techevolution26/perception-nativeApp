// hooks/usePerceptionDetail.ts
import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../lib/api";
import useAuthStore from "../store/useAuthStore";
import type { Perception, Comment } from "../types/models";

interface UsePerceptionDetailResult {
  perception: Perception | null;
  comments: Comment[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  setPerception: React.Dispatch<React.SetStateAction<Perception | null>>;
  setComments: React.Dispatch<React.SetStateAction<Comment[]>>;
}

function normalize(list: Comment[] = []): Comment[] {
  return list.map((c) => ({ ...c, replies: normalize(c.replies || []) }));
}

export function usePerceptionDetail(id: number | string): UsePerceptionDetailResult {
  const [perception, setPerception] = useState<Perception | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hydrated = useAuthStore((s) => s.hydrated);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, c] = await Promise.all([
        apiFetch<Perception>(`/api/perceptions/${id}`),
        apiFetch<Comment[]>(`/api/perceptions/${id}/comments`),
      ]);
      setPerception(p);
      setComments(normalize(c));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id && hydrated) load();
  }, [id, hydrated, load]);

  return { perception, comments, loading, error, reload: load, setPerception, setComments };
}
