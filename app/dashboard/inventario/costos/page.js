import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getProfile } from '@/lib/getProfile'
import Sidebar from '../../Sidebar'
import CostosUI from './CostosUI'

export const metadata = { title: 'Costos por servicio — AutoDetailing Manager' }

export default async function CostosPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const [serviciosRes, insumosRes, servicioInsumosRes] = await Promise.all([
    supabaseAdmin
      .from('servicios')
      .select('id,nombre,precio,activo')
      .eq('tenant_id', profile.tenant_id)
      .order('nombre'),
    supabaseAdmin
      .from('insumos')
      .select('id,nombre,unidad_medida,costo_unitario')
      .eq('tenant_id', profile.tenant_id)
      .eq('activo', true)
      .order('nombre'),
    supabaseAdmin
      .from('servicio_insumos')
      .select('id,servicio_id,insumo_id,cantidad,costo_calculado,insumos(nombre,unidad_medida,costo_unitario)')
      .eq('tenant_id', profile.tenant_id),
  ])

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-y-auto">
        <div className="px-6 lg:px-10 py-8 pt-16 lg:pt-8 max-w-6xl mx-auto">
          <CostosUI
            servicios={serviciosRes.data ?? []}
            insumos={insumosRes.data ?? []}
            servicioInsumos={servicioInsumosRes.data ?? []}
            readOnly={profile.rol === 'lectura'}
          />
        </div>
      </main>
    </div>
  )
}
