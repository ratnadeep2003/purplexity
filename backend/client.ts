// import { createClient } from '@supabase/supabase-js'

// export function createSupabaseClient() {
//   return createClient(
//     "https://rzughxmausbbjkhysoga.supabase.co",
//     process.env.SUPABASE_API_SECRET!
//   )
// }

import { createClient } from "@supabase/supabase-js";
import { env } from "./config";

export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);