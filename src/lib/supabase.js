import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dznfeactrzmkqpfgueey.supabase.co'
const supabaseKey = 'sb_publishable_JE2KF-aO9LC40JZWiQBWvg_G-JTjzPo'

export const supabase = createClient(supabaseUrl, supabaseKey)