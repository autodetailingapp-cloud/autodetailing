import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/getProfile'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import Sidebar from '../Sidebar'
import CarteraUI from './CarteraUI'

export const metadata = { title: 'Cartera por Cobrar — AutoDetailing Manager' }

export default async function CarteraPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const hoy = new Date().toISOString().split('T')[0]

  const { data: cartera } = await supabaseAdmin
    .from('cartera')
    .select('*, ventas(numero_documento, tipo_documento), clientes(nombre, telefono, email)')
    .eq('tenant_id', profile.tenant_id)
    .order('fecha_vencimiento', { ascending: true })

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-y-auto">
        <div className="px-6 lg:px-10 py-8 pt-16 lg:pt-8 max-w-6xl mx-auto">
          <CarteraUI cartera={cartera ?? []} hoy={hoy} />
        </div>
      </main>
    </div>
  )
}
