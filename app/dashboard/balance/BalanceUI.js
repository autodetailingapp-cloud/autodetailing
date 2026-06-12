'use client'

import { useState, useTransition } from 'react'
import { getDatosBalance } from './actions'

const fmt = (n) => `$${Number(n ?? 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function Fila({ label, valor, indent = false, bold = false, color = '' }) {
  return (
    <tr>
      <td className={`py-2.5 text-sm ${indent ? 'pl-8' : 'pl-4'} ${bold ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
        {label}
      </td>
      <td className={`py-2.5 text-sm text-right pr-4 font-medium ${color || (bold ? 'text-gray-900' : 'text-gray-600')}`}>
        {fmt(valor)}
      </td>
    </tr>
  )
}

function Subtotal({ label, valor, color = 'text-brand' }) {
  return (
    <tr className="border-t border-gray-200 bg-gray-50">
      <td className="py-3 pl-4 text-sm font-bold text-gray-900">{label}</td>
      <td className={`py-3 pr-4 text-sm font-bold text-right ${color}`}>{fmt(valor)}</td>
    </tr>
  )
}

function SeccionHeader({ label }) {
  return (
    <tr>
      <td colSpan={2} className="pt-5 pb-1 px-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
      </td>
    </tr>
  )
}

export default function BalanceUI({ datos: datosInit, fechaInicial }) {
  const [fecha, setFecha] = useState(fechaInicial)
  const [datos, setDatos] = useState(datosInit)
  const [pending, startTransition] = useTransition()

  const cambiarFecha = (f) => {
    setFecha(f)
    startTransition(async () => {
      const res = await getDatosBalance(f)
      if (!res.error) setDatos(res)
    })
  }

  if (datos?.error) return <p className="text-red-500">{datos.error}</p>
  if (!datos) return null

  const { activosCorrientes: ac, activosNoCorrientes: anc, totalActivos, pasivos, patrimonio } = datos

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Balance General</h1>
          <p className="text-sm text-gray-400 mt-0.5">Estado de situación financiera al corte</p>
        </div>
        <div className="flex items-center gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Fecha de corte</label>
            <input
              type="date" value={fecha} max={new Date().toISOString().split('T')[0]}
              onChange={(e) => cambiarFecha(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-700 bg-white"
            />
          </div>
          <div className="mt-5">
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
      </div>

      <div className="hidden print:block mb-6 text-center">
        <h1 className="text-xl font-bold">Balance General</h1>
        <p className="text-sm text-gray-500">Al {fecha}</p>
      </div>

      {pending && <div className="text-center py-4 text-sm text-gray-400">Recalculando...</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ACTIVOS */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-blue-50 px-4 py-3 border-b border-blue-100">
            <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wider">Activos</h2>
          </div>
          <table className="w-full">
            <tbody className="divide-y divide-gray-50">
              <SeccionHeader label="Activos corrientes" />
              <Fila label="Caja y bancos" valor={ac.cajaYBancos} indent />
              <Fila label="Cartera por cobrar" valor={ac.carteraCobrar} indent />
              <Subtotal label="Total activos corrientes" valor={ac.total} />

              <SeccionHeader label="Activos no corrientes" />
              <Fila label="Activos fijos (neto)" valor={anc.activosFijosNeto} indent />
              <Subtotal label="Total activos no corrientes" valor={anc.total} />

              <tr className="bg-blue-50 border-t-2 border-blue-200">
                <td className="py-4 pl-4 text-sm font-bold text-blue-900">TOTAL ACTIVOS</td>
                <td className="py-4 pr-4 text-sm font-bold text-right text-blue-900">{fmt(totalActivos)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* PASIVOS + PATRIMONIO */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-red-50 px-4 py-3 border-b border-red-100">
            <h2 className="text-sm font-bold text-red-800 uppercase tracking-wider">Pasivos y Patrimonio</h2>
          </div>
          <table className="w-full">
            <tbody className="divide-y divide-gray-50">
              <SeccionHeader label="Pasivos corrientes" />
              <Fila label="Cartera proveedores" valor={pasivos.carteraProveedores} indent />
              <Subtotal label="Total pasivos" valor={pasivos.total} color="text-red-600" />

              <SeccionHeader label="Patrimonio" />
              <Fila label="Capital y resultados acumulados" valor={patrimonio} indent />
              <Subtotal label="Total patrimonio" valor={patrimonio} color="text-green-700" />

              <tr className="bg-gray-50 border-t-2 border-gray-300">
                <td className="py-4 pl-4 text-sm font-bold text-gray-900">TOTAL PASIVO + PATRIMONIO</td>
                <td className="py-4 pr-4 text-sm font-bold text-right text-gray-900">{fmt(pasivos.total + patrimonio)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Nota */}
      <p className="mt-4 text-xs text-gray-400 text-center">
        Los valores se calculan automáticamente desde ventas, compras, cartera y activos fijos registrados en el sistema.
      </p>

      <style jsx global>{`@media print { .print\\:hidden { display: none !important; } .print\\:block { display: block !important; } }`}</style>
    </div>
  )
}
