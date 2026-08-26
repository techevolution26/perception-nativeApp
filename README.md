# Perception — mobile (Expo / React Native)

True native app, built against the same FastAPI backend as the web app — no
shared UI code (React Native has no DOM; none of the web app's components
render here), but the API contract, types, and business-logic patterns carry
over directly.

## Stack

- **Expo SDK 57** + **Expo Router** (file-based routing, mirrors the Next.js
  App Router mental model)
- **React Native 0.86.2** + **React 19.2.3**
- **TypeScript**, strict mode — `npx tsc --noEmit` passes clean
- **NativeWind** — Tailwind syntax in React Native, same design tokens
  (`app/global.css`) as the web app's `globals.css`, translated to the
  RGB-triplet format NativeWind's CSS-variable support expects
- **Zustand** + **TanStack Query** — same patterns as web
- **expo-secure-store** — JWT storage, Keychain/Keystore-backed (the native
  equivalent of, and more secure than, the web app's `localStorage`)
- **laravel-echo** + **pusher-js/react-native** — same real-time channel/event
  contract as web (`private-App.Models.User.{id}` / `notification`,
  `conversations.{peerId}` / `NewMessage`), talking to the same Soketi
  instance
- **@react-native-community/netinfo** — network-state support required by
  Pusher's React Native implementation

## Quickstart

### 1. Install dependencies

```bash
npm install