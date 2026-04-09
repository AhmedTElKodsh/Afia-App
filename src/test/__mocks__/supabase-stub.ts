// Stub for @supabase/supabase-js used by resolve.alias in vite.config.ts.
// worker/node_modules is not installed during the root `npm ci` step in CI,
// so Vite's import-analysis can't resolve the real package at transform time.
// Worker tests mock supabaseClient.ts entirely — this stub just satisfies the
// static import graph so Vite doesn't error before vi.mock() can intercept.
export const createClient = () => ({});
