'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getProfile } from '@/lib/getProfile'

export async function getDatosFlujo(mes, ano) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }

  const pad = (n) => String(n).padStart(2, '0')
  const finDia = new Date(ano, mes, 0).getDate()
  const desde = `${ano}-${pad(mes)}-01`
  const hasta = `${ano}-${pad(mes)}-${pad(finDia)}`

  // Para proyección: mes siguiente
  const mesSig = mes === 12 ? 1 : mes + 1
  const anoSig = mes === 12 ? ano + 1 : ano
  const finDiaSig = new Date(anoSig, mesSig, 0).getDate()
  const desdeSig = `${anoSig}-${pad(mesSig)}-01`
  const hastaSig = `${anoSig}-${pad(mesSig)}-${pad(finDiaSig)}`

  const [ventasRes, pagosRes, comprasRes, ventasSigRes, comprasSigRes] = await Promise.all([
    supabaseAdmin.from('ventas').select('fecha,total,tipo_pago').eq('tenant_id', profile.tenant_id)
      .gte('fecha', desde).lte('fecha', hasta).eq('anulada', false).order('fecha'),
    supabaseAdmin.from('pagos_cartera').select('fecha,monto').eq('tenant_id', profile.tenant_id)
      .gte('fecha', desde).lte('fecha', hasta).order('fecha'),
    supabaseAdmin.from('compras').select('fecha,total').eq('tenant_id', profile.tenant_id)
      .gte('fecha', desde).lte('fecha', hasta).order('fecha'),
    supabaseAdmin.from('ventas').select('total,tipo_pago').eq('tenant_id', profile.tenant_id)
      .gte('fecha', desdeSig).lte('fecha', hastaSig).eq('anulada', false),
    supabaseAdmin.from('compras').select('total').eq('tenant_id', profile.tenant_id)
      .gte('fecha', desdeSig).lte('fecha', hastaSig),
  ])

  // Agrupar por día
  const movsPorDia = {}
  for (let d = 1; d <= finDia; d++) {
    const key = `${ano}-${pad(mes)}-${pad(d)}`
    movsPorDia[key] = { fecha: key, entradas: 0, salidas: 0 }
  }

  for (const v of ventasRes.data ?? []) {
    if (v.tipo_pago !== 'Crédito' && movsPorDia[v.fecha]) {
      movsPorDia[v.fecha].entradas += Number(v.total)
    }
  }
  for (const p of pagosRes.data ?? []) {
    if (movsPorDia[p.fecha]) {
      movsPorDia[p.fecha].entradas += Number(p.monto)
    }
  }
  for (const c of comprasRes.data ?? []) {
    if (movsPorDia[c.fecha]) {
      movsPorDia[c.fecha].salidas += Number(c.total)
    }
  }

  const dias = Object.values(movsPorDia)
  let saldoAcum = 0
  const diasConSaldo = dias.map((d) => {
    saldoAcum += d.entradas - d.salidas
    return { ...d, neto: d.entradas - d.salidas, saldoAcum }
  })

  // Datos semana actual para gráfica (últimos 7 días con movimientos)
  const hoy = new Date()
  const diasConMov = diasConSaldo.filter((d) => d.entradas > 0 || d.salidas > 0).slice(-7)

  // Proyección mes siguiente basada en promedio diario del mes actual
  const diasConEntradas = dias.filter((d) => d.entradas > 0).length || 1
  const promDiarioEntradas = diasConSaldo.reduce((s, d) => s + d.entradas, 0) / finDia
  const promDiarioSalidas = diasConSaldo.reduce((s, d) => s + d.salidas, 0) / finDia
  const proyEntradas = promDiarioEntradas * finDiaSig
  const proySalidas = promDiarioSalidas * finDiaSig

  // Entradas/salidas reales mes siguiente (si ya hay datos)
  const entradasSigReales = (ventasSigRes.data ?? [])
    .filter((v) => v.tipo_pago !== 'Crédito')
    .reduce((s, v) => s + Number(v.total), 0)
  const salidasSigReales = (comprasSigRes.data ?? []).reduce((s, c) => s + Number(c.total), 0)

  return {
    dias: diasConSaldo,
    diasGrafica: diasConMov,
    totales: {
      entradas: diasConSaldo.reduce((s, d) => s + d.entradas, 0),
      salidas: diasConSaldo.reduce((s, d) => s + d.salidas, 0),
      saldoFinal: saldoAcum,
    },
    proyeccion: {
      mes: mesSig, ano: anoSig,
      entradasProyectadas: proyEntradas,
      salidasProyectadas: proySalidas,
      entradasReales: entradasSigReales,
      salidasReales: salidasSigReales,
    },
    periodo: { mes, ano },
  }
}
