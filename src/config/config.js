// ==========================================
// FILE: src/config/config.js
// PURPOSE: Centralized configuration management
// DEPENDENCIES: None (uses Vite's import.meta.env)
// ==========================================

const requiredEnvVars = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    VITE_WHATSAPP_NUMBER: import.meta.env.VITE_WHATSAPP_NUMBER
};

const missingVars = Object.entries(requiredEnvVars)
    .filter(([_, v]) => !v)
    .map(([k]) => k);

if (missingVars.length > 0) {
    if (import.meta.env.DEV) {
        document.body.innerHTML = 'Missing env vars: ' + missingVars.join(', ');
    }
    throw new Error('Missing env vars: ' + missingVars.join(', '));
}

export default {
    supabase: {
        url: requiredEnvVars.VITE_SUPABASE_URL,
        anonKey: requiredEnvVars.VITE_SUPABASE_ANON_KEY
    },
    whatsapp: {
        number: requiredEnvVars.VITE_WHATSAPP_NUMBER
    },
    app: {
        name: 'LankaShop Elite',
        version: '1.0.0'
    }
};