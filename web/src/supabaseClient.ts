import { createClient } from "@supabase/supabase-js";

// Only used to invoke the `extract-approval` Edge Function directly from the
// browser, unchanged from the original app. All table/storage access goes
// through the backend API (see api.ts) instead of this client.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const sb = url && anonKey ? createClient(url, anonKey) : null;

export async function invokeExtractApproval(body: Record<string, unknown>) {
  if (!sb) throw new Error("Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).");
  const { data, error } = await sb.functions.invoke("extract-approval", { body });
  if (error) {
    let msg = error.message || String(error);
    try {
      const ctx = (error as any).context;
      if (ctx && typeof ctx.json === "function") {
        const errBody = await ctx.json();
        if (errBody && errBody.error) msg = errBody.error;
      }
    } catch {
      /* fall back to generic message */
    }
    throw new Error(msg);
  }
  return data;
}
