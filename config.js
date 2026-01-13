// Supabase Configuration
// Replace these with your actual Supabase credentials

const SUPABASE_CONFIG = {
    url: 'YOUR_SUPABASE_URL', // Example: https://xxxxx.supabase.co
    anonKey: 'YOUR_SUPABASE_ANON_KEY' // Your public anon key
};

// Admin credentials (stored in Supabase database)
const ADMIN_CONFIG = {
    defaultEmail: 'admin@3dstore.com',
    defaultPassword: 'Admin@123' // Change this after first login
};

// WhatsApp Configuration (optional)
const WHATSAPP_CONFIG = {
    enabled: true,
    phoneNumber: '' // Leave empty for web.whatsapp.com, or add number like '94771234567'
};

// Application Settings
const APP_CONFIG = {
    storeName: '3D Store',
    currency: 'Rs.',
    enableNotifications: true,
    itemsPerPage: 12
};
