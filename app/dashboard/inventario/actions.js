'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getProfile } from '@/lib/getProfile'

function soloLectura(profile) {
  return profile?.rol === 'lectura'
}

export async function crearInsumo(prevState, formData) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }
  if (soloLectura(profile)) return { error: 'No tienes permiso para modificar el inventario' }

  const nombre = formData.get('nombre')?.toString().trim()
  const descripcion = formData.get('descripcion')?.toString().trim() ?? ''
  const unidad_medida = formData.get('unidad_medida')?.toString()
  const stock_actual = parseFloat(formData.get('stock_actual') ?? '0')
  const stock_minimo = parseFloat(formData.get('stock_minimo') ?? '0')
  const costo_unitario = parseFloat(formData.get('costo_unitario') ?? '0')
  const proveedor = formData.get('proveedor')?.toString().trim() || null

  if (!nombre) return { error: 'El nombre es requerido' }
  if (!unidad_medida) return { error: 'La unidad de medida es requerida' }
  if (isNaN(stock_actual) || stock_actual < 0) return { error: 'El stock actual no es válido' }
  if (isNaN(stock_minimo) || stock_minimo < 0) return { error: 'El stock mínimo no es válido' }
  if (isNaN(costo_unitario) || costo_unitario < 0) return { error: 'El costo unitario no es válido' }

  const { error } = await supabaseAdmin.from('insumos').insert({
    tenant_id: profile.tenant_id,
    nombre, descripcion, unidad_medida,
    stock_actual: parseFloat(stock_actual.toFixed(3)),
    stock_minimo: parseFloat(stock_minimo.toFixed(3)),
    costo_unitario: parseFloat(costo_unitario.toFixed(2)),
    proveedor, activo: true,
  })

  if (error) return { error: 'Error al crear el insumo: ' + error.message }

  revalidatePath('/dashboard/inventario')
  return { success: true }
}

export async function actualizarInsumo(prevState, formData) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }
  if (soloLectura(profile)) return { error: 'No tienes permiso para modificar el inventario' }

  const id = formData.get('id')?.toString()
  const nombre = formData.get('nombre')?.toString().trim()
  const descripcion = formData.get('descripcion')?.toString().trim() ?? ''
  const unidad_medida = formData.get('unidad_medida')?.toString()
  const stock_minimo = parseFloat(formData.get('stock_minimo') ?? '0')
  const costo_unitario = parseFloat(formData.get('costo_unitario') ?? '0')
  const proveedor = formData.get('proveedor')?.toString().trim() || null

  if (!id || !nombre) return { error: 'Datos inválidos' }
  if (!unidad_medida) return { error: 'La unidad de medida es requerida' }
  if (isNaN(stock_minimo) || stock_minimo < 0) return { error: 'El stock mínimo no es válido' }
  if (isNaN(costo_unitario) || costo_unitario < 0) return { error: 'El costo unitario no es válido' }

  const { error } = await supabaseAdmin
    .from('insumos')
    .update({
      nombre, descripcion, unidad_medida,
      stock_minimo: parseFloat(stock_minimo.toFixed(3)),
      costo_unitario: parseFloat(costo_unitario.toFixed(2)),
      proveedor,
    })
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)

  if (error) return { error: 'Error al actualizar: ' + error.message }

  revalidatePath('/dashboard/inventario')
  revalidatePath('/dashboard/inventario/costos')
  return { success: true }
}

export async function toggleInsumo(id, activo) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }
  if (soloLectura(profile)) return { error: 'No tienes permiso para modificar el inventario' }

  const { error } = await supabaseAdmin
    .from('insumos')
    .update({ activo })
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/inventario')
  return { success: true }
}

export async function eliminarInsumo(id) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }
  if (soloLectura(profile)) return { error: 'No tienes permiso para modificar el inventario' }

  const { count } = await supabaseAdmin
    .from('servicio_insumos')
    .select('id', { count: 'exact', head: true })
    .eq('insumo_id', id)

  if (count && count > 0)
    return { error: `No se puede eliminar: este insumo está en la receta de ${count} servicio(s). Desactívalo en su lugar.` }

  const { error } = await supabaseAdmin
    .from('insumos')
    .delete()
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/inventario')
  return { success: true }
}

export async function registrarEntrada(prevState, formData) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }
  if (soloLectura(profile)) return { error: 'No tienes permiso para modificar el inventario' }

  const insumo_id = formData.get('insumo_id')?.toString()
  const cantidad = parseFloat(formData.get('cantidad'))
  const costo_unitario = parseFloat(formData.get('costo_unitario'))
  const proveedor = formData.get('proveedor')?.toString().trim() || null
  const fecha = formData.get('fecha')?.toString() || new Date().toISOString().split('T')[0]

  if (!insumo_id) return { error: 'Selecciona un insumo' }
  if (isNaN(cantidad) || cantidad <= 0) return { error: 'La cantidad debe ser mayor a 0' }
  if (isNaN(costo_unitario) || costo_unitario < 0) return { error: 'El costo unitario no es válido' }

  const { data: result, error } = await supabaseAdmin.rpc('registrar_entrada_insumo', {
    p_tenant_id: profile.tenant_id,
    p_insumo_id: insumo_id,
    p_cantidad: cantidad,
    p_costo_unitario: costo_unitario,
    p_proveedor: proveedor,
    p_fecha: fecha,
  })

  if (error) return { error: error.message }
  if (result?.error) return { error: result.error }

  revalidatePath('/dashboard/inventario')
  revalidatePath('/dashboard/inventario/costos')
  revalidatePath('/dashboard/compras')
  revalidatePath('/dashboard/caja')
  return { success: true }
}

export async function getHistorialInsumo(insumoId) {
  const profile = await getProfile()
  if (!profile) return []

  const { data } = await supabaseAdmin
    .from('movimientos_inventario')
    .select('*')
    .eq('insumo_id', insumoId)
    .eq('tenant_id', profile.tenant_id)
    .order('created_at', { ascending: false })
    .limit(50)

  return data ?? []
}
