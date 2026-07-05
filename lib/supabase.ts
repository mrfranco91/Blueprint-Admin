import { createClient } from '@supabase/supabase-js';

// Helper to get keys from environment or local storage
export const getSupabaseConfig = () => {
    const localUrl = localStorage.getItem('VITE_SUPABASE_URL');
    const localKey = localStorage.getItem('VITE_SUPABASE_ANON_KEY');

    // Prefer local storage (allows overriding), then environment variables
    const url = localUrl || import.meta.env.VITE_SUPABASE_URL;
    const key = localKey || import.meta.env.VITE_SUPABASE_ANON_KEY;

    return { url, key };
};

export const saveSupabaseConfig = (url: string, key: string) => {
    const cleanUrl = url ? url.trim() : '';
    const cleanKey = key ? key.trim() : '';

    localStorage.setItem('VITE_SUPABASE_URL', cleanUrl);
    localStorage.setItem('VITE_SUPABASE_ANON_KEY', cleanKey);

    // Simple reload to pick up new config
    window.location.reload();
};

export const clearSupabaseConfig = () => {
    localStorage.removeItem('VITE_SUPABASE_URL');
    localStorage.removeItem('VITE_SUPABASE_ANON_KEY');
    window.location.reload();
};

// ── Startup: purge oversized sessions ──────────────────────
// A base64 avatar in user_metadata bloats the JWT, causing
// kQuotaBytes quota exceeded and ERR_HTTP2_PROTOCOL_ERROR.
try {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (!k?.startsWith('sb-')) continue;
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const tokenLen = parsed?.currentSession?.access_token?.length || 0;
      if (tokenLen > 50000) {
        console.warn(`[supabase] Purging oversized session (${(tokenLen / 1024).toFixed(0)}KB token) for key ${k}`);
        localStorage.removeItem(k);
      }
    } catch { /* unparseable — leave it */ }
  }
} catch { /* localStorage access denied — ignore */ }

// Resilient storage that handles quota errors gracefully.
const resilientStorage = {
  getItem: (key: string): string | null => {
    try { return localStorage.getItem(key); } catch { /* quota or access error */ }
    try { return sessionStorage.getItem(key); } catch { /* fallback also failed */ }
    return null;
  },
  setItem: (key: string, value: string): void => {
    // Reject oversized sessions before they corrupt localStorage
    try {
      const parsed = JSON.parse(value);
      const tokenLen = parsed?.currentSession?.access_token?.length || 0;
      if (tokenLen > 50000) {
        console.warn(`[supabase] Refusing to store oversized session (${(tokenLen / 1024).toFixed(0)}KB token)`);
        try { sessionStorage.setItem(key, value); } catch { /* give up */ }
        return;
      }
    } catch { /* not JSON — store as-is */ }

    try { localStorage.setItem(key, value); return; } catch { /* quota exceeded */ }
    // Clear stale supabase keys and retry
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k?.startsWith('sb-')) localStorage.removeItem(k);
      }
      localStorage.setItem(key, value);
      return;
    } catch { /* still failed */ }
    // Last resort: sessionStorage (lost on tab close, but at least works)
    try { sessionStorage.setItem(key, value); } catch { /* give up silently */ }
  },
  removeItem: (key: string): void => {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
    try { sessionStorage.removeItem(key); } catch { /* ignore */ }
  },
};

// Initialize the client
const { url, key } = getSupabaseConfig();

console.log('Supabase init - URL:', url);
console.log('Supabase init - Key present:', !!key);

let supabaseInstance = null;

if (url && key) {
    try {
        supabaseInstance = createClient(url, key, {
          auth: {
            storage: resilientStorage,
            persistSession: true,
            detectSessionInUrl: true,
          },
        });
        console.log('Supabase client created successfully');
    } catch (e) {
        console.error("Failed to initialize Supabase client:", e);
        // Leaving instance as null will trigger SetupScreen
    }
}

console.log('Supabase instance available:', !!supabaseInstance);
export const supabase = supabaseInstance;
