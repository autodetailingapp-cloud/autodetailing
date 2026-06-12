'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getProfile } from '@/lib/getProfile'

export async function crearServicio(prevState, formData) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }

  const nombre = formData.get('nombre')?.toString().trim()
  const descripcion = formData.get('descripcion')?.toString().trim() ?? ''
  const precio = parseFloat(formData.get('precio'))
  const tiempoStr = formData.get('tiempo_estimado')?.toString().trim()
  const tiempo_estimado = tiempoStr ? parseInt(tiempoStr) : null

  if (!nombre) return { error: 'El nombre es requerido' }
  if (isNaN(precio) || precio < 0) return { error: 'El precio debe ser un número válido' }

  const { error } = await supabaseAdmin
    .from('servicios')
    .insert({ tenant_id: profile.tenant_id, nombre, descripcion, precio, tiempo_estimado, activo: true })

  if (error) return { error: 'Error al crear el servicio: ' + error.message }

  revalidatePath('/dashboard/servicios')
  return { success: true }
}

export async function actualizarServicio(prevState, formData) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }

  const id = formData.get('id')?.toString()
  const nombre = formData.get('nombre')?.toString().trim()
  const descripcion = formData.get('descripcion')?.toString().trim() ?? ''
  const precio = parseFloat(formData.get('precio'))
  const tiempoStr = formData.get('tiempo_estimado')?.toString().trim()
  const tiempo_estimado = tiempoStr ? parseInt(tiempoStr) : null

  if (!id || !nombre) return { error: 'Datos inválidos' }
  if (isNaN(precio) || precio < 0) return { error: 'El precio debe ser un número válido' }

  const { error } = await supabaseAdmin
    .from('servicios')
    .update({ nombre, descripcion, precio, tiempo_estimado })
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)

  if (error) return { error: 'Error al actualizar: ' + error.message }

  revalidatePath('/dashboard/servicios')
  return { success: true }
}

export async function toggleServicio(id, activo) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }

  const { error } = await supabaseAdmin
    .from('servicios')
    .update({ activo })
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/servicios')
  return { success: true }
}

export async function eliminarServicio(id) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }

  const { count } = await supabaseAdmin
    .from('detalle_ventas')
    .select('id', { count: 'exact', head: true })
    .eq('servicio_id', id)

  if (count && count > 0)
    return { error: `No se puede eliminar: este servicio está en ${count} venta(s). Desactívalo en su lugar.` }

  const { error } = await supabaseAdmin
    .from('servicios')
    .delete()
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/servicios')
  return { success: true }
}
