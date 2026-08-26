// app/(tabs)/profile.tsx
//
// Never actually shown — the custom tab bar's avatar button navigates
// directly to /users/[id] (outside the tabs group) instead. This file only
// exists so <Tabs.Screen name="profile"> has a valid route to reference.
export default function ProfileTabPlaceholder() {
  return null;
}
