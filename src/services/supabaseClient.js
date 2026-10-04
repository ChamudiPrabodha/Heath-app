import { createClient } from '@supabase/supabase-js';

// TODO: Replace these with your actual Supabase project URL and anon key
const SUPABASE_URL = 'https://vrrsrvnvrekewuivyyxq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZycnNydm52cmVrZXd1aXZ5eXhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2NjcyMzcsImV4cCI6MjEwNjI0MzIzN30.MVDPzoPklV1iKx - gjd4pLsXbyCl9r_w737nTfER9RsI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
