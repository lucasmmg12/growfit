import { createClient } from '@supabase/supabase-js'

const DEFAULT_URL = "https://dtjmckbrofevgfqbkzli.supabase.co"
const DEFAULT_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0am1ja2Jyb2ZldmdmcWJremxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTQxMTgsImV4cCI6MjA4NjI5MDExOH0.JhZPg8DhTBu9nnbKYFKvluDirqKgehDzDP44g_nlqM8"

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL
// Auto-correct if old deprecated project URL is present
if (!supabaseUrl || supabaseUrl.includes('pxvhovctyewppwkldaq')) {
    supabaseUrl = DEFAULT_URL
}

let supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY
if (!supabaseAnonKey || supabaseAnonKey.length < 30) {
    supabaseAnonKey = DEFAULT_ANON_KEY
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
