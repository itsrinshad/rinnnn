import { createClient } from '@supabase/supabase-js'

const url = ((import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '').trim()
const key = ((import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '').trim()

// true only when both Netlify env vars are set
export const configured = /^https?:\/\/[^ ]+$/.test(url) && key.length > 10

const make = () => { try { return createClient(configured ? url : 'https://missing.supabase.co', configured ? key : 'missing-key') } catch { return createClient('https://missing.supabase.co', 'missing-key') } }
export const supabase = make()

// Users log in with a USERNAME. Behind the scenes it becomes this fake email.
// (Must match the domain used in SYMBIOTES_AUTH_UPGRADE.sql)
export const AUTH_DOMAIN = 'symbiotes.app'
export const toEmail = (identifier: string) => {
  const v = identifier.trim().toLowerCase()
  return v.includes('@') ? v : `${v}@${AUTH_DOMAIN}`
}
