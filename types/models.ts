// app/types/models.ts
//
// Thin, readable aliases over the raw generated OpenAPI types in api.d.ts.
// Regenerate api.d.ts whenever the backend contract changes:
//
//   npx openapi-typescript http://localhost:8000/openapi.json -o app/types/api.d.ts
//
// These aliases rarely need to change even when the underlying schema
// does — that's the point of keeping them separate from the generated file.
import type { components } from "./api";

export type Perception = components["schemas"]["PerceptionOut"];
export type Topic = components["schemas"]["TopicOut"];
export type TopicSlim = components["schemas"]["TopicSlim"];
export type Comment = components["schemas"]["CommentOut"];
export type UserProfile = components["schemas"]["UserProfile"];
export type UserMe = components["schemas"]["UserMe"];
export type UserSlim = components["schemas"]["UserSlim"];
export type UserWithUnread = components["schemas"]["UserWithUnread"];
export type Notification = components["schemas"]["NotificationsListOut"]["data"][number];
export type Message = components["schemas"]["MessageOut"];
export type LikeToggle = components["schemas"]["LikeToggleOut"];
export type FollowToggle = components["schemas"]["FollowToggleOut"];
export type AuthResponse = components["schemas"]["AuthResponse"];

// No dedicated "UserPublic" schema exists on the backend — it's an internal
// base class that's never returned directly (only UserProfile / UserMe,
// both of which extend it, are ever used as a response_model). UserProfile
// is a strict superset of those public fields, so it doubles as this alias.
export type UserPublic = UserProfile;

// These come straight from the generated schema — the backend declares
// proper response_models for both list endpoints now, rather than this
// file having to hand-maintain the envelope shape.
export type TopicsResponse = components["schemas"]["TopicsListOut"];
export type NotificationsResponse = components["schemas"]["NotificationsListOut"];

// Client-only optimistic-UI fields layered on top of a real Message while a
// send is in flight — never present in what the API actually returns.
export interface DisplayMessage extends Message {
  sending?: boolean;
  delivered?: boolean;
}

// Shape of one page of useMessages' useInfiniteQuery result — shared by
// useMessages, ChatWindow, MessageInput, and the /messages page so they all
// agree on what queryClient.getQueryData(["messages", peerId]) contains.
export interface MessagesPage {
  data: DisplayMessage[];
  nextPage: number | undefined;
}

// Recharts-free, editor-friendly union of the two notification "kinds" the
// UI branches on — narrower than the generic `data: Record<string, unknown>`
// the generated Notification.data field has (Pydantic's `dict` maps to
// `Record<string, never>` in the schema, which isn't useful to consume).
export interface PerceptionNotificationData {
  type: "perception";
  perception_id: number;
  body: string;
  topic: string;
}
export interface DailyNotificationData {
  type: "daily";
  body: string;
  topic: string;
}
export type NotificationData = PerceptionNotificationData | DailyNotificationData;
