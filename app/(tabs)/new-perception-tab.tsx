// app/(tabs)/new-perception-tab.tsx
//
// Never actually navigated to — the custom tab bar intercepts presses on
// this tab and pushes the /new-perception modal instead (see
// (tabs)/_layout.tsx). This file exists only so expo-router has a valid
// route to satisfy the corresponding <Tabs.Screen name="new-perception-tab">.
export default function NewPerceptionTabPlaceholder() {
  return null;
}
