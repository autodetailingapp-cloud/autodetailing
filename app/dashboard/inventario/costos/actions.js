'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getProfile } from '@/lib/getProfile'

function soloLectura(profile) {
  return profile?.rol === 'lectura'
}

export async function agregarInsumoServicio(prevState, formData) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }
  if (soloLectura(profile)) return { error: 'No tienes permiso para modificar las recetas' }

  const servicio_id = formData.get('servicio_id')?.toString()
  const insumo_id = formData.get('insumo_id')?.toString()
  const cantidad = parseFloat(formData.get('cantidad'))

  if (!servicio_id) return { error: 'Servicio inválido' }
  if (!insumo_id) return { error: 'Selecciona un insumo' }
  if (isNaN(cantidad) || cantidad <= 0) return { error: 'La cantidad debe ser mayor a 0' }

  const { data: insumo, error: insumoErr } = await supabaseAdmin
    .from('insumos')
    .select('costo_unitario')
    .eq('id', insumo_id)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (insumoErr || !insumo) return { error: 'Insumo no encontrado' }

  const costo_calculado = parseFloat((cantidad * Number(insumo.costo_unitario)).toFixed(2))

  const { error } = await supabaseAdmin
    .from('servicio_insumos')
    .upsert(
      {
        tenant_id: profile.tenant_id,
        servicio_id, insumo_id,
        cantidad: parseFloat(cantidad.toFixed(3)),
        costo_calculado,
      },
      { onConflict: 'servicio_id,insumo_id' }
    )

  if (error) return { error: 'Error al guardar: ' + error.message }

  revalidatePath('/dashboard/inventario/costos')
  revalidatePath('/dashboard/inventario')
  return { success: true }
}

export async function eliminarInsumoServicio(id) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }
  if (soloLectura(profile)) return { error: 'No tienes permiso para modificar las recetas' }

  const { error } = await supabaseAdmin
    .from('servicio_insumos')
    .delete()
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/inventario/costos')
  revalidatePath('/dashboard/inventario')
  return { success: true }
}
