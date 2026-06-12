import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getProfile } from '@/lib/getProfile'
import Sidebar from '../Sidebar'
import VentasUI from './VentasUI'

export const metadata = { title: 'Ventas — AutoDetailing Manager' }

export default async function VentasPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const hoy = new Date().toISOString().split('T')[0]

  const [ventasRes, clientesRes, serviciosRes, maxDocRes] = await Promise.all([
    supabaseAdmin
      .from('ventas')
      .select('*, clientes(nombre)')
      .eq('tenant_id', profile.tenant_id)
      .eq('fecha', hoy)
      .order('numero_documento', { ascending: false }),
    supabaseAdmin
      .from('clientes')
      .select('id, nombre, plazo_credito, activo')
      .eq('tenant_id', profile.tenant_id)
      .eq('activo', true)
      .order('nombre'),
    supabaseAdmin
      .from('servicios')
      .select('id, nombre, precio')
      .eq('tenant_id', profile.tenant_id)
      .eq('activo', true)
      .order('nombre'),
    supabaseAdmin
      .from('ventas')
      .select('numero_documento')
      .eq('tenant_id', profile.tenant_id)
      .order('numero_documento', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const regimen = profile.tenants?.regimen_sri ?? ''
  const ivaAplica = !regimen.toLowerCase().includes('rimpe')
  const nextNumero = (maxDocRes.data?.numero_documento ?? 0) + 1

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-y-auto">
        <div className="px-6 lg:px-10 py-8 pt-16 lg:pt-8 max-w-5xl mx-auto">
          <VentasUI
            ventas={ventasRes.data ?? []}
            clientes={clientesRes.data ?? []}
            servicios={serviciosRes.data ?? []}
            ivaAplica={ivaAplica}
            nextNumero={nextNumero}
            hoy={hoy}
          />
        </div>
      </main>
    </div>
  )
}
