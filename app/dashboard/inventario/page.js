import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getProfile } from '@/lib/getProfile'
import Sidebar from '../Sidebar'
import InventarioUI from './InventarioUI'

export const metadata = { title: 'Inventario — AutoDetailing Manager' }

export default async function InventarioPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const [insumosRes, serviciosRes, servicioInsumosRes] = await Promise.all([
    supabaseAdmin
      .from('insumos')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('nombre'),
    supabaseAdmin
      .from('servicios')
      .select('id,nombre,precio')
      .eq('tenant_id', profile.tenant_id)
      .eq('activo', true),
    supabaseAdmin
      .from('servicio_insumos')
      .select('servicio_id,cantidad,insumos(costo_unitario)')
      .eq('tenant_id', profile.tenant_id),
  ])

  const insumos = insumosRes.data ?? []
  const servicios = serviciosRes.data ?? []
  const servicioInsumos = servicioInsumosRes.data ?? []

  const costoPorServicio = {}
  for (const si of servicioInsumos) {
    const costo = Number(si.cantidad) * Number(si.insumos?.costo_unitario ?? 0)
    costoPorServicio[si.servicio_id] = (costoPorServicio[si.servicio_id] ?? 0) + costo
  }

  const rankingServicios = servicios
    .map((s) => {
      const costoInsumos = costoPorServicio[s.id] ?? 0
      const margen = Number(s.precio) - costoInsumos
      const margenPorc = Number(s.precio) > 0 ? (margen / Number(s.precio)) * 100 : 0
      return { id: s.id, nombre: s.nombre, precio: Number(s.precio), costoInsumos, margen, margenPorc }
    })
    .filter((s) => s.costoInsumos > 0)

  const rankingCosto = [...rankingServicios].sort((a, b) => b.costoInsumos - a.costoInsumos)
  const rankingMargen = [...rankingServicios].sort((a, b) => b.margen - a.margen)

  const insumosActivos = insumos.filter((i) => i.activo)
  const alertas = insumosActivos.filter((i) => Number(i.stock_actual) <= Number(i.stock_minimo))
  const valorInventario = insumosActivos.reduce((s, i) => s + Number(i.stock_actual) * Number(i.costo_unitario), 0)

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-y-auto">
        <div className="px-6 lg:px-10 py-8 pt-16 lg:pt-8 max-w-6xl mx-auto">
          <InventarioUI
            insumos={insumos}
            alertas={alertas}
            valorInventario={valorInventario}
            rankingCosto={rankingCosto}
            rankingMargen={rankingMargen}
            readOnly={profile.rol === 'lectura'}
          />
        </div>
      </main>
    </div>
  )
}
