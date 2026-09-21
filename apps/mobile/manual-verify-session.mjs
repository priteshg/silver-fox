import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
const env = Object.fromEntries(
  readFileSync(".env", "utf8").split("\n").filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);
const supabase = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
const { data, error } = await supabase.auth.signInAnonymously();
if (error) throw error;
const projectRef = new URL(env.EXPO_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
writeFileSync("manual-session.json", JSON.stringify({ key: `sb-${projectRef}-auth-token`, session: data.session }));
console.log("OK");
