import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://aqwgqyimipesjtbwzmmh.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxd2dxeWltaXBlc2p0Ynd6bW1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MzI2MjksImV4cCI6MjA3NjEwODYyOX0.onJGtSBpT090InnD7l3lLjWe9Qh3E0C7wYUAgecNXKM";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});