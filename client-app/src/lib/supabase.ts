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

// Initialize the client
const { url, key } = getSupabaseConfig();

console.log('Supabase init - URL:', url);
console.log('Supabase init - Key present:', !!key);

let supabaseInstance = null;

if (url && key) {
    try {
        supabaseInstance = createClient(url, key);
        console.log('Supabase client created successfully');
    } catch (e) {
        console.error("Failed to initialize Supabase client:", e);
        // Leaving instance as null will trigger SetupScreen
    }
}

console.log('Supabase instance available:', !!supabaseInstance);
export const supabase = supabaseInstance;
