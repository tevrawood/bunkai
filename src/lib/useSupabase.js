import { useMemo } from 'react'
import { useSession } from '@clerk/clerk-react'
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// True only once both Supabase env vars are present. Until then the app still
// runs — you can sign in and walk the shell — and data screens show a friendly
// "connect Supabase" notice instead of crashing.
export const isSupabaseConfigured = Boolean(url && anonKey)

// Placeholder so createClient() never throws on a missing URL before Supabase is
// wired up. No request is ever sent to it because callers gate on
// isSupabaseConfigured first.
const FALLBACK_URL = 'https://placeholder.supabase.co'

// Returns a Supabase client that forwards the Clerk session token on every
// request. Supabase's native third-party-auth integration reads the token and
// exposes the Clerk user id as auth.jwt()->>'sub', which the RLS policies use.
//
// The client is memoized on the session object so we don't recreate it on every
// render, but the accessToken callback always pulls a fresh (auto-refreshed)
// token from Clerk.
export function useSupabase() {
  const { session } = useSession()

  return useMemo(() => {
    return createClient(url || FALLBACK_URL, anonKey || 'placeholder-anon-key', {
      accessToken: async () => {
        if (!session) return null
        return (await session.getToken()) ?? null
      },
    })
  }, [session])
}
