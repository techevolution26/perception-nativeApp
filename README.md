# Perception — mobile (Expo / React Native)

Rebuilt against `PerceptionV2-frontend-master` (the updated web app) and
your already-fixed mobile project — this is not a from-scratch redo, it's
your bug fixes plus the web app's evolved behavior and design, merged.

## What this pass changed, and why

### Your fixes — carried forward untouched
Everything from your updated project was kept exactly as you had it:
`package.json` (netinfo added, react/react-native as `^` ranges),
`app.json` (`newArchEnabled` removed), the Zustand infinite-loop fix and
dynamic bottom-padding calc in the home screen, the `bg-transparent` tab
bar fix, the defensive Pusher/Echo constructor extraction in
`EchoContext.tsx`, and the email trim/lowercase fix in `login.tsx` (also
now applied to `register.tsx` for consistency — same bug, same fix).

### The web app's biggest change: guests can browse now
Previously (both here and on web), the entire app was gated — no token,
no access at all. The web app dropped that: the home feed, perception
detail pages, topics, and search are all public now. Only *actions*
(liking, commenting, posting, messaging, editing/deleting) require a
session, each guarded individually via a `guardAction` pattern that
redirects to login only when actually attempted.

This is a real architecture change, not a cosmetic one:
- `app/index.tsx` no longer force-redirects to `/login` — everyone lands
  in the tab navigator.
- `(tabs)/_layout.tsx` no longer redirects on mount either. Instead, only
  the New/Notifications/Messages tab *presses* are guarded
  (`hooks/useGuardAction.ts`), matching the web app's `guardAction` in
  `MobileNav.tsx` exactly.
- Screens that make authenticated-only requests (chat thread, conversation
  list) still self-guard on mount as defense in depth, since they're
  directly-addressable routes, not just tab presses.
- The perception detail screen's comment composer becomes a "Log in to
  join the discussion" prompt for guests, and the "vantage barrier" (share
  your take to unlock others' perspectives) now shows for guests too, not
  just logged-in users who haven't commented yet — matches web exactly.

### Centralized session handling
The web app ended up patching "clear the stale token on 401" into two
separate places as bugs surfaced one at a time (`useCurrentUser`,
`NewPerceptionForm`). Rather than replicate that same scattered pattern,
this consolidates it: `lib/api.ts` exposes a single unauthorized-request
hook that `useAuthStore` registers itself into at startup, so *any*
authenticated request that comes back 401, anywhere in the app, triggers
the same one cleanup path.

### Real gaps from the first build, now filled in
- **Notifications screen** (`app/(tabs)/notifications.tsx`) — didn't exist
  before. Full parity with web's `NotificationsPanel.tsx`: real-time via
  the same private channel/event, mark-all-read, delete, unread badge on
  the tab bar icon.
- **Topics carousel** (`components/TopicsCarousel.tsx`) — the horizontal
  rail of topic avatars above the feed was missing entirely; it's a
  defining piece of how the app actually looks, not just a nice-to-have.
- **Long-post truncation** — feed cards (not the detail view) now clamp
  body text at 10 lines with a gradient fade mask past 140 characters,
  matching the web fix that stops one huge post from dominating the feed.
- **Search moved out of the tab bar** into a pushed screen
  (`app/search.tsx`) reached via a header icon — mirrors how the web app
  actually organizes search (header search bar, not a bottom-nav item),
  freeing the tab bar slot for Notifications instead.
- **The lightbulb wordmark** — the web header replaces the 'o' in
  "Percepti[bulb]n" with a lightbulb icon; ported to the home screen
  header using Ionicons' bulb glyph (Feather, used everywhere else in this
  app, doesn't have one — this is the one deliberate icon-set mix).
- **Entrance animations** — feed cards now fade/slide in with a slight
  stagger (react-native-reanimated's FadeInDown), the native-idiomatic
  equivalent of the web app's Framer Motion stagger, not a literal port.

### Deliberately not ported
- **Scroll-hide-on-scroll for the tab bar.** The web app's `MobileNav`
  hides on scroll-down to reclaim screen space — a reasonable move on a
  page that can get tall. Native bottom tab bars conventionally stay
  persistent (that's the platform convention iOS/Android users expect), so
  this wasn't replicated. Worth revisiting if you'd rather match web
  exactly here.
- **`useKeepAwake`** — the web app pings a `/api/ping` endpoint
  periodically, most likely to prevent a free-tier host from sleeping.
  Native apps don't have the same "backgrounded tab" problem in the same
  way, and it's not clear this project's deployment target needs it. Not
  ported; flag if you want it added (would use `AppState` instead of
  `document.visibilitychange`).
- **App display name** — the web app's `<title>` tag changed to
  "Perception.App" with a much longer marketing description. That's
  SEO/browser-tab metadata, invisible UI text — the actual on-screen
  copy in `LoginModal`/`RegisterModal` didn't change, and this mobile
  app's screens already matched it. `app.json`'s app name was left as
  "Perception" (a native home-screen icon label isn't the same context
  as a browser tab title, and ".App" reads oddly as a native app name).

## Verification

`npx tsc --noEmit` — clean. `npx expo-doctor` — 19/21 (2 failures are
network calls to Expo's remote validators, unreachable in the sandbox this
was built in — not project issues, same as last time).

**Not verified**: an actual `expo start` / device run. Same caveat as
before — this is thoroughly type-checked and structurally reviewed against
the real web app's behavior, not confirmed running on a physical device or
simulator. That's still the first thing to do with it.

## Quickstart

```bash
cp .env.example .env
# EXPO_PUBLIC_API_URL: "localhost" only works from the iOS Simulator.
# For a physical device or Android emulator, use your machine's LAN IP,
# or run `npx expo start --tunnel`.

npm install
npx expo start
```
