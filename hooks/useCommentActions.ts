import { useCallback, useRef } from "react";
import { File } from "expo-file-system";
import { apiFetch } from "../lib/api";
import type { Comment } from "../types/models";

export interface CommentMedia {
  uri: string;
}

type CommentActionError = (error: unknown) => void;

function buildForm(body: string, media: CommentMedia | null): FormData {
  const form = new FormData();

  if (body.trim()) {
    form.append("body", body.trim());
  }

  if (media) {
    form.append("media", new File(media.uri));
  }

  return form;
}

/**
 * Canonical comment/reply mutations for the native client.
 *
 * All comment creation flows use this hook so request construction,
 * duplicate-submission protection, and error handling stay consistent.
 */
export default function useCommentActions() {
  const pendingKeys = useRef(new Set<string>());

  const createComment = useCallback(
    async (
      perceptionId: number | string,
      body: string,
      media: CommentMedia | null = null,
      onError?: CommentActionError,
    ): Promise<Comment | null> => {
      const key = `perception:${perceptionId}`;
      if (pendingKeys.current.has(key)) return null;

      pendingKeys.current.add(key);

      try {
        return await apiFetch<Comment>(`/api/perceptions/${perceptionId}/comments`, {
          method: "POST",
          body: buildForm(body, media),
          json: false,
        });
      } catch (error) {
        onError?.(error);
        return null;
      } finally {
        pendingKeys.current.delete(key);
      }
    },
    [],
  );

  const createReply = useCallback(
    async (
      commentId: number | string,
      body: string,
      media: CommentMedia | null = null,
      onError?: CommentActionError,
    ): Promise<Comment | null> => {
      const key = `comment:${commentId}`;
      if (pendingKeys.current.has(key)) return null;

      pendingKeys.current.add(key);

      try {
        return await apiFetch<Comment>(`/api/comments/${commentId}/replies`, {
          method: "POST",
          body: buildForm(body, media),
          json: false,
        });
      } catch (error) {
        onError?.(error);
        return null;
      } finally {
        pendingKeys.current.delete(key);
      }
    },
    [],
  );

  return { createComment, createReply };
}
