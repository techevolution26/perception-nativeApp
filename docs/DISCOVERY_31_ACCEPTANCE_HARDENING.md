# Discovery 31 — Acceptance & Product Integrity Hardening

This release hardens the Stage 1–30 product loop before new product features are introduced.

## Mobile fixes
- Correct admin moderation queue response destructuring.
- Narrow perception creation responses before reading `id`.
- Remove synchronous loading state updates from data-fetching effects.
- Add retry/error states for intelligence and related-perception fetches.
- Remove redundant primary professional identity presentation from profile.
- Make onboarding one-way: topics → professional identity → geographic context → plans.
- Do not route onboarding through professional verification when verification is not plan-eligible.
- Silence Related Topics on topic detail for now while retaining Related Creators.

## Onboarding contract
Professional identity and geographic context are setup steps. Verification is a separate, plan-dependent workflow. The onboarding sequence therefore ends at plans, where the user can understand the requirement and choose whether to subscribe.
