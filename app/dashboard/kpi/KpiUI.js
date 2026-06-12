'use client'

import { useState, useTransition } from 'react'
import { getDatosKpi } from './actions'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const fmt = (n) => `$${Number(n ?? 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const pct = (n) => `${Number(n ?? 0).toFixed(1)}%`

function Trend({ actual, prev }) {
  if (prev == null || prev === 0) return null
  const d = ((actual - prev) / prev) * 100
  const up = d >= 0
  return (
    <span className={`text-xs font-semibold inline-flex items-center gap-0.5 ${up ? 'text-green-600' : 'text-red-500'}`}>
      {up ? '▲' : '▼'} {Math.abs(d).toFixed(1)}%
    </span>
  )
}

function KpiCard({ label, value, prev, prevLabel, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      {prev !== undefined && (
        <div className="flex items-center gap-2">
          <Trend actual={parseFloat(value.replace(/[$,%]/g, ''))} prev={prev} />
          {prevLabel && <span className="text-xs text-gray-400">{prevLabel}</span>}
        </div>
      )}
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function DiasSemanaChart({ ventasPorDia }) {
  const max = Math.max(...ventasPorDia, 1)
  const H = 80
  const W = 7 * 36

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-sm font-semibold text-gray-700 mb-4">Ventas por día de semana</p>
      <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full" style={{ maxHeight: '130px' }}>
        {ventasPorDia.map((v, i) => {
          const h = (v / max) * H
          return (
            <g key={i}>
              <rect x={i * 36 + 4} y={H - h} width={28} height={h} rx={4}
                fill={i === 0 || i === 6 ? '#e5e7eb' : '#4f86c6'} opacity="0.9" />
              <text x={i * 36 + 18} y={H + 14} textAnchor="middle" fontSize="9" fill="#6b7280">
                {DIAS_SEMANA[i]}
              </text>
              {v > 0 && (
                <text x={i * 36 + 18} y={H - h - 3} textAnchor="middle" fontSize="7" fill="#374151">
                  ${Math.round(v)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default function KpiUI({ datos: datosInit, mesInicial, anoInicial }) {
  const [mes, setMes] = useState(mesInicial)
  const [ano, setAno] = useState(anoInicial)
  const [datos, setDatos] = useState(datosInit)
  const [pending, startTransition] = useTransition()

  const cambiarPeriodo = (newMes, newAno) => {
    setMes(newMes)
    setAno(newAno)
    startTransition(async () => {
      const res = await getDatosKpi(newMes, newAno)
      if (!res.error) setDatos(res)
    })
  }

  if (datos?.error) return <p className="text-red-500">{datos.error}</p>
  if (!datos) return null

  const { ventas, margen, servicioTop, diasPromCobro, ventasPorDia, clientesUnicos, periodo } = datos
  const anos = [anoInicial - 1, anoInicial, anoInicial + 1]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">KPI Financieros</h1>
          <p className="text-sm text-gray-400 mt-0.5">Indicadores clave del período</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={mes} onChange={(e) => cambiarPeriodo(Number(e.target.value), ano)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-700 bg-white">
            {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={ano} onChange={(e) => cambiarPeriodo(mes, Number(e.target.value))}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-700 bg-white">
            {anos.map((y) => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {pending && <div className="text-center py-4 text-sm text-gray-400">Calculando...</div>}

      {/* Fila 1 — Ventas principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <KpiCard
          label="Ventas del mes"
          value={fmt(ventas.total)}
          prev={ventas.totalPrev}
          prevLabel={`vs ${MESES[periodo.mesPrev - 1]}`}
        />
        <KpiCard
          label="Ticket promedio"
          value={fmt(ventas.ticketPromedio)}
          prev={ventas.ticketPromPrev}
          prevLabel="vs mes anterior"
        />
        <KpiCard
          label="Clientes atendidos"
          value={String(clientesUnicos)}
          sub={`${ventas.count} ventas totales`}
        />
        <KpiCard
          label="vs mismo mes año anterior"
          value={fmt(ventas.totalAnoAnt)}
          prev={ventas.totalAnoAnt > 0 ? ventas.totalAnoAnt : undefined}
          sub={ventas.totalAnoAnt > 0 ? `${((ventas.total - ventas.totalAnoAnt) / ventas.totalAnoAnt * 100).toFixed(1)}% diferencia` : 'Sin datos año anterior'}
        />
      </div>

      {/* Fila 2 — Márgenes y cartera */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <KpiCard
          label="Margen bruto"
          value={pct(margen.bruto)}
          prev={margen.brutoPrev}
          prevLabel="vs mes anterior"
        />
        <KpiCard
          label="Margen neto"
          value={pct(margen.neto)}
          sub="Después de gastos y nómina"
        />
        <KpiCard
          label="Días prom. cobro cartera"
          value={diasPromCobro > 0 ? `${diasPromCobro.toFixed(0)} días` : 'Sin cartera'}
          sub="Promedio cartera vigente"
        />
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">Servicio más vendido</p>
          {servicioTop ? (
            <>
              <p className="text-lg font-bold text-gray-900 leading-tight">{servicioTop[0]}</p>
              <p className="text-sm text-gray-500 mt-1">{servicioTop[1]} unidades</p>
            </>
          ) : (
            <p className="text-sm text-gray-400">Sin datos</p>
          )}
        </div>
      </div>

      {/* Gráfica días de semana */}
      <DiasSemanaChart ventasPorDia={ventasPorDia} />
    </div>
  )
}
