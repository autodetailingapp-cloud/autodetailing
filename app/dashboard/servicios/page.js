import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getProfile } from '@/lib/getProfile'
import Sidebar from '../Sidebar'
import ServiciosUI from './ServiciosUI'

export const metadata = { title: 'Servicios — AutoDetailing Manager' }

export default async function ServiciosPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const { data: servicios } = await supabaseAdmin
    .from('servicios')
    .select('id, nombre, descripcion, precio, tiempo_estimado, activo')
    .eq('tenant_id', profile.tenant_id)
    .order('nombre')

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-y-auto">
        <div className="px-6 lg:px-10 py-8 pt-16 lg:pt-8 max-w-5xl mx-auto">
          <ServiciosUI servicios={servicios ?? []} />
        </div>
      </main>
    </div>
  )
}
