'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getProfile } from '@/lib/getProfile'

export async function getDatosKpi(mes, ano) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }

  const pad = (n) => String(n).padStart(2, '0')
  const finDia = new Date(ano, mes, 0).getDate()
  const desde = `${ano}-${pad(mes)}-01`
  const hasta = `${ano}-${pad(mes)}-${pad(finDia)}`

  const mesPrev = mes === 1 ? 12 : mes - 1
  const anoPrev = mes === 1 ? ano - 1 : ano
  const finDiaPrev = new Date(anoPrev, mesPrev, 0).getDate()
  const desdePrev = `${anoPrev}-${pad(mesPrev)}-01`
  const hastaPrev = `${anoPrev}-${pad(mesPrev)}-${pad(finDiaPrev)}`

  const anoAnt = ano - 1
  const desdeAnoAnt = `${anoAnt}-${pad(mes)}-01`
  const hastaAnoAnt = `${anoAnt}-${pad(mes)}-${pad(new Date(anoAnt, mes, 0).getDate())}`

  const [ventasAct, ventasPrev, ventasAnoAnt, detallesAct, comprasAct, comprasPrev, carteraAct] = await Promise.all([
    supabaseAdmin.from('ventas').select('id,total,fecha,cliente_id').eq('tenant_id', profile.tenant_id)
      .gte('fecha', desde).lte('fecha', hasta).eq('anulada', false),
    supabaseAdmin.from('ventas').select('total').eq('tenant_id', profile.tenant_id)
      .gte('fecha', desdePrev).lte('fecha', hastaPrev).eq('anulada', false),
    supabaseAdmin.from('ventas').select('total').eq('tenant_id', profile.tenant_id)
      .gte('fecha', desdeAnoAnt).lte('fecha', hastaAnoAnt).eq('anulada', false),
    // detalles se carga después de tener los venta_ids del período
    Promise.resolve({ data: [] }),
    supabaseAdmin.from('compras').select('total,tipo').eq('tenant_id', profile.tenant_id)
      .gte('fecha', desde).lte('fecha', hasta),
    supabaseAdmin.from('compras').select('total,tipo').eq('tenant_id', profile.tenant_id)
      .gte('fecha', desdePrev).lte('fecha', hastaPrev),
    supabaseAdmin.from('cartera').select('fecha_vencimiento,fecha_creacion,estado,saldo_pendiente,monto_original')
      .eq('tenant_id', profile.tenant_id),
  ])

  // Para detalles: hacer join correcto con ventas del período
  const ventaIds = (ventasAct.data ?? []).map((v) => v.id)
  let detalles = []
  if (ventaIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('detalle_ventas')
      .select('cantidad,precio_unitario,servicios(nombre)')
      .in('venta_id', ventaIds)
    detalles = data ?? []
  }

  const sum = (arr, f = 'total') => (arr ?? []).reduce((s, r) => s + Number(r[f] ?? 0), 0)

  const totalActual = sum(ventasAct.data)
  const countActual = ventasAct.data?.length ?? 0
  const totalPrev = sum(ventasPrev.data)
  const totalAnoAnt = sum(ventasAnoAnt.data)

  const ticketPromedio = countActual > 0 ? totalActual / countActual : 0
  const ticketPromPrev = (ventasPrev.data?.length ?? 0) > 0 ? totalPrev / ventasPrev.data.length : 0

  // Servicio más vendido
  const servicioConteo = {}
  for (const d of detalles) {
    const nombre = d.servicios?.nombre ?? 'Desconocido'
    servicioConteo[nombre] = (servicioConteo[nombre] ?? 0) + Number(d.cantidad ?? 1)
  }
  const servicioTop = Object.entries(servicioConteo).sort((a, b) => b[1] - a[1])[0] ?? null

  // Márgenes
  const costos = sum((comprasAct.data ?? []).filter((c) => c.tipo === 'Costo'))
  const gastos = sum((comprasAct.data ?? []).filter((c) => c.tipo === 'Gasto'))
  const costosPrev = sum((comprasPrev.data ?? []).filter((c) => c.tipo === 'Costo'))
  const margenBruto = totalActual > 0 ? ((totalActual - costos) / totalActual) * 100 : 0
  const margenNeto = totalActual > 0 ? ((totalActual - costos - gastos) / totalActual) * 100 : 0
  const margenBrutoPrev = totalPrev > 0 ? ((totalPrev - costosPrev) / totalPrev) * 100 : 0

  // Días promedio cobro cartera
  const carteraVigente = (carteraAct.data ?? []).filter(
    (c) => c.estado !== 'pagado' && Number(c.saldo_pendiente) > 0
  )
  let diasPromCobro = 0
  if (carteraVigente.length > 0) {
    const hoy = new Date()
    const diasTotales = carteraVigente.reduce((s, c) => {
      const creacion = new Date(c.fecha_creacion ?? c.fecha_vencimiento)
      return s + Math.max(0, Math.floor((hoy - creacion) / (1000 * 60 * 60 * 24)))
    }, 0)
    diasPromCobro = diasTotales / carteraVigente.length
  }

  // Ventas por día de semana (0=Dom, 1=Lun, ..., 6=Sáb)
  const ventasPorDia = [0, 0, 0, 0, 0, 0, 0]
  for (const v of ventasAct.data ?? []) {
    const diaSemana = new Date(v.fecha + 'T00:00:00').getDay()
    ventasPorDia[diaSemana] += Number(v.total)
  }

  // Clientes únicos atendidos
  const clientesUnicos = new Set((ventasAct.data ?? []).map((v) => v.cliente_id).filter(Boolean)).size

  return {
    ventas: {
      total: totalActual, totalPrev, totalAnoAnt, count: countActual,
      ticketPromedio, ticketPromPrev,
    },
    margen: { bruto: margenBruto, neto: margenNeto, brutoPrev: margenBrutoPrev },
    servicioTop,
    diasPromCobro,
    ventasPorDia,
    clientesUnicos,
    periodo: { mes, ano, mesPrev, anoPrev },
  }
}
