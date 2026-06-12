'use client'

import { useState, useTransition } from 'react'
import { getDatosTributario } from './actions'

const fmt = (n) => `$${Number(n ?? 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function BadgeRegimen({ regimen, esRimpePopular, esRimpeEmprendedor, esGeneral }) {
  let color = 'bg-gray-100 text-gray-700'
  if (esRimpePopular) color = 'bg-green-100 text-green-800'
  else if (esRimpeEmprendedor) color = 'bg-blue-100 text-blue-800'
  else if (esGeneral) color = 'bg-purple-100 text-purple-800'
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${color}`}>
      {regimen || 'No configurado'}
    </span>
  )
}

function SeccionRimpePopular({ datos }) {
  const { cuotaPopular, ingresosAnuales, ano } = datos
  if (!cuotaPopular) return null

  return (
    <div className="space-y-4">
      {cuotaPopular.alertaLimite && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-800">Alerta: ingresos cercanos al límite RIMPE Popular</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Tus ingresos anuales ({fmt(ingresosAnuales)}) superan $18,000. El límite para RIMPE Popular es $20,000.
              Consulta con tu contador sobre el cambio de régimen.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Ingresos acumulados {ano}</p>
          <p className="text-2xl font-bold text-gray-900">{fmt(ingresosAnuales)}</p>
          <div className="mt-2 h-2 bg-gray-100 rounded-full">
            <div className="h-2 bg-brand rounded-full" style={{ width: `${Math.min((ingresosAnuales / 20000) * 100, 100)}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1">{((ingresosAnuales / 20000) * 100).toFixed(0)}% del límite $20,000</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Cuota mensual</p>
          <p className="text-2xl font-bold text-green-700">{fmt(cuotaPopular.cuotaMensual)}</p>
          <p className="text-xs text-gray-400 mt-1">Tramo hasta {fmt(cuotaPopular.tramo)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Obligación anual</p>
          <p className="text-2xl font-bold text-gray-900">{fmt(cuotaPopular.cuotaAnual)}</p>
          <p className="text-xs text-gray-400 mt-1">12 cuotas mensuales</p>
        </div>
      </div>

      {/* Tabla de cuotas */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Tabla RIMPE Popular — Categoría Servicios (SRI 2024)</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2.5 pl-4 text-xs font-semibold text-gray-500">Ingresos anuales hasta</th>
              <th className="text-right py-2.5 pr-4 text-xs font-semibold text-gray-500">Cuota mensual</th>
              <th className="text-right py-2.5 pr-4 text-xs font-semibold text-gray-500">Cuota anual</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {cuotaPopular.tabla.map((t) => (
              <tr key={t.hasta}
                className={ingresosAnuales <= t.hasta && (cuotaPopular.tabla.indexOf(t) === 0 || ingresosAnuales > (cuotaPopular.tabla[cuotaPopular.tabla.indexOf(t) - 1]?.hasta ?? 0))
                  ? 'bg-brand-light/60' : 'hover:bg-gray-50'}>
                <td className="py-2.5 pl-4 text-sm text-gray-700">{fmt(t.hasta)}</td>
                <td className="py-2.5 pr-4 text-sm text-right font-medium text-gray-900">{fmt(t.cuotaMensual)}</td>
                <td className="py-2.5 pr-4 text-sm text-right text-gray-500">{fmt(t.cuotaMensual * 12)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="px-4 py-2 text-xs text-gray-400 bg-gray-50 border-t border-gray-100">
          * Valores referenciales. Verifique la tabla vigente en sri.gob.ec
        </p>
      </div>
    </div>
  )
}

function SeccionRimpeEmprendedor({ datos }) {
  const { rimpeEmprendedor, ano } = datos
  if (!rimpeEmprendedor) return null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {[rimpeEmprendedor.sem1, rimpeEmprendedor.sem2].map((sem, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-3">
            {i === 0 ? '1er Semestre' : '2do Semestre'} — Declaración: {sem.declaracion}
          </p>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Ingresos del semestre</span>
              <span className="font-semibold text-gray-900">{fmt(sem.ingresos)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tasa RIMPE Emprendedor</span>
              <span className="text-gray-600">1.5%</span>
            </div>
            <div className="flex justify-between text-sm font-bold border-t border-gray-100 pt-2">
              <span className="text-gray-900">Impuesto a pagar</span>
              <span className="text-blue-700">{fmt(sem.impuesto)}</span>
            </div>
          </div>
        </div>
      ))}
      <div className="lg:col-span-2 bg-blue-50 rounded-2xl border border-blue-100 p-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-blue-800">Total impuesto RIMPE Emprendedor {ano}</span>
          <span className="text-xl font-bold text-blue-900">{fmt(rimpeEmprendedor.totalAno)}</span>
        </div>
      </div>
    </div>
  )
}

function SeccionGeneral({ datos }) {
  const { ivaGeneral, ano } = datos
  if (!ivaGeneral) return null

  const mesActual = new Date().getMonth()

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Declaración IVA mensual — {ano}</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2.5 pl-4 text-xs font-semibold text-gray-500">Mes</th>
              <th className="text-right py-2.5 pr-4 text-xs font-semibold text-green-600">IVA cobrado</th>
              <th className="text-right py-2.5 pr-4 text-xs font-semibold text-red-500">IVA pagado</th>
              <th className="text-right py-2.5 pr-4 text-xs font-semibold text-gray-700">IVA a declarar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {ivaGeneral.meses.map((m) => (
              <tr key={m.mes} className={m.mes - 1 === mesActual ? 'bg-brand-light/40' : 'hover:bg-gray-50'}>
                <td className="py-2.5 pl-4 text-sm text-gray-700">{MESES[m.mes - 1]}</td>
                <td className="py-2.5 pr-4 text-sm text-right text-green-700">{m.ivaCobrado > 0 ? fmt(m.ivaCobrado) : '—'}</td>
                <td className="py-2.5 pr-4 text-sm text-right text-red-600">{m.ivaPagado > 0 ? fmt(m.ivaPagado) : '—'}</td>
                <td className="py-2.5 pr-4 text-sm text-right font-semibold text-gray-900">{m.ivaDeclarar > 0 ? fmt(m.ivaDeclarar) : '—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300 bg-gray-50">
              <td className="py-3 pl-4 text-sm font-bold text-gray-900">Total {ano}</td>
              <td colSpan={2} />
              <td className="py-3 pr-4 text-sm font-bold text-right text-gray-900">{fmt(ivaGeneral.totalDeclarar)}</td>
            </tr>
          </tfoot>
        </table>
        <p className="px-4 py-2 text-xs text-gray-400 bg-gray-50 border-t border-gray-100">
          * IVA cobrado estimado (15/115 del total de ventas). Verifique con su contador para la declaración oficial.
        </p>
      </div>
    </div>
  )
}

export default function TributarioUI({ datos: datosInit, anoInicial }) {
  const [ano, setAno] = useState(anoInicial)
  const [datos, setDatos] = useState(datosInit)
  const [pending, startTransition] = useTransition()

  const cambiarAno = (newAno) => {
    setAno(newAno)
    startTransition(async () => {
      const res = await getDatosTributario(newAno)
      if (!res.error) setDatos(res)
    })
  }

  if (datos?.error) return <p className="text-red-500">{datos.error}</p>
  if (!datos) return null

  const anos = [anoInicial - 1, anoInicial]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Informe Tributario SRI</h1>
          <p className="text-sm text-gray-400 mt-0.5">Ecuador — {datos.tenant.nombre}</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={ano} onChange={(e) => cambiarAno(Number(e.target.value))}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-700 bg-white">
            {anos.map((y) => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {pending && <div className="text-center py-4 text-sm text-gray-400">Calculando...</div>}

      {/* Régimen detectado */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
        <div className="flex-1">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Régimen tributario detectado</p>
          <div className="flex items-center gap-3">
            <BadgeRegimen {...datos.regimen} regimen={datos.tenant.regimen} />
            <p className="text-sm text-gray-500">
              {datos.regimen.esRimpePopular && 'Negocio popular — cuota fija mensual, máximo $20,000/año'}
              {datos.regimen.esRimpeEmprendedor && 'Emprendedor — 1.5% semestral sobre ingresos brutos'}
              {datos.regimen.esGeneral && 'Contribuyente general — declaración IVA mensual'}
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-400 ml-4">
          Configura el régimen en <strong>Configuración → Empresa</strong>
        </p>
      </div>

      {/* Secciones según régimen */}
      {datos.regimen.esRimpePopular && <SeccionRimpePopular datos={datos} />}
      {datos.regimen.esRimpeEmprendedor && <SeccionRimpeEmprendedor datos={datos} />}
      {datos.regimen.esGeneral && <SeccionGeneral datos={datos} />}

      {!datos.regimen.esRimpePopular && !datos.regimen.esRimpeEmprendedor && !datos.regimen.esGeneral && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
          <p className="text-sm font-semibold text-amber-800 mb-1">Régimen no configurado</p>
          <p className="text-sm text-amber-700">
            Ve a Configuración → Empresa y establece el campo <strong>Régimen SRI</strong> para ver tu informe tributario.
          </p>
        </div>
      )}
    </div>
  )
}
