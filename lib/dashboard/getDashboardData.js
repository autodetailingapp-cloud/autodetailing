import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getDatosPyg } from '@/app/dashboard/pyg/actions'
import { getDatosBalance } from '@/app/dashboard/balance/actions'
import { getDatosFlujo } from '@/app/dashboard/flujo/actions'
import { getDatosKpi } from '@/app/dashboard/kpi/actions'

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const pad = (n) => String(n).padStart(2, '0')

function rangoMes(ano, mes) {
  const finDia = new Date(ano, mes, 0).getDate()
  return { desde: `${ano}-${pad(mes)}-01`, hasta: `${ano}-${pad(mes)}-${pad(finDia)}` }
}

// Últimos `n` períodos (mes, año) terminando en (mesBase, anoBase), en orden cronológico.
function ultimosMeses(n, anoBase, mesBase) {
  const out = []
  let m = mesBase, a = anoBase
  for (let i = 0; i < n; i++) {
    out.unshift({ mes: m, ano: a })
    m -= 1
    if (m === 0) { m = 12; a -= 1 }
  }
  return out
}

const labelPeriodo = ({ mes, ano }) => `${MESES[mes - 1]} ${String(ano).slice(2)}`

export async function getDashboardExecutiveData(tenantId) {
  const hoy = new Date()
  const mesActual = hoy.getMonth() + 1
  const anoActual = hoy.getFullYear()
  const hoyStr = hoy.toISOString().split('T')[0]

  // KPIs 2, 3, 4, 5 y 6: se reutiliza la lógica ya validada de los módulos financieros
  // existentes (pyg, balance, flujo, kpi) en vez de reimplementar sus cálculos aquí.
  // Estas funciones vuelven a resolver getProfile() internamente (mismo patrón que ya
  // usa compras/actions.js al reutilizar registrarEntrada de inventario/actions.js).
  const [pyg, balance, flujo, kpi] = await Promise.all([
    getDatosPyg(mesActual, anoActual),
    getDatosBalance(hoyStr),
    getDatosFlujo(mesActual, anoActual),
    getDatosKpi(mesActual, anoActual),
  ])

  const meses12 = ultimosMeses(12, anoActual, mesActual)
  const meses6 = ultimosMeses(6, anoActual, mesActual)
  const { desde: desde12 } = rangoMes(meses12[0].ano, meses12[0].mes)
  const { desde: desde6 } = rangoMes(meses6[0].ano, meses6[0].mes)
  const { desde: desdeMesActual, hasta: hastaMesActual } = rangoMes(anoActual, mesActual)

  // Consultas nuevas para las gráficas (no cubiertas por ningún módulo existente):
  // agregación mensual histórica de ventas/compras y evolución de cartera.
  const [ventasMesRes, ventas12Res, compras6Res, carteraRes, pagosCarteraRes] = await Promise.all([
    supabaseAdmin.from('ventas').select('id,total,tipo_pago')
      .eq('tenant_id', tenantId).eq('estado', 'activa')
      .gte('fecha', desdeMesActual).lte('fecha', hastaMesActual),
    supabaseAdmin.from('ventas').select('fecha,total')
      .eq('tenant_id', tenantId).eq('estado', 'activa')
      .gte('fecha', desde12).lte('fecha', hastaMesActual),
    supabaseAdmin.from('compras').select('fecha,total')
      .eq('tenant_id', tenantId)
      .gte('fecha', desde6).lte('fecha', hastaMesActual),
    supabaseAdmin.from('cartera').select('id,monto_original,fecha_venta')
      .eq('tenant_id', tenantId),
    supabaseAdmin.from('pagos_cartera').select('cartera_id,monto,fecha')
      .eq('tenant_id', tenantId),
  ])

  // Top 5 servicios por ingresos del mes actual (detalle_ventas de las ventas del mes)
  const ventaIdsMes = (ventasMesRes.data ?? []).map((v) => v.id)
  let detalles = []
  if (ventaIdsMes.length > 0) {
    const { data } = await supabaseAdmin
      .from('detalle_ventas')
      .select('subtotal,servicios(nombre)')
      .in('venta_id', ventaIdsMes)
    detalles = data ?? []
  }
  const ingresoPorServicio = {}
  for (const d of detalles) {
    const nombre = d.servicios?.nombre ?? 'Otro'
    ingresoPorServicio[nombre] = (ingresoPorServicio[nombre] ?? 0) + Number(d.subtotal ?? 0)
  }
  const topServicios = Object.entries(ingresoPorServicio)
    .map(([nombre, total]) => ({ nombre, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  // Distribución de ventas por tipo de pago (mes actual)
  const porTipoPago = {}
  for (const v of ventasMesRes.data ?? []) {
    porTipoPago[v.tipo_pago] = (porTipoPago[v.tipo_pago] ?? 0) + Number(v.total ?? 0)
  }
  const distribucionTipoPago = Object.entries(porTipoPago).map(([tipo, total]) => ({ tipo, total }))

  // Ingresos últimos 12 meses
  const ingresosPorMes = {}
  for (const p of meses12) ingresosPorMes[`${p.ano}-${pad(p.mes)}`] = 0
  for (const v of ventas12Res.data ?? []) {
    const key = v.fecha.slice(0, 7)
    if (key in ingresosPorMes) ingresosPorMes[key] += Number(v.total ?? 0)
  }
  const ingresos12Meses = meses12.map((p) => ({
    periodo: labelPeriodo(p),
    ingresos: ingresosPorMes[`${p.ano}-${pad(p.mes)}`] ?? 0,
  }))

  // Ingresos vs gastos, últimos 6 meses
  const gastosPorMes = {}
  for (const p of meses6) gastosPorMes[`${p.ano}-${pad(p.mes)}`] = 0
  for (const c of compras6Res.data ?? []) {
    const key = c.fecha.slice(0, 7)
    if (key in gastosPorMes) gastosPorMes[key] += Number(c.total ?? 0)
  }
  const ingresosVsGastos6Meses = meses6.map((p) => {
    const key = `${p.ano}-${pad(p.mes)}`
    return { periodo: labelPeriodo(p), ingresos: ingresosPorMes[key] ?? 0, gastos: gastosPorMes[key] ?? 0 }
  })

  // Evolución de cartera pendiente, últimos 6 meses: saldo pendiente reconstruido al
  // cierre de cada mes a partir de monto_original y los pagos registrados hasta esa fecha
  // (cartera/pagos_cartera no guardan un histórico de saldo, así que se deriva aquí).
  const cartera = carteraRes.data ?? []
  const pagos = pagosCarteraRes.data ?? []
  const evolucionCartera = meses6.map((p) => {
    const { hasta: cierre } = rangoMes(p.ano, p.mes)
    let pendiente = 0
    for (const c of cartera) {
      if (!c.fecha_venta || c.fecha_venta > cierre) continue
      const pagado = pagos
        .filter((pg) => pg.cartera_id === c.id && pg.fecha <= cierre)
        .reduce((s, pg) => s + Number(pg.monto ?? 0), 0)
      pendiente += Math.max(0, Number(c.monto_original ?? 0) - pagado)
    }
    return { periodo: labelPeriodo(p), pendiente }
  })

  // KPIs derivados de los módulos reutilizados
  const ventasMesActual = pyg?.actual?.ingresos ?? 0
  const ventasMesAnterior = pyg?.anterior?.ingresos ?? 0
  const variacionPct = ventasMesAnterior > 0
    ? ((ventasMesActual - ventasMesAnterior) / ventasMesAnterior) * 100
    : null
  const margenBrutoPct = ventasMesActual > 0 ? (pyg.actual.utilBruta / ventasMesActual) * 100 : 0
  const carteraPendiente = balance?.activosCorrientes?.carteraCobrar ?? 0
  const saldoCajaActual = flujo?.totales?.saldoFinal ?? 0
  const servicioTop = kpi?.servicioTop ? { nombre: kpi.servicioTop[0], cantidad: kpi.servicioTop[1] } : null

  return {
    kpis: { ventasMesActual, variacionPct, margenBrutoPct, carteraPendiente, saldoCajaActual, servicioTop },
    graficas: { ingresos12Meses, topServicios, distribucionTipoPago, ingresosVsGastos6Meses, evolucionCartera },
    periodo: { mes: mesActual, ano: anoActual },
  }
}
