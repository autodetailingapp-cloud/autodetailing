import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/getProfile'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import Sidebar from '../Sidebar'
import NominaUI from './NominaUI'

export const metadata = { title: 'Nómina y Colaboradores — AutoDetailing Manager' }

export default async function NominaPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const hoy = new Date()
  const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0]
  const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().split('T')[0]
  const fechaHoy = hoy.toISOString().split('T')[0]

  const mesLabel = hoy.toLocaleDateString('es-EC', { month: 'long', year: 'numeric' })

  const [colaboradoresRes, asistenciaRes] = await Promise.all([
    supabaseAdmin
      .from('colaboradores')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .eq('activo', true)
      .order('nombre'),
    supabaseAdmin
      .from('asistencia')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .gte('fecha', primerDia)
      .lte('fecha', ultimoDia),
  ])

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-y-auto">
        <div className="px-6 lg:px-10 py-8 pt-16 lg:pt-8 max-w-6xl mx-auto">
          <NominaUI
            colaboradores={colaboradoresRes.data ?? []}
            asistencia={asistenciaRes.data ?? []}
            fechaHoy={fechaHoy}
            mesLabel={mesLabel}
          />
        </div>
      </main>
    </div>
  )
}
