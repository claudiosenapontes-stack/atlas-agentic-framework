import { createClient } from '@supabase/supabase-js'
import { supabase as mockSupabase } from './supabase-mock'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Use mock data if Supabase credentials are empty or if MOCK_MODE is set
const useMock = !supabaseUrl || !supabaseKey || process.env.MOCK_MODE === 'true'

export const supabase = useMock ? mockSupabase : createClient(supabaseUrl, supabaseKey)
