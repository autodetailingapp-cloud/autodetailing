'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getProfile } from '@/lib/getProfile'

export async function getDatosCajaHoy() {
  const profile = await getProfile()
  if (!profile) return null

  const hoy = new Date().toISOString().split('T')[0]

  // Estado actual de caja
  const { data: cajaHoy } = await supabaseAdmin
    .from('caja_diaria')
    .select('*')
    .eq('tenant_id', profile.tenant_id)
    .eq('fecha', hoy)
    .maybeSingle()

  // Ventas activas de hoy
  const { data: ventas } = await supabaseAdmin
    .from('ventas')
    .select('total, tipo_pago')
    .eq('tenant_id', profile.tenant_id)
    .eq('fecha', hoy)
    .eq('estado', 'activa')

  const ventasArr = ventas ?? []
  const ventas_efectivo = ventasArr
    .filter((v) => v.tipo_pago === 'Efectivo')
    .reduce((s, v) => s + Number(v.total), 0)
  const total_transferencia = ventasArr
    .filter((v) => v.tipo_pago === 'Transferencia')
    .reduce((s, v) => s + Number(v.total), 0)
  const total_credito = ventasArr
    .filter((v) => v.tipo_pago === 'Crédito')
    .reduce((s, v) => s + Number(v.total), 0)

  // Cobros de cartera de hoy (se suman al efectivo)
  const { data: cobros } = await supabaseAdmin
    .from('pagos_cartera')
    .select('monto')
    .eq('tenant_id', profile.tenant_id)
    .eq('fecha', hoy)

  const cobros_cartera = (cobros ?? []).reduce((s, c) => s + Number(c.monto), 0)
  const total_efectivo = ventas_efectivo + cobros_cartera

  const total_ventas = total_efectivo + total_transferencia + total_credito

  // Compras y gastos de hoy
  const { data: compras } = await supabaseAdmin
    .from('compras')
    .select('total')
    .eq('tenant_id', profile.tenant_id)
    .eq('fecha', hoy)

  const total_gastos = (compras ?? []).reduce((s, c) => s + Number(c.total), 0)
  const saldo_final = total_efectivo + total_transferencia - total_gastos

  return {
    hoy,
    cajaHoy,
    total_efectivo,
    total_transferencia,
    total_credito,
    total_ventas,
    total_gastos,
    cobros_cartera,
    saldo_final,
  }
}

export async function cerrarCaja(observaciones) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }

  const hoy = new Date().toISOString().split('T')[0]

  const { data: existente } = await supabaseAdmin
    .from('caja_diaria')
    .select('id, cerrado')
    .eq('tenant_id', profile.tenant_id)
    .eq('fecha', hoy)
    .maybeSingle()

  if (existente?.cerrado) return { error: 'La caja de hoy ya fue cerrada' }

  // Recalcular totales frescos
  const datos = await getDatosCajaHoy()
  if (!datos) return { error: 'Error al obtener datos de caja' }

  const record = {
    tenant_id: profile.tenant_id,
    fecha: hoy,
    total_efectivo: parseFloat(datos.total_efectivo.toFixed(2)),
    total_transferencia: parseFloat(datos.total_transferencia.toFixed(2)),
    total_credito: parseFloat(datos.total_credito.toFixed(2)),
    total_ventas: parseFloat(datos.total_ventas.toFixed(2)),
    total_gastos: parseFloat(datos.total_gastos.toFixed(2)),
    saldo_final: parseFloat(datos.saldo_final.toFixed(2)),
    observaciones: observaciones || null,
    cerrado: true,
  }

  let error
  if (existente) {
    ;({ error } = await supabaseAdmin.from('caja_diaria').update(record).eq('id', existente.id))
  } else {
    ;({ error } = await supabaseAdmin.from('caja_diaria').insert(record))
  }

  if (error) return { error: 'Error al cerrar caja: ' + error.message }

  revalidatePath('/dashboard/caja')
  return { success: true }
}
