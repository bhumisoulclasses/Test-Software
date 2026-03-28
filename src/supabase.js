import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cyavsbudegokjogfyarp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5YXZzYnVkZWdva2pvZ2Z5YXJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTM0MjQsImV4cCI6MjA5MDE4OTQyNH0.12Xw2JX87-WG4AF07A0Ms1JtdAF5UL16g9boBWwfx4I';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
