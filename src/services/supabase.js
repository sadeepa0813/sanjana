// ==========================================
// FILE: src/services/supabase.js
// PURPOSE: Initialize and export Supabase client
// DEPENDENCIES: @supabase/supabase-js, config
// ==========================================

import { createClient } from '@supabase/supabase-js';
import config from '../config/config.js';

// Initialize Supabase client
const supabase = createClient(config.supabase.url, config.supabase.anonKey);

export default supabase;
