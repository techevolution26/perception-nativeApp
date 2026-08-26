// hooks/useCurrentUser.ts
//
// Thin wrapper around useAuthStore, kept as its own hook (rather than
// having every component reach into the auth store directly) so it reads
// the same way the web app's useCurrentUser() did.
import useAuthStore from "../store/useAuthStore";

export default function useCurrentUser() {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  return { user, loading: !hydrated };
}
