'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getProfile } from '@/lib/getProfile'

async function checkCajaCerrada(tenantId, fecha) {
  const { data } = await supabaseAdmin
    .from('caja_diaria').select('cerrado')
    .eq('tenant_id', tenantId).eq('fecha', fecha).maybeSingle()
  return data?.cerrado === true
}

export async function crearCompra(prevState, formData) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }

  const proveedor         = formData.get('proveedor')?.toString().trim()
  const tipo              = formData.get('tipo')?.toString()
  const tipo_doc_compra   = formData.get('tipo_doc_compra')?.toString() || 'Factura'
  const descripcion       = formData.get('descripcion')?.toString().trim()
  const numero_factura    = formData.get('numero_factura')?.toString().trim() || null
  const fecha             = formData.get('fecha')?.toString()
  const subtotal          = parseFloat(formData.get('subtotal'))
  const iva               = parseFloat(formData.get('iva') ?? '0')
  const total             = parseFloat(formData.get('total'))
  const plazo             = parseInt(formData.get('plazo_pago_proveedor') ?? '0')

  if (!proveedor)  return { error: 'El proveedor es requerido' }
  if (!tipo)       return { error: 'El tipo es requerido' }
  if (!descripcion) return { error: 'La descripción es requerida' }
  if (!fecha)      return { error: 'La fecha es requerida' }
  if (isNaN(subtotal) || subtotal < 0) return { error: 'Subtotal inválido' }
  if (isNaN(total) || total < 0)       return { error: 'Total inválido' }

  if (await checkCajaCerrada(profile.tenant_id, fecha))
    return { error: 'La caja de ese día ya está cerrada. No se pueden registrar compras.' }

  const { data: compraData, error } = await supabaseAdmin
    .from('compras')
    .insert({
      tenant_id: profile.tenant_id,
      proveedor, tipo, tipo_doc_compra, descripcion, numero_factura, fecha,
      subtotal: parseFloat(subtotal.toFixed(2)),
      iva: parseFloat((isNaN(iva) ? 0 : iva).toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      plazo_pago_proveedor: isNaN(plazo) ? 0 : plazo,
    })
    .select('id')
    .single()

  if (error) return { error: 'Error al registrar la compra: ' + error.message }

  // Si tiene crédito con proveedor, crear entrada en cartera_proveedores
  if (plazo > 0 && compraData?.id) {
    const fechaVenc = new Date(fecha + 'T00:00:00')
    fechaVenc.setDate(fechaVenc.getDate() + plazo)

    await supabaseAdmin.from('cartera_proveedores').insert({
      tenant_id: profile.tenant_id,
      compra_id: compraData.id,
      proveedor,
      monto_original: parseFloat(total.toFixed(2)),
      monto_pagado: 0,
      saldo_pendiente: parseFloat(total.toFixed(2)),
      fecha_compra: fecha,
      fecha_vencimiento: fechaVenc.toISOString().split('T')[0],
      estado: 'vigente',
    })
  }

  await supabaseAdmin.rpc('recalcular_caja_diaria', {
    p_tenant_id: profile.tenant_id,
    p_fecha: fecha,
  })

  revalidatePath('/dashboard/compras')
  revalidatePath('/dashboard/caja')
  return { success: true }
}

export async function actualizarCompra(prevState, formData) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }

  const id              = formData.get('id')?.toString()
  const proveedor       = formData.get('proveedor')?.toString().trim()
  const tipo            = formData.get('tipo')?.toString()
  const tipo_doc_compra = formData.get('tipo_doc_compra')?.toString() || 'Factura'
  const descripcion     = formData.get('descripcion')?.toString().trim()
  const numero_factura  = formData.get('numero_factura')?.toString().trim() || null
  const fecha           = formData.get('fecha')?.toString()
  const subtotal        = parseFloat(formData.get('subtotal'))
  const iva             = parseFloat(formData.get('iva') ?? '0')
  const total           = parseFloat(formData.get('total'))
  const plazo           = parseInt(formData.get('plazo_pago_proveedor') ?? '0')

  if (!id || !proveedor || !descripcion || !fecha) return { error: 'Datos inválidos' }

  const { data: compraActual } = await supabaseAdmin
    .from('compras').select('fecha')
    .eq('id', id).eq('tenant_id', profile.tenant_id).single()

  const fechaAnterior = compraActual?.fecha

  if (await checkCajaCerrada(profile.tenant_id, fecha))
    return { error: 'La caja de la nueva fecha ya está cerrada.' }

  if (fechaAnterior && fechaAnterior !== fecha) {
    if (await checkCajaCerrada(profile.tenant_id, fechaAnterior))
      return { error: 'La caja de la fecha original ya está cerrada. No puede cambiar la fecha.' }
  }

  const { error } = await supabaseAdmin
    .from('compras')
    .update({
      proveedor, tipo, tipo_doc_compra, descripcion, numero_factura, fecha,
      subtotal: parseFloat(subtotal.toFixed(2)),
      iva: parseFloat((isNaN(iva) ? 0 : iva).toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      plazo_pago_proveedor: isNaN(plazo) ? 0 : plazo,
    })
    .eq('id', id).eq('tenant_id', profile.tenant_id)

  if (error) return { error: 'Error al actualizar: ' + error.message }

  await supabaseAdmin.rpc('recalcular_caja_diaria', {
    p_tenant_id: profile.tenant_id, p_fecha: fecha,
  })
  if (fechaAnterior && fechaAnterior !== fecha) {
    await supabaseAdmin.rpc('recalcular_caja_diaria', {
      p_tenant_id: profile.tenant_id, p_fecha: fechaAnterior,
    })
  }

  revalidatePath('/dashboard/compras')
  revalidatePath('/dashboard/caja')
  return { success: true }
}

export async function eliminarCompra(id) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }

  const { data: compra } = await supabaseAdmin
    .from('compras').select('fecha')
    .eq('id', id).eq('tenant_id', profile.tenant_id).single()

  if (!compra) return { error: 'Compra no encontrada' }

  if (await checkCajaCerrada(profile.tenant_id, compra.fecha))
    return { error: 'La caja de ese día ya está cerrada. No se puede eliminar la compra.' }

  const { error } = await supabaseAdmin
    .from('compras').delete()
    .eq('id', id).eq('tenant_id', profile.tenant_id)

  if (error) return { error: error.message }

  await supabaseAdmin.rpc('recalcular_caja_diaria', {
    p_tenant_id: profile.tenant_id, p_fecha: compra.fecha,
  })

  revalidatePath('/dashboard/compras')
  revalidatePath('/dashboard/caja')
  return { success: true }
}
