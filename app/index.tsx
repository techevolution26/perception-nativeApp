// app/index.tsx
//
// Previously redirected guests straight to /login — matching the web app's
// old behavior, where the home feed itself was gated. The web app dropped
// that gate (see app/page.tsx: home feed and perception details are public
// now; only actions like liking, commenting, posting, and messaging require
// a session, each guarded individually via guardAction). Mirrored here:
// everyone lands in the tab navigator, token or not.
import { Redirect } from "expo-router";

export default function Index() {
  return <Redirect href="/(tabs)" />;
}
