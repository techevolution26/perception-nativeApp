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
export type UserSlim = components["schemas"]["UserSlim"] & { professional_industries: string[]; professional_roles: string[]; primary_professional_role: string | null; primary_professional_role_label: string | null; professional_role_labels: string[]; verified_professional_roles: string[]; };
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
  edited_at?: string | null;
  deleted_at?: string | null;
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
export interface FollowNotificationData { type: "follow"; actor_id: number; actor_name: string; message: string; }
export interface ActionNotificationData { type: "perception_like" | "perception_comment" | "comment_reply" | "message"; perception_id?: number; comment_id?: number; message_id?: number; actor_id?: number; actor_name?: string; body?: string; }
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
export type NotificationData = PerceptionNotificationData | DailyNotificationData | FollowNotificationData | ActionNotificationData;

export interface ProfessionalIndustry { code: string; label: string; }
export interface ProfessionalRole { code: string; label: string; industry_code: string; icon: string; }
export interface ProfessionalTaxonomy { industries: ProfessionalIndustry[]; roles: ProfessionalRole[]; }

export interface AnalyticsProfileFields {
  professional_focus: string | null;
  country_code: string | null;
  region: string | null;
  city: string | null;
  analytics_specialties: number[];
  primary_analytics_topic_id: number | null;
  verification_status: string;
  verification_badge: string | null;
  professional_industries: string[];
  professional_roles: string[];
  primary_professional_role: string | null;
  primary_professional_role_label: string | null;
  professional_role_labels: string[];
  verified_professional_roles: string[];
}

export type UserMe = components["schemas"]["UserMe"] & AnalyticsProfileFields;
export type UserProfile = components["schemas"]["UserProfile"] & AnalyticsProfileFields & { is_following: boolean; can_message: boolean };

export interface Plan {
  id: number;
  code: string;
  name: string;
  description: string;
  price_cents: number;
  currency: string;
  interval: string;
  analytics_enabled: boolean;
  max_topics: number;
  verification_included: boolean;
  trial_days: number;
}

export interface Subscription {
  id: number | null;
  status: string;
  plan: Plan | null;
  starts_at: string | null;
  ends_at: string | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  analytics_enabled: boolean;
  max_topics: number;
  verification_included: boolean;
}

export interface BillingInvoice {
  id: string;
  number: string | null;
  status: string | null;
  currency: string | null;
  amount_due: number;
  amount_paid: number;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  created_at: string | null;
  period_start: string | null;
  period_end: string | null;
}

export interface AnalyticsTopic {
  topic_id: number;
  topic_name: string;
  perception_count: number;
  likes: number;
  comments: number;
  views: number;
  shares: number;
  interactions: number;
  engagement_rate: number;
  signal_strength: number;
  signal_score: number;
  unique_participants: number;
  previous_perception_count: number;
  growth_rate: number;
  momentum: string;
  evidence_level: string;
}

export interface AnalyticsGeo {
  country_code: string;
  perception_count: number;
  interactions: number;
  engagement_rate: number;
  share_of_perceptions: number;
}

export interface AnalyticsTrendPoint {
  date: string;
  perceptions: number;
  interactions: number;
}

export interface AnalyticsOpportunity {
  topic_id: number;
  topic_name: string;
  reason: string;
  signal_strength: number;
  signal_score: number;
  growth_rate: number;
  sample_size: number;
  unique_participants: number;
  evidence_level: string;
}

export interface AnalyticsInsight {
  kind: string;
  title: string;
  detail: string;
  confidence: string;
}

export interface AnalyticsRelationship {
  topic_a_id: number;
  topic_a_name: string;
  topic_b_id: number;
  topic_b_name: string;
  shared_participants: number;
  participant_overlap: number;
  relationship_strength: number;
  evidence_level: string;
}

export interface AnalyticsGeoTopic {
  topic_id: number;
  topic_name: string;
  country_code: string;
  perception_count: number;
  share_of_topic: number;
  signal_score: number;
  evidence_level: string;
}

export interface AnalyticsIntelligence {
  period_days: number;
  relationships: AnalyticsRelationship[];
  geographic_topic_signals: AnalyticsGeoTopic[];
  methodology: string[];
}

export interface AnalyticsOverview {
  period_days: number;
  sample_size: number;
  unique_participants: number;
  total_perceptions: number;
  total_likes: number;
  total_comments: number;
  total_views: number;
  total_shares: number;
  total_interactions: number;
  engagement_rate: number;
  geographic_coverage: number;
  primary_topic_id: number | null;
  primary_topic_name: string | null;
  strongest_topic: AnalyticsTopic | null;
  emerging_topic: AnalyticsTopic | null;
  activity_baseline_daily: number;
  activity_current_daily: number;
  activity_anomaly: string;
  insights: AnalyticsInsight[];
  topics: AnalyticsTopic[];
  trend: AnalyticsTrendPoint[];
  opportunities: AnalyticsOpportunity[];
  geography: AnalyticsGeo[];
  methodology: string[];
}

export interface VerificationApplication {
  id: number;
  profession: string;
  focus: string;
  primary_topic_id: number | null;
  requested_topic_ids: number[];
  evidence: string | null;
  status: string;
  badge: string | null;
  industry_codes: string[];
  professional_role_codes: string[];
  primary_professional_role: string | null;
  reviewer_note: string | null;
  created_at: string;
  updated_at: string;
}


export interface AnalyticsDecision {
  period_days: number;
  lens: string;
  primary_topic_id: number | null;
  primary_topic_name: string | null;
  strongest_signal: AnalyticsTopic | null;
  emerging_signal: AnalyticsTopic | null;
  recommendations: Array<{
    topic_id: number;
    topic_name: string;
    action: string;
    signal_score: number;
    evidence_level: string;
  }>;
  guardrail: string;
}


export interface PerceptionAnalytics {
  perception_id:number; period_days:number; created_at:string; topic_id:number|null; likes:number; comments:number; views:number; shares:number; unique_participants:number; engagement_rate:number; daily_activity:Array<{date:string;interactions:number}>; top_countries:Array<{country_code:string;interactions:number}>; methodology:string[];
}
