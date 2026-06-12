'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getProfile } from '@/lib/getProfile'

export async function crearActivo(prevState, formData) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }

  const nombre = formData.get('nombre')?.toString().trim()
  const categoria = formData.get('categoria')?.toString()
  const valor_adquisicion = parseFloat(formData.get('valor_adquisicion'))
  const fecha_compra = formData.get('fecha_compra')?.toString()
  const vida_util_anos = parseInt(formData.get('vida_util_anos'))

  if (!nombre) return { error: 'El nombre es requerido' }
  if (!categoria) return { error: 'La categoría es requerida' }
  if (isNaN(valor_adquisicion) || valor_adquisicion <= 0) return { error: 'El valor de adquisición es inválido' }
  if (!fecha_compra) return { error: 'La fecha de compra es requerida' }
  if (isNaN(vida_util_anos) || vida_util_anos <= 0) return { error: 'La vida útil es inválida' }

  const { error } = await supabaseAdmin.from('activos_fijos').insert({
    tenant_id: profile.tenant_id,
    nombre,
    categoria,
    valor_adquisicion,
    fecha_compra,
    vida_util_anos,
    activo: true,
  })

  if (error) return { error: 'Error al crear el activo: ' + error.message }

  revalidatePath('/dashboard/activos')
  return { success: true }
}

export async function actualizarActivo(prevState, formData) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }

  const id = formData.get('id')?.toString()
  const nombre = formData.get('nombre')?.toString().trim()
  const categoria = formData.get('categoria')?.toString()
  const valor_adquisicion = parseFloat(formData.get('valor_adquisicion'))
  const fecha_compra = formData.get('fecha_compra')?.toString()
  const vida_util_anos = parseInt(formData.get('vida_util_anos'))

  if (!id || !nombre) return { error: 'Datos inválidos' }

  const { error } = await supabaseAdmin
    .from('activos_fijos')
    .update({ nombre, categoria, valor_adquisicion, fecha_compra, vida_util_anos })
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)

  if (error) return { error: 'Error al actualizar: ' + error.message }

  revalidatePath('/dashboard/activos')
  return { success: true }
}

export async function eliminarActivo(id) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }

  const { error } = await supabaseAdmin
    .from('activos_fijos')
    .update({ activo: false })
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/activos')
  return { success: true }
}
