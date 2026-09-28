// Must run before @supabase/supabase-js is evaluated: its realtime client
// constructs a `new URL(...)` at import time, and Hermes (React Native's JS
// engine) doesn't ship a fully spec-compliant URL implementation. Without
// this, the client can fail to construct — or silently misbehave — on
// native while working fine on web (which uses the browser's real URL API).
// See https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native.
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Whether real Supabase config is present. Checked lazily (from
 * ensureSession() in auth.ts) rather than thrown here at module load —
 * importing this file must never crash the app. A missing/invalid config
 * needs to surface as a normal, catchable error inside an async call so
 * SessionGate (app/_layout.tsx) can show its "Couldn't connect" screen
 * instead of a hard crash with no recovery UI.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Always a real client instance, even when unconfigured — the placeholder
 * URL/key below let `createClient` construct successfully; every actual
 * network call it makes will simply fail, which is exactly what
 * `ensureSession()` is already set up to catch and report.
 *
 * The anon key is safe to ship in the client — it identifies the project,
 * not a user, and every table it can touch is governed by the Row Level
 * Security policies in supabase/migrations. Never put the service_role key
 * here; that one bypasses RLS entirely and must only ever run server-side.
 */
export const supabase = createClient(
  supabaseUrl || "https://not-configured.invalid",
  supabaseAnonKey || "not-configured",
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      // Explicit, not the library default ("implicit"). PKCE is what makes
      // lib/supabase/auth.ts's password-reset flow (exchangeRecoveryCode)
      // actually correct: without this, resetPasswordForEmail would embed
      // tokens directly in the reset link's URL *fragment*
      // (#access_token=...&type=recovery) instead of a `?code=` query
      // param — a fragment expo-router's useLocalSearchParams() can't even
      // see, and a strictly less secure shape to email in the first place.
      // The code_verifier PKCE needs to redeem that code lives in this same
      // AsyncStorage, so it's only ever readable by the same device that
      // requested the reset — a deliberate, expected constraint, not a bug.
      flowType: "pkce",
    },
  },
);
