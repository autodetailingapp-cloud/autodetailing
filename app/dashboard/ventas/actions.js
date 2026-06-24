'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getProfile } from '@/lib/getProfile'

export async function crearVenta(data) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }

  const {
    tipo_documento, cliente_id, fecha, items,
    descuento_valor, tipo_pago, monto_pagado,
    observaciones, plazo_credito,
  } = data

  if (!tipo_documento) return { error: 'El tipo de documento es requerido' }
  if (!items || items.length === 0) return { error: 'Agrega al menos un servicio' }
  if (!tipo_pago) return { error: 'El tipo de pago es requerido' }

  const fechaVenta = fecha || new Date().toISOString().split('T')[0]

  // Verificar si la caja del día está cerrada
  const { data: cajaExistente } = await supabaseAdmin
    .from('caja_diaria')
    .select('cerrado')
    .eq('tenant_id', profile.tenant_id)
    .eq('fecha', fechaVenta)
    .maybeSingle()

  if (cajaExistente?.cerrado)
    return { error: 'La caja de ese día ya está cerrada. No se pueden registrar ventas.' }

  // Número de documento secuencial del tenant
  const { data: maxDoc } = await supabaseAdmin
    .from('ventas')
    .select('numero_documento')
    .eq('tenant_id', profile.tenant_id)
    .order('numero_documento', { ascending: false })
    .limit(1)
    .maybeSingle()

  const numero_documento = (maxDoc?.numero_documento ?? 0) + 1

  // Calcular totales
  const subtotal = items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0)
  const descuento = parseFloat(descuento_valor) || 0
  const descuento_porcentaje = subtotal > 0 ? (descuento / subtotal) * 100 : 0
  const baseIva = subtotal - descuento
  const ivaAplica = data.iva_aplica === true
  const iva = ivaAplica ? parseFloat((baseIva * 0.15).toFixed(2)) : 0
  const total = parseFloat((baseIva + iva).toFixed(2))

  const { data: venta, error: ventaErr } = await supabaseAdmin
    .from('ventas')
    .insert({
      tenant_id: profile.tenant_id,
      numero_documento,
      tipo_documento,
      cliente_id: cliente_id || null,
      fecha: fechaVenta,
      subtotal: parseFloat(subtotal.toFixed(2)),
      descuento_valor: parseFloat(descuento.toFixed(2)),
      descuento_porcentaje: parseFloat(descuento_porcentaje.toFixed(2)),
      iva,
      total,
      tipo_pago,
      monto_pagado: parseFloat(monto_pagado) || total,
      estado: 'activa',
      observaciones: observaciones || null,
      created_by: profile.id,
    })
    .select('id')
    .single()

  if (ventaErr) return { error: 'Error al crear la venta: ' + ventaErr.message }

  // Insertar detalle
  const detalles = items.map((i) => ({
    venta_id: venta.id,
    servicio_id: i.servicio_id || null,
    descripcion: i.descripcion,
    cantidad: i.cantidad,
    precio_unitario: i.precio_unitario,
    subtotal: parseFloat((i.cantidad * i.precio_unitario).toFixed(2)),
  }))

  const { error: detErr } = await supabaseAdmin.from('detalle_ventas').insert(detalles)
  if (detErr) return { error: 'Venta creada pero error en detalle: ' + detErr.message }

  // Descontar insumos consumidos según la receta de cada servicio vendido
  await supabaseAdmin.rpc('descontar_inventario_venta', {
    p_venta_id: venta.id,
    p_tenant_id: profile.tenant_id,
  })

  // Si es crédito y hay cliente, crear entrada en cartera
  if (tipo_pago === 'Crédito' && cliente_id) {
    const plazo = parseInt(plazo_credito) || 30
    const fechaVenc = new Date(fechaVenta + 'T00:00:00')
    fechaVenc.setDate(fechaVenc.getDate() + plazo)

    await supabaseAdmin.from('cartera').insert({
      tenant_id: profile.tenant_id,
      venta_id: venta.id,
      cliente_id,
      monto_original: total,
      monto_pagado: 0,
      saldo_pendiente: total,
      fecha_venta: fechaVenta,
      fecha_vencimiento: fechaVenc.toISOString().split('T')[0],
      estado: 'vigente',
    })
  }

  // Recalcular caja del día via RPC
  await supabaseAdmin.rpc('recalcular_caja_diaria', {
    p_tenant_id: profile.tenant_id,
    p_fecha: fechaVenta,
  })

  revalidatePath('/dashboard/ventas')
  revalidatePath('/dashboard/caja')
  revalidatePath('/dashboard/cartera')
  revalidatePath('/dashboard/inventario')
  return { success: true, numero_documento }
}

export async function anularVenta(id) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }

  const { data: result, error: rpcErr } = await supabaseAdmin.rpc('anular_venta_contable', {
    p_venta_id: id,
    p_tenant_id: profile.tenant_id,
  })

  if (rpcErr) return { error: rpcErr.message }
  if (result?.error) return { error: result.error }

  revalidatePath('/dashboard/ventas')
  revalidatePath('/dashboard/caja')
  revalidatePath('/dashboard/cartera')
  revalidatePath('/dashboard/inventario')
  return { success: true }
}

export async function getDetalleVenta(ventaId) {
  const profile = await getProfile()
  if (!profile) return null

  const { data: venta } = await supabaseAdmin
    .from('ventas')
    .select('*, clientes(nombre, ruc_cedula, tipo_documento)')
    .eq('id', ventaId)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (!venta) return null

  const { data: detalles } = await supabaseAdmin
    .from('detalle_ventas')
    .select('*')
    .eq('venta_id', ventaId)
    .order('id')

  return { venta, detalles: detalles ?? [] }
}
