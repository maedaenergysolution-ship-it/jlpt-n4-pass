import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vvdmgeqykzbkvynsgapm.supabase.co'
const supabaseAnonKey = 'sb_publishable_peXjMwmFM8xSvgLaojDRhw_dYpXU9yt'

export const supabase = createClient(supabaseUrl, supabaseAnonKey

)
