'use client'

import { useState, useTransition } from 'react'
import { getDatosPyg } from './actions'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const fmt = (n) => `$${Number(n ?? 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const pct = (n) => `${Number(n ?? 0).toFixed(1)}%`
const margen = (util, ing) => ing > 0 ? (util / ing) * 100 : 0
const diff = (actual, prev) => prev === 0 ? null : ((actual - prev) / prev) * 100

function Tendencia({ actual, prev }) {
  const d = diff(actual, prev)
  if (d === null) return null
  const up = d >= 0
  return (
    <span className={`ml-2 text-xs font-semibold inline-flex items-center gap-0.5 ${up ? 'text-green-600' : 'text-red-500'}`}>
      {up ? '▲' : '▼'} {Math.abs(d).toFixed(1)}%
    </span>
  )
}

function Fila({ label, valor, valorPrev, indent = false, bold = false, color = '' }) {
  return (
    <tr className={bold ? 'font-bold' : ''}>
      <td className={`py-2.5 text-sm ${indent ? 'pl-8' : 'pl-4'} ${bold ? 'text-gray-900' : 'text-gray-700'}`}>
        {label}
      </td>
      <td className={`py-2.5 text-sm text-right pr-4 ${color || (bold ? 'text-gray-900' : 'text-gray-700')}`}>
        {fmt(valor)}
        {valorPrev !== undefined && <Tendencia actual={valor} prev={valorPrev} />}
      </td>
      <td className={`py-2.5 text-sm text-right pr-4 text-gray-400`}>
        {valorPrev !== undefined ? fmt(valorPrev) : ''}
      </td>
    </tr>
  )
}

function Separador({ label }) {
  return (
    <tr>
      <td colSpan={3} className="pt-4 pb-1 px-4">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</div>
      </td>
    </tr>
  )
}

export default function PygUI({ datos: datosInit, mesInicial, anoInicial }) {
  const [mes, setMes] = useState(mesInicial)
  const [ano, setAno] = useState(anoInicial)
  const [datos, setDatos] = useState(datosInit)
  const [pending, startTransition] = useTransition()

  const cambiarPeriodo = (newMes, newAno) => {
    setMes(newMes)
    setAno(newAno)
    startTransition(async () => {
      const res = await getDatosPyg(newMes, newAno)
      if (!res.error) setDatos(res)
    })
  }

  if (datos?.error) return <p className="text-red-500">{datos.error}</p>

  const { actual: a, anterior: ant, periodo: p } = datos ?? {}
  if (!a) return null

  const margenBruto = margen(a.utilBruta, a.ingresos)
  const margenNeto = margen(a.utilNeta, a.ingresos)
  const margenBrutoPrev = margen(ant?.utilBruta, ant?.ingresos)
  const margenNetoPrev = margen(ant?.utilNeta, ant?.ingresos)

  const anos = [anoInicial - 1, anoInicial, anoInicial + 1]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estado de Resultados</h1>
          <p className="text-sm text-gray-400 mt-0.5">P&G — calculado desde ventas y compras</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={mes} onChange={(e) => cambiarPeriodo(Number(e.target.value), ano)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-700 bg-white"
          >
            {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select
            value={ano} onChange={(e) => cambiarPeriodo(mes, Number(e.target.value))}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-700 bg-white"
          >
            {anos.map((y) => <option key={y}>{y}</option>)}
          </select>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-medium rounded-xl hover:bg-brand-dark transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-6 text-center">
        <h1 className="text-xl font-bold">Estado de Resultados</h1>
        <p className="text-sm text-gray-500">{MESES[mes - 1]} {ano}</p>
      </div>

      {pending && <div className="text-center py-4 text-sm text-gray-400">Calculando...</div>}

      {/* Tabla P&G */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left py-3 pl-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Concepto</th>
              <th className="text-right py-3 pr-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                {MESES[mes - 1]} {ano}
              </th>
              <th className="text-right py-3 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {MESES[p.mesPrev - 1]} {p.anoPrev}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            <Separador label="Ingresos" />
            <Fila label="Ventas netas" valor={a.ingresos} valorPrev={ant?.ingresos} bold />

            <Separador label="Costos directos" />
            <Fila label="Costo de ventas" valor={a.costoVentas} valorPrev={ant?.costoVentas} indent />

            <tr className="bg-green-50/60">
              <td className="py-3 pl-4 text-sm font-bold text-gray-900">Utilidad bruta</td>
              <td className="py-3 pr-4 text-right text-sm font-bold text-green-700">
                {fmt(a.utilBruta)}
                <span className="ml-2 text-xs text-green-600 font-normal">({pct(margenBruto)})</span>
              </td>
              <td className="py-3 pr-4 text-right text-sm text-gray-400">
                {fmt(ant?.utilBruta)}
                <span className="ml-2 text-xs font-normal">({pct(margenBrutoPrev)})</span>
              </td>
            </tr>

            <Separador label="Gastos operacionales" />
            <Fila label="Gastos operativos" valor={a.gastosOp} valorPrev={ant?.gastosOp} indent />
            <Fila label="Nómina" valor={a.nomina} valorPrev={ant?.nomina} indent />
            <Fila label="Depreciación activos" valor={a.deprecMensual} valorPrev={ant?.deprecMensual} indent />

            <tr className={`${a.utilNeta >= 0 ? 'bg-brand-light/50' : 'bg-red-50'}`}>
              <td className="py-3 pl-4 text-sm font-bold text-gray-900">Utilidad neta</td>
              <td className={`py-3 pr-4 text-right text-sm font-bold ${a.utilNeta >= 0 ? 'text-brand' : 'text-red-600'}`}>
                {fmt(a.utilNeta)}
                <span className="ml-2 text-xs font-normal">({pct(margenNeto)})</span>
              </td>
              <td className="py-3 pr-4 text-right text-sm text-gray-400">
                {fmt(ant?.utilNeta)}
                <span className="ml-2 text-xs font-normal">({pct(margenNetoPrev)})</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Resumen de márgenes */}
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">Margen bruto</p>
          <p className="text-3xl font-bold text-gray-900">{pct(margenBruto)}</p>
          <Tendencia actual={margenBruto} prev={margenBrutoPrev} />
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">Margen neto</p>
          <p className={`text-3xl font-bold ${margenNeto >= 0 ? 'text-gray-900' : 'text-red-600'}`}>{pct(margenNeto)}</p>
          <Tendencia actual={margenNeto} prev={margenNetoPrev} />
        </div>
      </div>

      <style jsx global>{`@media print { .print\\:hidden { display: none !important; } .print\\:block { display: block !important; } }`}</style>
    </div>
  )
}
