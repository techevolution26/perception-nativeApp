# Stage 4H.20 — Mobile Privacy Acceptance

The native app follows the same backend privacy contract as the web application.

## Rules

- Mobile authorization flags are never treated as security boundaries.
- The FastAPI backend decides whether private analytics fields are returned.
- AI analysis status is displayed only when the backend authorizes the owner/subscription path.
- Observer users must not receive creator-only analytics measurements.
- Aggregate intelligence is subject to the minimum sample threshold of five.
- Participant identities are not displayed as analytical aggregates.
- City-level aggregate intelligence is not exposed.
- Profile/analytics navigation must not bypass backend ownership checks.

## Release checks

- [ ] TypeScript passes with no errors.
- [ ] Owner/subscriber intelligence flow verified.
- [ ] Free observer teaser verified.
- [ ] Non-owner cannot access creator analytics.
- [ ] AI response badge visibility matches backend authorization.
- [ ] No private account fields are rendered from public user objects.
