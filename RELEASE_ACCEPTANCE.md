# Perception Mobile — Stage 3 Release Acceptance

This checklist is the mobile half of the Stage 3 release gate. Complete it against the Stage 2 hardened backend and a dedicated acceptance environment.

## Android cold start and auth

- [ ] Fresh install opens unauthenticated state.
- [ ] Register/login succeeds.
- [ ] Force-close and reopen restores the authenticated session.
- [ ] `/api/user` is used to hydrate the persisted token into current user state.
- [ ] Logout clears SecureStore even if the backend is unavailable.
- [ ] After logout, reopening the app stays unauthenticated.
- [ ] An expired/revoked token clears the local session.

## Navigation

- [ ] Home/feed navigation works.
- [ ] Discover/search navigation works.
- [ ] Notifications navigation works.
- [ ] Messages list/detail navigation works.
- [ ] Profile navigation works.
- [ ] SUPER_ADMIN Control Room navigation is visible only to the correct account.

## Keyboard and modal behavior

- [ ] Login/register inputs remain visible above the keyboard.
- [ ] Message composer remains usable above the keyboard.
- [ ] Edit-message modal/input remains usable with keyboard open.
- [ ] Archive/delete/recall action menus open and dismiss correctly.
- [ ] Android back closes the active modal/menu before leaving the screen where expected.

## Messaging and notifications

- [ ] Mutual-follow users can start a conversation.
- [ ] New messages arrive without a manual refresh.
- [ ] Message edits arrive without a manual refresh.
- [ ] Message recall state arrives without a manual refresh.
- [ ] Follow/message notifications arrive without a manual refresh.
- [ ] Unread notification badge matches the API unread count.

## Sign-off

Do not mark the mobile release PASS until every applicable item above is checked on the target Android device.

## Stage 4H.20 — Intelligence Production Gate

- [ ] Perception Intelligence screen loads for an entitled owner.
- [ ] Free viewer receives the bounded intelligence teaser.
- [ ] Creator-only measurements are not shown to observers.
- [ ] Evidence/provenance/freshness/governance sections render without errors.
- [ ] Temporal intelligence is shown only when the entitlement and sample rules permit it.
- [ ] Profile Intelligence opens for the entitled owner.
- [ ] Comparative Intelligence accepts 2–5 owned perceptions only.
- [ ] AI response badge appears at the far right of comments and replies for the owner with an analytics-enabled subscription when status is available.
- [ ] AI response badge/status is absent for free owners and non-owners.
- [ ] No TypeScript errors (`npm run typecheck`).
- [ ] No production navigation regression from the intelligence routes.

### Stage 4H freeze

Do not treat a UI rendering issue, missing sample, or provider cooldown as a reason to weaken the evidence/privacy contracts. Resolve the underlying defect or wait for the legitimate data/provider state.
