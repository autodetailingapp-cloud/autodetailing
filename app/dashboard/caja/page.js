import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getProfile } from '@/lib/getProfile'
import { getDatosCajaHoy } from './actions'
import Sidebar from '../Sidebar'
import CajaUI from './CajaUI'

export const metadata = { title: 'Caja Diaria — AutoDetailing Manager' }

export default async function CajaPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const [datosCaja, historialRes] = await Promise.all([
    getDatosCajaHoy(),
    supabaseAdmin
      .from('caja_diaria')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .eq('cerrado', true)
      .order('fecha', { ascending: false })
      .limit(30),
  ])

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-y-auto">
        <div className="px-6 lg:px-10 py-8 pt-16 lg:pt-8 max-w-4xl mx-auto">
          <CajaUI datos={datosCaja} historial={historialRes.data ?? []} />
        </div>
      </main>
    </div>
  )
}
