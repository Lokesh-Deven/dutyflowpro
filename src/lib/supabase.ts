import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://axrqlwayiifzmdvebvac.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4cnFsd2F5aWlmem1kdmVidmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3NDcwMzEsImV4cCI6MjEwMzMyMzAzMX0.1nUt132JLZdWk4azMFS5f8JMRwB9s9OR2at3My0mMPg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
