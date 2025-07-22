// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

// --- IMPORTANT: Paste your own Supabase URL and Anon Key here ---
const supabaseUrl = 'https://fvedunhiylakrreihgtt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2ZWR1bmhpeWxha3JyZWloZ3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4MzMyNTUsImV4cCI6MjA2ODQwOTI1NX0.nJmcZUy605wa6yNvqT1XUhsh4EJJcbVs82crFL2yOjc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);