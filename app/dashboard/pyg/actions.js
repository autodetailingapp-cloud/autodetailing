'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getProfile } from '@/lib/getProfile'

export async function getDatosPyg(mes, ano) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }

  const pad = (n) => String(n).padStart(2, '0')
  const finDia = (a, m) => new Date(a, m, 0).getDate()

  const rangoActual = { desde: `${ano}-${pad(mes)}-01`, hasta: `${ano}-${pad(mes)}-${pad(finDia(ano, mes))}` }
  const mesPrev = mes === 1 ? 12 : mes - 1
  const anoPrev = mes === 1 ? ano - 1 : ano
  const rangoAnterior = { desde: `${anoPrev}-${pad(mesPrev)}-01`, hasta: `${anoPrev}-${pad(mesPrev)}-${pad(finDia(anoPrev, mesPrev))}` }

  const [ventasAct, ventasPrev, comprasAct, comprasPrev, activos, costoInsumosAct, costoInsumosPrev] = await Promise.all([
    supabaseAdmin.from('ventas').select('total').eq('tenant_id', profile.tenant_id)
      .gte('fecha', rangoActual.desde).lte('fecha', rangoActual.hasta).eq('anulada', false),
    supabaseAdmin.from('ventas').select('total').eq('tenant_id', profile.tenant_id)
      .gte('fecha', rangoAnterior.desde).lte('fecha', rangoAnterior.hasta).eq('anulada', false),
    supabaseAdmin.from('compras').select('total,tipo,descripcion').eq('tenant_id', profile.tenant_id)
      .gte('fecha', rangoActual.desde).lte('fecha', rangoActual.hasta),
    supabaseAdmin.from('compras').select('total,tipo,descripcion').eq('tenant_id', profile.tenant_id)
      .gte('fecha', rangoAnterior.desde).lte('fecha', rangoAnterior.hasta),
    supabaseAdmin.from('activos_fijos').select('valor_adquisicion,vida_util_anos,fecha_compra')
      .eq('tenant_id', profile.tenant_id).eq('activo', true),
    supabaseAdmin.rpc('costo_insumos_periodo', {
      p_tenant_id: profile.tenant_id, p_desde: rangoActual.desde, p_hasta: rangoActual.hasta,
    }),
    supabaseAdmin.rpc('costo_insumos_periodo', {
      p_tenant_id: profile.tenant_id, p_desde: rangoAnterior.desde, p_hasta: rangoAnterior.hasta,
    }),
  ])

  const sum = (arr) => (arr ?? []).reduce((s, r) => s + Number(r.total ?? 0), 0)
  const filtrar = (arr, tipo, soloNomina) =>
    (arr ?? []).filter((r) => {
      if (r.tipo !== tipo) return false
      const esNomina = r.descripcion?.startsWith('Pago nómina:')
      if (soloNomina === true) return esNomina
      if (soloNomina === false) return !esNomina
      return true
    })

  // Las entradas de stock registradas desde Inventario crean automáticamente
  // una compra tipo "Costo" (descripción "Compra insumo: ..."). Esa compra es
  // el costo de adquisición, no el costo de venta — el costo de venta real ya
  // se calcula por separado vía costo_insumos_periodo (insumos efectivamente
  // consumidos en ventas). Se excluyen aquí para no duplicar el Costo de Ventas.
  const esCompraInsumoAutomatica = (r) => r.descripcion?.startsWith('Compra insumo:')
  const filtrarCostoManual = (arr) =>
    filtrar(arr, 'Costo').filter((r) => !esCompraInsumoAutomatica(r))

  const calcDeprecMensual = (activos) =>
    (activos ?? []).reduce((acc, a) => {
      const mesesVida = Number(a.vida_util_anos) * 12
      if (mesesVida <= 0) return acc
      const hoy = new Date()
      const compra = new Date(a.fecha_compra + 'T00:00:00')
      const mesesUsados = Math.max(0,
        (hoy.getFullYear() - compra.getFullYear()) * 12 + (hoy.getMonth() - compra.getMonth())
      )
      if (mesesUsados >= mesesVida) return acc
      return acc + Number(a.valor_adquisicion) / mesesVida
    }, 0)

  const deprecMensual = calcDeprecMensual(activos.data)

  const calcular = (ventas, compras, costoInsumos) => {
    const ingresos = sum(ventas)
    const costoComprasDirectas = sum(filtrarCostoManual(compras))
    const costoInsumosConsumidos = Number(costoInsumos ?? 0)
    const costoVentas = costoComprasDirectas + costoInsumosConsumidos
    const gastosOp = sum(filtrar(compras, 'Gasto', false))
    const nomina = sum(filtrar(compras, 'Gasto', true))
    const utilBruta = ingresos - costoVentas
    const utilNeta = utilBruta - gastosOp - nomina - deprecMensual
    return {
      ingresos, costoVentas, costoComprasDirectas, costoInsumosConsumidos,
      utilBruta, gastosOp, nomina, deprecMensual, utilNeta,
    }
  }

  return {
    actual: calcular(ventasAct.data, comprasAct.data, costoInsumosAct.data),
    anterior: calcular(ventasPrev.data, comprasPrev.data, costoInsumosPrev.data),
    periodo: { mes, ano, mesPrev, anoPrev },
  }
}
