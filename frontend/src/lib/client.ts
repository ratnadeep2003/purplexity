import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    "https://rzughxmausbbjkhysoga.supabase.co",
    "sb_publishable_xRCDGBlvvOl8ihnknmKYfw_Th35bik_"
  )
}
