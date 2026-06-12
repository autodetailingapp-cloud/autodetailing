'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getProfile } from '@/lib/getProfile'

export async function getDatosBalance(fechaCorte) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }

  const [ventasRes, pagosCartRes, comprasRes, carteraRes, cartProvRes, activosRes] = await Promise.all([
    supabaseAdmin.from('ventas').select('total,tipo_pago').eq('tenant_id', profile.tenant_id)
      .lte('fecha', fechaCorte).eq('anulada', false),
    supabaseAdmin.from('pagos_cartera').select('monto').eq('tenant_id', profile.tenant_id)
      .lte('fecha', fechaCorte),
    supabaseAdmin.from('compras').select('total').eq('tenant_id', profile.tenant_id)
      .lte('fecha', fechaCorte),
    supabaseAdmin.from('cartera').select('saldo_pendiente,estado').eq('tenant_id', profile.tenant_id),
    supabaseAdmin.from('cartera_proveedores').select('saldo_pendiente,estado').eq('tenant_id', profile.tenant_id),
    supabaseAdmin.from('activos_fijos').select('valor_adquisicion,vida_util_anos,fecha_compra')
      .eq('tenant_id', profile.tenant_id).eq('activo', true),
  ])

  const sum = (arr, f = 'total') => (arr ?? []).reduce((s, r) => s + Number(r[f] ?? 0), 0)

  // Caja y bancos = ventas cobradas + cobros cartera - compras
  const ventasCobradas = (ventasRes.data ?? [])
    .filter((v) => v.tipo_pago !== 'Crédito')
    .reduce((s, v) => s + Number(v.total ?? 0), 0)
  const cobrosPagos = sum(pagosCartRes.data, 'monto')
  const totalCompras = sum(comprasRes.data)
  const cajaYBancos = ventasCobradas + cobrosPagos - totalCompras

  // Cartera por cobrar (excluye pagados)
  const carteraCobrar = (carteraRes.data ?? [])
    .filter((c) => c.estado !== 'pagado' && Number(c.saldo_pendiente) > 0)
    .reduce((s, c) => s + Number(c.saldo_pendiente), 0)

  // Activos fijos netos (valor - depreciación acumulada al corte)
  const hoy = new Date(fechaCorte + 'T00:00:00')
  const activosFijosNeto = (activosRes.data ?? []).reduce((acc, a) => {
    const mesesVida = Number(a.vida_util_anos) * 12
    if (mesesVida <= 0) return acc + Number(a.valor_adquisicion)
    const compra = new Date(a.fecha_compra + 'T00:00:00')
    const meses = Math.max(0, (hoy.getFullYear() - compra.getFullYear()) * 12 + (hoy.getMonth() - compra.getMonth()))
    const deprecAcum = Math.min(Number(a.valor_adquisicion), (Number(a.valor_adquisicion) / mesesVida) * meses)
    return acc + Math.max(0, Number(a.valor_adquisicion) - deprecAcum)
  }, 0)

  // Pasivos: cartera proveedores pendiente
  const carteraProveedores = (cartProvRes.data ?? [])
    .filter((c) => c.estado !== 'pagado' && Number(c.saldo_pendiente) > 0)
    .reduce((s, c) => s + Number(c.saldo_pendiente), 0)

  const totalActivosCorrientes = cajaYBancos + carteraCobrar
  const totalActivosNoCorrientes = activosFijosNeto
  const totalActivos = totalActivosCorrientes + totalActivosNoCorrientes
  const totalPasivos = carteraProveedores
  const patrimonio = totalActivos - totalPasivos

  return {
    activosCorrientes: { cajaYBancos, carteraCobrar, total: totalActivosCorrientes },
    activosNoCorrientes: { activosFijosNeto, total: totalActivosNoCorrientes },
    totalActivos,
    pasivos: { carteraProveedores, total: totalPasivos },
    patrimonio,
    fechaCorte,
  }
}
