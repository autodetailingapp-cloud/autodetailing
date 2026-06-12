'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getProfile } from '@/lib/getProfile'

export async function crearCliente(prevState, formData) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }

  const nombre = formData.get('nombre')?.toString().trim()
  const ruc_cedula = formData.get('ruc_cedula')?.toString().trim()
  const tipo_documento = formData.get('tipo_documento')?.toString()
  const email = formData.get('email')?.toString().trim() || null
  const telefono = formData.get('telefono')?.toString().trim() || null
  const direccion = formData.get('direccion')?.toString().trim() || null
  const tipo_contribuyente = formData.get('tipo_contribuyente')?.toString()
  const plazo_credito = parseInt(formData.get('plazo_credito') ?? '0')
  const limite_credito = parseFloat(formData.get('limite_credito') ?? '0')

  if (!nombre) return { error: 'El nombre es requerido' }
  if (!ruc_cedula) return { error: 'El RUC/Cédula es requerido' }
  if (!tipo_documento) return { error: 'El tipo de documento es requerido' }
  if (!tipo_contribuyente) return { error: 'El tipo de contribuyente es requerido' }

  const { error } = await supabaseAdmin
    .from('clientes')
    .insert({
      tenant_id: profile.tenant_id,
      nombre,
      ruc_cedula,
      tipo_documento,
      email,
      telefono,
      direccion,
      tipo_contribuyente,
      plazo_credito: isNaN(plazo_credito) ? 0 : plazo_credito,
      limite_credito: isNaN(limite_credito) ? 0 : limite_credito,
      activo: true,
    })

  if (error) return { error: 'Error al crear el cliente: ' + error.message }

  revalidatePath('/dashboard/clientes')
  return { success: true }
}

export async function actualizarCliente(prevState, formData) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }

  const id = formData.get('id')?.toString()
  const nombre = formData.get('nombre')?.toString().trim()
  const ruc_cedula = formData.get('ruc_cedula')?.toString().trim()
  const tipo_documento = formData.get('tipo_documento')?.toString()
  const email = formData.get('email')?.toString().trim() || null
  const telefono = formData.get('telefono')?.toString().trim() || null
  const direccion = formData.get('direccion')?.toString().trim() || null
  const tipo_contribuyente = formData.get('tipo_contribuyente')?.toString()
  const plazo_credito = parseInt(formData.get('plazo_credito') ?? '0')
  const limite_credito = parseFloat(formData.get('limite_credito') ?? '0')

  if (!id || !nombre || !ruc_cedula) return { error: 'Datos inválidos' }

  const { error } = await supabaseAdmin
    .from('clientes')
    .update({
      nombre, ruc_cedula, tipo_documento, email, telefono, direccion,
      tipo_contribuyente,
      plazo_credito: isNaN(plazo_credito) ? 0 : plazo_credito,
      limite_credito: isNaN(limite_credito) ? 0 : limite_credito,
    })
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)

  if (error) return { error: 'Error al actualizar: ' + error.message }

  revalidatePath('/dashboard/clientes')
  return { success: true }
}

export async function toggleCliente(id, activo) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }

  const { error } = await supabaseAdmin
    .from('clientes')
    .update({ activo })
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/clientes')
  return { success: true }
}

export async function eliminarCliente(id) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }

  const { count } = await supabaseAdmin
    .from('ventas')
    .select('id', { count: 'exact', head: true })
    .eq('cliente_id', id)
    .eq('tenant_id', profile.tenant_id)

  if (count && count > 0)
    return { error: `No se puede eliminar: este cliente tiene ${count} venta(s) registrada(s). Desactívalo en su lugar.` }

  const { error } = await supabaseAdmin
    .from('clientes')
    .delete()
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/clientes')
  return { success: true }
}

export async function getHistorialCliente(clienteId) {
  const profile = await getProfile()
  if (!profile) return { ventas: [] }

  const { data } = await supabaseAdmin
    .from('ventas')
    .select('id, fecha, total, estado')
    .eq('cliente_id', clienteId)
    .eq('tenant_id', profile.tenant_id)
    .order('fecha', { ascending: false })
    .limit(50)

  return { ventas: data ?? [] }
}
