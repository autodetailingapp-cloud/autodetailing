'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getProfile } from '@/lib/getProfile'

// Cuotas RIMPE Popular — categoría Servicios (SRI Ecuador 2024)
// Cuota mensual fija según ingresos anuales acumulados
const CUOTAS_RIMPE_POPULAR = [
  { hasta: 3000, cuotaMensual: 1.17 },
  { hasta: 5000, cuotaMensual: 3.51 },
  { hasta: 8000, cuotaMensual: 7.02 },
  { hasta: 10000, cuotaMensual: 10.53 },
  { hasta: 12000, cuotaMensual: 14.04 },
  { hasta: 15000, cuotaMensual: 18.72 },
  { hasta: 20000, cuotaMensual: 22.23 },
]

export async function getDatosTributario(ano) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }

  const { data: tenant } = await supabaseAdmin
    .from('tenants').select('regimen_sri,nombre').eq('id', profile.tenant_id).single()

  const regimen = (tenant?.regimen_sri ?? '').toLowerCase()
  const esRimpePopular = regimen.includes('popular')
  const esRimpeEmprendedor = regimen.includes('emprendedor')

  // Ingresos del año corriente
  const [ventasAnoRes, comprasAnoRes] = await Promise.all([
    supabaseAdmin.from('ventas').select('total,fecha,tipo_doc_venta')
      .eq('tenant_id', profile.tenant_id)
      .gte('fecha', `${ano}-01-01`).lte('fecha', `${ano}-12-31`)
      .eq('anulada', false),
    supabaseAdmin.from('compras').select('total,tipo_doc_compra,iva,fecha')
      .eq('tenant_id', profile.tenant_id)
      .gte('fecha', `${ano}-01-01`).lte('fecha', `${ano}-12-31`),
  ])

  const ventasAno = ventasAnoRes.data ?? []
  const comprasAno = comprasAnoRes.data ?? []

  const ingresosAnuales = ventasAno.reduce((s, v) => s + Number(v.total), 0)

  // Ingresos por semestre para RIMPE Emprendedor
  const ingresosSem1 = ventasAno
    .filter((v) => v.fecha >= `${ano}-01-01` && v.fecha <= `${ano}-06-30`)
    .reduce((s, v) => s + Number(v.total), 0)
  const ingresosSem2 = ventasAno
    .filter((v) => v.fecha >= `${ano}-07-01` && v.fecha <= `${ano}-12-31`)
    .reduce((s, v) => s + Number(v.total), 0)

  // IVA para régimen General
  const ivaVentasFactura = ventasAno
    .filter((v) => !esRimpePopular && !esRimpeEmprendedor)
    .reduce((s, v) => s + Number(v.total ?? 0) * (15 / 115), 0)
  const ivaComprasFactura = comprasAno
    .filter((c) => c.tipo_doc_compra === 'Factura')
    .reduce((s, c) => s + Number(c.iva ?? 0), 0)
  const ivaDeclarar = Math.max(0, ivaVentasFactura - ivaComprasFactura)

  // Cuota RIMPE Popular según ingresos acumulados al año
  const cuotaPopular = (() => {
    if (!esRimpePopular) return null
    const tramo = CUOTAS_RIMPE_POPULAR.find((t) => ingresosAnuales <= t.hasta) ?? CUOTAS_RIMPE_POPULAR.at(-1)
    return {
      ingresosAnuales,
      tramo: tramo.hasta,
      cuotaMensual: tramo.cuotaMensual,
      cuotaAnual: tramo.cuotaMensual * 12,
      alertaLimite: ingresosAnuales > 18000,
      tabla: CUOTAS_RIMPE_POPULAR,
    }
  })()

  // Obligación RIMPE Emprendedor
  const rimpeEmprendedor = (() => {
    if (!esRimpeEmprendedor) return null
    return {
      tasa: 1.5,
      sem1: { ingresos: ingresosSem1, impuesto: ingresosSem1 * 0.015, declaracion: `Marzo ${ano}` },
      sem2: { ingresos: ingresosSem2, impuesto: ingresosSem2 * 0.015, declaracion: `Septiembre ${ano}` },
      totalAno: (ingresosSem1 + ingresosSem2) * 0.015,
    }
  })()

  // Declaración IVA General (mensual resumen)
  const ivaGeneral = (() => {
    if (esRimpePopular || esRimpeEmprendedor) return null
    // Calcular por mes para el año
    const meses = Array.from({ length: 12 }, (_, i) => {
      const m = String(i + 1).padStart(2, '0')
      const ventasMes = ventasAno.filter((v) => v.fecha.startsWith(`${ano}-${m}`))
      const comprasMes = comprasAno.filter((c) => c.fecha.startsWith(`${ano}-${m}`) && c.tipo_doc_compra === 'Factura')
      const ivaCob = ventasMes.reduce((s, v) => s + Number(v.total) * (15 / 115), 0)
      const ivaPag = comprasMes.reduce((s, c) => s + Number(c.iva ?? 0), 0)
      return { mes: i + 1, ivaCobrado: ivaCob, ivaPagado: ivaPag, ivaDeclarar: Math.max(0, ivaCob - ivaPag) }
    })
    return { meses, totalDeclarar: meses.reduce((s, m) => s + m.ivaDeclarar, 0) }
  })()

  return {
    tenant: { nombre: tenant?.nombre, regimen: tenant?.regimen_sri ?? 'No configurado' },
    regimen: { esRimpePopular, esRimpeEmprendedor, esGeneral: !esRimpePopular && !esRimpeEmprendedor },
    ingresosAnuales,
    cuotaPopular,
    rimpeEmprendedor,
    ivaGeneral,
    ano,
  }
}
