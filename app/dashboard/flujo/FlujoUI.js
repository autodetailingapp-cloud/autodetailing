'use client'

import { useState, useTransition } from 'react'
import { getDatosFlujo } from './actions'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const fmt = (n) => `$${Number(n ?? 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtFecha = (iso) => {
  const d = new Date(iso + 'T00:00:00')
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

function BarChart({ dias }) {
  if (!dias || dias.length === 0) return (
    <div className="flex items-center justify-center h-32 text-sm text-gray-400">Sin movimientos en el período</div>
  )
  const maxVal = Math.max(...dias.map((d) => Math.max(d.entradas, d.salidas)), 1)
  const H = 100
  const W = Math.max(dias.length * 30, 200)

  return (
    <svg viewBox={`0 0 ${W} ${H + 28}`} className="w-full" style={{ maxHeight: '160px' }}>
      {dias.map((d, i) => {
        const x = i * 30
        const hEnt = (d.entradas / maxVal) * H
        const hSal = (d.salidas / maxVal) * H
        return (
          <g key={d.fecha}>
            <rect x={x + 2} y={H - hEnt} width={11} height={hEnt} rx={2} fill="#4f86c6" opacity="0.85" />
            <rect x={x + 15} y={H - hSal} width={11} height={hSal} rx={2} fill="#f87171" opacity="0.85" />
            <text x={x + 13} y={H + 14} textAnchor="middle" fontSize="7" fill="#9ca3af">{fmtFecha(d.fecha)}</text>
          </g>
        )
      })}
      {/* Leyenda */}
      <rect x={2} y={H + 22} width={8} height={5} rx={1} fill="#4f86c6" opacity="0.85" />
      <text x={13} y={H + 27} fontSize="7" fill="#6b7280">Entradas</text>
      <rect x={60} y={H + 22} width={8} height={5} rx={1} fill="#f87171" opacity="0.85" />
      <text x={71} y={H + 27} fontSize="7" fill="#6b7280">Salidas</text>
    </svg>
  )
}

export default function FlujoUI({ datos: datosInit, mesInicial, anoInicial }) {
  const [mes, setMes] = useState(mesInicial)
  const [ano, setAno] = useState(anoInicial)
  const [datos, setDatos] = useState(datosInit)
  const [pending, startTransition] = useTransition()

  const cambiarPeriodo = (newMes, newAno) => {
    setMes(newMes)
    setAno(newAno)
    startTransition(async () => {
      const res = await getDatosFlujo(newMes, newAno)
      if (!res.error) setDatos(res)
    })
  }

  if (datos?.error) return <p className="text-red-500">{datos.error}</p>
  if (!datos) return null

  const { dias, diasGrafica, totales, proyeccion } = datos
  const diasConMov = dias.filter((d) => d.entradas > 0 || d.salidas > 0)
  const anos = [anoInicial - 1, anoInicial, anoInicial + 1]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Flujo de Caja</h1>
          <p className="text-sm text-gray-400 mt-0.5">Entradas y salidas de efectivo del período</p>
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

      {/* Resumen top */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Entradas totales</p>
          <p className="text-2xl font-bold text-green-700">{fmt(totales.entradas)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Salidas totales</p>
          <p className="text-2xl font-bold text-red-600">{fmt(totales.salidas)}</p>
        </div>
        <div className={`rounded-2xl border shadow-sm p-5 ${totales.saldoFinal >= 0 ? 'bg-brand-light/50 border-brand/20' : 'bg-red-50 border-red-100'}`}>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Saldo acumulado</p>
          <p className={`text-2xl font-bold ${totales.saldoFinal >= 0 ? 'text-brand' : 'text-red-600'}`}>{fmt(totales.saldoFinal)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Gráfica semanal */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Últimos días con movimiento</h2>
          <BarChart dias={diasGrafica} />
        </div>

        {/* Proyección */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Proyección — {MESES[proyeccion.mes - 1]} {proyeccion.ano}
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Entradas proyectadas</span>
              <span className="font-semibold text-green-700">{fmt(proyeccion.entradasProyectadas)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Salidas proyectadas</span>
              <span className="font-semibold text-red-600">{fmt(proyeccion.salidasProyectadas)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold border-t border-gray-100 pt-2">
              <span className="text-gray-700">Saldo proyectado</span>
              <span className={proyeccion.entradasProyectadas - proyeccion.salidasProyectadas >= 0 ? 'text-brand' : 'text-red-600'}>
                {fmt(proyeccion.entradasProyectadas - proyeccion.salidasProyectadas)}
              </span>
            </div>
            {(proyeccion.entradasReales > 0 || proyeccion.salidasReales > 0) && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-1">Real registrado hasta hoy</p>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Entradas: {fmt(proyeccion.entradasReales)}</span>
                  <span>Salidas: {fmt(proyeccion.salidasReales)}</span>
                </div>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-3">Basado en promedio diario del mes actual</p>
        </div>
      </div>

      {/* Tabla detalle */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Movimientos diarios — {MESES[mes - 1]} {ano}</h2>
        </div>
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-white border-b border-gray-100">
              <tr>
                <th className="text-left py-2.5 pl-4 text-xs font-semibold text-gray-500">Fecha</th>
                <th className="text-right py-2.5 pr-4 text-xs font-semibold text-green-600">Entradas</th>
                <th className="text-right py-2.5 pr-4 text-xs font-semibold text-red-500">Salidas</th>
                <th className="text-right py-2.5 pr-4 text-xs font-semibold text-gray-500">Neto día</th>
                <th className="text-right py-2.5 pr-4 text-xs font-semibold text-gray-700">Saldo acum.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {diasConMov.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-sm text-gray-400">Sin movimientos en el período</td></tr>
              ) : (
                diasConMov.map((d) => (
                  <tr key={d.fecha} className="hover:bg-gray-50">
                    <td className="py-2.5 pl-4 text-sm text-gray-600">{fmtFecha(d.fecha)}</td>
                    <td className="py-2.5 pr-4 text-sm text-right text-green-700 font-medium">{d.entradas > 0 ? fmt(d.entradas) : '—'}</td>
                    <td className="py-2.5 pr-4 text-sm text-right text-red-600">{d.salidas > 0 ? fmt(d.salidas) : '—'}</td>
                    <td className={`py-2.5 pr-4 text-sm text-right font-medium ${d.neto >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(d.neto)}</td>
                    <td className={`py-2.5 pr-4 text-sm text-right font-bold ${d.saldoAcum >= 0 ? 'text-gray-900' : 'text-red-700'}`}>{fmt(d.saldoAcum)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
