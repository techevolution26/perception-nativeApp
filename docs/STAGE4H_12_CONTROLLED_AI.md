# Stage 4H.12 — Controlled AI Semantic Processing

The mobile app continues to consume the existing Perception Intelligence contract.

Stage 4H.12 activates controlled background semantic processing on the backend. No provider call is made by the mobile client and no new mobile AI credential is required.

The existing freshness state tells the mobile UI whether semantic intelligence is current, pending, or stale. The backend remains responsible for provider access, rate-limit cooldowns, privacy controls, sample thresholds, and normalized evidence output.
