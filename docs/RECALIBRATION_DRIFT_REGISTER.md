# Mobile Recalibration — Drift Register

## Current correction

The canonical verified-professional user state is:

`verification_status === "VERIFIED"`

and a professional verification badge requires a verified professional role.

`VerificationApplication.status === "APPROVED"` is a separate backend application state and must not be used as the user's public verified state.

## Badge invariant

The existing `VerifiedBadge` visual remains unchanged.

It is rendered from the structured professional role/industry context and receives:

- `verified=true` only for a canonical verified professional;
- `verified=false` for ordinary professional identity.

The check-decagram remains the visual verification marker.

## AI badge invariant

The existing `AIAnalysisBadge` remains at the far right of the comment/reply header.

The mobile app may render it only when the backend-authorized owner/subscription flow sets `showAiAnalysis=true`.

Frontend routing flags never replace backend authorization.
