import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/getProfile'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import Sidebar from '../Sidebar'
import ActivosUI from './ActivosUI'

export const metadata = { title: 'Activos Fijos — AutoDetailing Manager' }

export default async function ActivosPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const { data: activos } = await supabaseAdmin
    .from('activos_fijos')
    .select('*')
    .eq('tenant_id', profile.tenant_id)
    .eq('activo', true)
    .order('nombre')

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-y-auto">
        <div className="px-6 lg:px-10 py-8 pt-16 lg:pt-8 max-w-6xl mx-auto">
          <ActivosUI activos={activos ?? []} />
        </div>
      </main>
    </div>
  )
}
