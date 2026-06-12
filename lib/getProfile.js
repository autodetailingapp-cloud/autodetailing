import { cookies } from 'next/headers'
import { supabaseAdmin } from './supabaseAdmin'

export async function getProfile() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('sb-access-token')?.value
  if (!accessToken) return null

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken)
  if (error || !user) return null

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*, tenants(*)')
    .eq('id', user.id)
    .single()

  return profile
}
