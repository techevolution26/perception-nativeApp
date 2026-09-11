# Perception — mobile (Expo / React Native)

## This pass: three root-caused bugs, plus a substantial feature/design pass

### Bug fixes

**"Still asking for auth on the homepage."**
Root cause: `app/index.tsx` and `app/(tabs)/index.tsx` both resolved to the
URL `/` — a genuine routing collision. Removed the redundant redirect file;
`(tabs)/index.tsx` now cleanly owns `/` and everyone (guest or logged in)
lands there directly.

**Dark/light mode not following system.**
The previous approach manually re-read React Native's `useColorScheme()`
and forced NativeWind's `setColorScheme("light" | "dark")` in a `useEffect`
— fighting with, rather than using, NativeWind's own system-tracking.
`colorScheme.set("system")` (a real, verified export from `nativewind`)
tells it to track the OS natively and reactively. New `useSettingsStore`
persists the user's actual choice (light/dark/system, default system) and
calls this once at hydration — the Settings tab (see below) is the UI for
changing it.

**Images and videos loading blank.**
Root cause: the backend returns media/avatar URLs as root-relative paths
(`/storage/perceptions/xyz.jpg`) — correct for the web app, which proxies
`/storage/*` through Next.js's rewrites so the browser resolves it against
its own origin. This app has no such proxy (it calls the backend
directly), so a relative path has nothing to resolve against — it fails
silently rather than erroring, which is why it looked like "blank" rather
than a broken-image icon. Added `resolveMediaUrl()` in `lib/api.ts`,
applied everywhere a media/avatar URL is rendered: `Avatar`,
`TopicsCarousel`, `PerceptionCard`'s media preview, comment media, and the
topics browse screen.

### New: Settings tab on the profile page
`components/SettingsPanel.tsx`, shown as a segmented "Posts / Settings" tab
on your own profile (`app/users/[id].tsx`). Contains the theme selector
(Light/Dark/System), a logout action, and clearly-labeled "coming soon"
rows for future settings (notification preferences, privacy, help,
about) — shown as disabled with a "Soon" badge rather than as dead taps
that look interactive but do nothing.

### New: Topics browse screen
`app/topics/index.tsx` was missing entirely — there was a topic *detail*
page but nowhere to discover and follow/unfollow topics in general,
ported from the web app's `/topics` page. Reachable from the profile
page's topic-count pill and now also from a "Browse" entry at the end of
the home feed's topic carousel (the web app doesn't have an obvious entry
point for this either — a small deliberate addition here, not parity).

### New: Profile editing
Name, profession, bio, and avatar are now actually editable on your own
profile (they were display-only before). Worth knowing: the backend
splits this across two endpoints — `PUT /api/user` for the name,
`POST /api/user/profile` (multipart) for profession/bio/avatar. The web
app never actually exposes name editing at all; this goes one step
further since it was explicitly asked for.

### Redesigned: the comment composer and comment tree
`components/PerceiveComposer.tsx` replaces the old plain bordered textarea
— avatar + growing input + circular send button, the same visual language
as the chat `MessageInput`, so composing feels consistent everywhere in
the app rather than like a different UI each time. Used for both the
top-level comment box and nested replies.

The comment tree (`CommentItem` in `app/perceptions/[id].tsx`) got a
quiet vertical thread-line connector for nested replies (instead of bare
indentation), icon-based Reply/Show-replies controls, and now actually
renders comment media (it never did before). **All the actual logic —
recursive nesting, the reply-insertion algorithm, state — is untouched;**
only the surrounding JSX changed.

### PerceptionCard: tap-to-navigate + action menu
Tapping anywhere on a card's avatar/text/media (not the like/comment
buttons, and not a no-op on the detail page itself) now pushes to the
perception's detail screen — it did nothing before. The inline
edit/delete icons were replaced with a single "⋯" button opening
`components/ui/ActionMenu.tsx`, a custom bottom-sheet-style menu built
from scratch to match this app's design tokens rather than a generic OS
`Alert` — Share (native share sheet), Copy Link, and Edit/Delete for the
owner.

### Redesigned: the tab bar, to actually match the web app's shape
The first pass built one stretched bar with the avatar tacked onto the
end. The web `MobileNav` is actually **two independent floating
elements** — a centered pill with just the 4 nav icons, and a separate
circular avatar/sign-in button at bottom-right. Rebuilt to match, and
added a real native backdrop blur (`expo-blur`) behind the pill instead of
a flat translucent fill, closer to the web version's `backdrop-blur`.

### New: unread badges + post-success sound
Both the Notifications and Messages tab icons now show an unread-count
badge (previously only Notifications did, and Messages had none). Posting
a perception or a comment/reply now plays a short two-note chime —
synthesized locally as a WAV file (`assets/sounds/post-success.wav`, see
the generation script if you ever want to tweak it) specifically so this
ships fully working with no licensing ambiguity and no dependency on
sourcing an external sound asset. It respects the device's silent/mute
switch, as UI feedback should (this is a courtesy, not an alert).

## Verification

`npx tsc --noEmit` — clean. `npx expo-doctor` — 19/21 (2 failures are
network calls to Expo's remote validators, unreachable in the sandbox this
was built in; the previously-real peer-dependency gap, `expo-audio`
needing `expo-asset`, was caught by this same check and fixed).

**Not verified**: an actual `expo start` / device run — same caveat as
every prior pass. This is thoroughly type-checked and structurally
reviewed, including root-causing the three reported bugs down to specific
lines, but not confirmed on a physical device or simulator. That's still
the first, most valuable thing to do with it.

## Quickstart

```bash
cp .env.example .env
# EXPO_PUBLIC_API_URL: "localhost" only works from the iOS Simulator.
# For a physical device or Android emulator, use your machine's LAN IP,
# or run `npx expo start --tunnel`.

npm install
npx expo start
```

## Analytics & monetization

The mobile app now exposes the analytics business model end-to-end:

- An **Analytics** action lives on each `PerceptionCard`.
- `/analytics` displays observed topic signals, engagement, sample size, and geographic coverage.
- Users without an analytics entitlement are sent to `/subscription`.
- `/subscription` shows the available plans and can start the backend-provided trial; paid checkout remains provider-backed rather than pretending a payment succeeded.
- `/analytics-profile` manages professional focus, country/region/city, primary analytics topic, and additional topic specialties.
- `/verification` submits and displays the professional verification workflow.
- A user's primary professional field remains the strongest analytics lens while additional topics can be selected within the subscribed plan's limit.

Analytics UI deliberately labels results as observed signals and exposes methodology/limitations rather than presenting community engagement as scientific proof.

### Google sign-in
Set `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` to OAuth client IDs registered for this app. Configure the same accepted client IDs in the API `GOOGLE_CLIENT_IDS` setting.

## Product interaction layer

- The VantageMark is the canonical loading indicator across data-loading states.
- Short native sound cues are used for successful likes, message sends, posts, and incoming notifications.
- Messaging uses a restrained composer, curated emoji tray, long-press actions, bounded edit/recall, conversation archive/delete, and mutual-follow discovery.
- Profile avatars open public read-only profiles; private account fields are never part of the public profile response.
- Perception owners with analytics access can open analytics for an individual perception as well as aggregate analytics.
- Google sign-in requires Expo OAuth client IDs in `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
