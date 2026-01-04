// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// ⚠️ REPLACE THESE WITH YOUR REAL SUPABASE KEYS
const supabaseUrl = 'https://pzpaembxnwnozlomuhdv.supabase.co';
const supabaseAnonKey = 'sb_publishable_oADkeoTOVsGTY6_T2_wM3A_UxXxi9fi';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);