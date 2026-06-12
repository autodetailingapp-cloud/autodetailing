'use client'

import { useState, useTransition } from 'react'
import { pagarCartera } from './actions'

const fmt = (n) => `$${Number(n ?? 0).toFixed(2)}`
const fmtFecha = (s) =>
  s ? new Date(s + 'T00:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

function calcEstado(item, hoy) {
  if (Number(item.saldo_pendiente) < 0.01) return 'pagado'
  const diff = Math.floor((new Date(item.fecha_vencimiento + 'T00:00:00') - new Date(hoy + 'T00:00:00')) / 86400000)
  if (diff < 0) return 'vencido'
  if (diff <= 5) return 'por_vencer'
  return 'vigente'
}

const ESTADO_CONFIG = {
  vigente:    { label: 'Vigente',    bg: 'bg-green-50',  text: 'text-green-700',  badge: 'bg-green-100 text-green-700' },
  por_vencer: { label: 'Por vencer', bg: 'bg-yellow-50', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700' },
  vencido:    { label: 'Vencido',    bg: 'bg-red-50',    text: 'text-red-700',    badge: 'bg-red-100 text-red-700' },
  pagado:     { label: 'Pagado',     bg: 'bg-gray-50',   text: 'text-gray-500',   badge: 'bg-gray-100 text-gray-500' },
}

function ModalPago({ item, onClose, onSuccess }) {
  const [monto, setMonto] = useState(Number(item.saldo_pendiente).toFixed(2))
  const [tipoPago, setTipoPago] = useState('Efectivo')
  const [error, setError] = useState(null)
  const [isPending, startTransition] = useTransition()

  function handlePagar() {
    setError(null)
    const montoNum = parseFloat(monto)
    if (isNaN(montoNum) || montoNum <= 0) { setError('Ingresa un monto válido'); return }
    if (montoNum > Number(item.saldo_pendiente) + 0.009) { setError('El monto supera el saldo pendiente'); return }

    startTransition(async () => {
      const result = await pagarCartera(item.id, montoNum, tipoPago)
      if (result?.error) { setError(result.error); return }
      onSuccess()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
        <h3 className="text-base font-bold text-gray-900 mb-1">Registrar cobro</h3>
        <p className="text-sm text-gray-500 mb-4">
          {item.clientes?.nombre} — Saldo: <span className="font-semibold text-gray-900">{fmt(item.saldo_pendiente)}</span>
        </p>

        {error && <p className="px-3.5 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm mb-4">{error}</p>}

        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Monto a cobrar</label>
            <input
              type="number" step="0.01" min="0.01" value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Forma de pago</label>
            <select
              value={tipoPago} onChange={(e) => setTipoPago(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            >
              <option>Efectivo</option>
              <option>Transferencia</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handlePagar} disabled={isPending}
            className="flex-1 py-2.5 rounded-xl bg-brand hover:bg-brand/90 text-white text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {isPending ? 'Registrando...' : 'Confirmar cobro'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CarteraUI({ cartera, hoy }) {
  const [pagoModal, setPagoModal] = useState(null)

  const items = cartera.map((c) => ({ ...c, _estado: calcEstado(c, hoy) }))
  const pendientes = items.filter((i) => i._estado !== 'pagado')
  const pagados = items.filter((i) => i._estado === 'pagado')

  const totalPendiente = pendientes.reduce((s, i) => s + Number(i.saldo_pendiente), 0)
  const totalVencido = pendientes.filter((i) => i._estado === 'vencido').reduce((s, i) => s + Number(i.saldo_pendiente), 0)
  const totalPorVencer = pendientes.filter((i) => i._estado === 'por_vencer').reduce((s, i) => s + Number(i.saldo_pendiente), 0)

  function diasRestantes(fechaVenc) {
    const diff = Math.floor((new Date(fechaVenc + 'T00:00:00') - new Date(hoy + 'T00:00:00')) / 86400000)
    if (diff < 0) return `Vencido hace ${Math.abs(diff)} día${Math.abs(diff) !== 1 ? 's' : ''}`
    if (diff === 0) return 'Vence hoy'
    return `${diff} día${diff !== 1 ? 's' : ''} restante${diff !== 1 ? 's' : ''}`
  }

  return (
    <>
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cartera por cobrar</h1>
          <p className="text-sm text-gray-400 mt-0.5">Ventas a crédito pendientes de cobro</p>
        </div>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-400 mb-1">Total pendiente</p>
          <p className="text-2xl font-bold text-gray-900">{fmt(totalPendiente)}</p>
          <p className="text-xs text-gray-400 mt-1">{pendientes.length} cuenta{pendientes.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white rounded-2xl border border-yellow-100 shadow-sm p-5">
          <p className="text-xs text-gray-400 mb-1">Por vencer (≤5 días)</p>
          <p className="text-2xl font-bold text-yellow-600">{fmt(totalPorVencer)}</p>
          <p className="text-xs text-gray-400 mt-1">{items.filter((i) => i._estado === 'por_vencer').length} cuenta{items.filter((i) => i._estado === 'por_vencer').length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5">
          <p className="text-xs text-gray-400 mb-1">Vencido</p>
          <p className="text-2xl font-bold text-red-500">{fmt(totalVencido)}</p>
          <p className="text-xs text-gray-400 mt-1">{items.filter((i) => i._estado === 'vencido').length} cuenta{items.filter((i) => i._estado === 'vencido').length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Lista pendientes */}
      {pendientes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
          <p className="text-gray-300 text-4xl mb-3">✓</p>
          <p className="text-gray-500 font-medium">Sin cuentas pendientes</p>
          <p className="text-sm text-gray-400 mt-1">Todas las ventas a crédito están al día</p>
        </div>
      ) : (
        <div className="mb-8">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Pendientes de cobro</p>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Tabla desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Doc.</th>
                    <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Original</th>
                    <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pagado</th>
                    <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Saldo</th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Vence</th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                    <th className="px-6 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pendientes.map((item) => {
                    const cfg = ESTADO_CONFIG[item._estado]
                    return (
                      <tr key={item.id} className={`hover:bg-gray-50/40 transition-colors ${item._estado === 'vencido' ? 'bg-red-50/20' : ''}`}>
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">{item.clientes?.nombre ?? '—'}</p>
                          {item.clientes?.telefono && <p className="text-xs text-gray-400">{item.clientes.telefono}</p>}
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {item.ventas?.tipo_documento?.charAt(0)}{item.ventas?.numero_documento?.toString().padStart(6, '0') ?? '—'}
                        </td>
                        <td className="px-6 py-4 text-right text-gray-600">{fmt(item.monto_original)}</td>
                        <td className="px-6 py-4 text-right text-brand">{fmt(item.monto_pagado)}</td>
                        <td className="px-6 py-4 text-right font-bold text-gray-900">{fmt(item.saldo_pendiente)}</td>
                        <td className="px-6 py-4">
                          <p className="text-gray-700">{fmtFecha(item.fecha_vencimiento)}</p>
                          <p className={`text-xs ${item._estado === 'vencido' ? 'text-red-500' : item._estado === 'por_vencer' ? 'text-yellow-600' : 'text-gray-400'}`}>
                            {diasRestantes(item.fecha_vencimiento)}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${cfg.badge}`}>{cfg.label}</span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setPagoModal(item)}
                            className="px-3 py-1.5 rounded-lg bg-brand/10 hover:bg-brand/20 text-brand text-xs font-semibold transition-colors"
                          >
                            Cobrar
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Tarjetas móvil */}
            <div className="md:hidden divide-y divide-gray-100">
              {pendientes.map((item) => {
                const cfg = ESTADO_CONFIG[item._estado]
                return (
                  <div key={item.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">{item.clientes?.nombre ?? '—'}</p>
                        <p className="text-xs text-gray-400">
                          Doc. {item.ventas?.tipo_documento?.charAt(0)}{item.ventas?.numero_documento?.toString().padStart(6, '0') ?? '—'}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${cfg.badge}`}>{cfg.label}</span>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm text-gray-500">Saldo: <span className="font-bold text-gray-900">{fmt(item.saldo_pendiente)}</span></p>
                        <p className={`text-xs mt-0.5 ${item._estado === 'vencido' ? 'text-red-500' : item._estado === 'por_vencer' ? 'text-yellow-600' : 'text-gray-400'}`}>
                          Vence {fmtFecha(item.fecha_vencimiento)} · {diasRestantes(item.fecha_vencimiento)}
                        </p>
                      </div>
                      <button
                        onClick={() => setPagoModal(item)}
                        className="px-4 py-2 rounded-xl bg-brand/10 hover:bg-brand/20 text-brand text-sm font-semibold transition-colors"
                      >
                        Cobrar
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Historial pagados */}
      {pagados.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Historial cobrado</p>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {pagados.map((item) => (
                <div key={item.id} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{item.clientes?.nombre ?? '—'}</p>
                    <p className="text-xs text-gray-400">{fmtFecha(item.fecha_venta)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-500">{fmt(item.monto_original)}</p>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Pagado</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {pagoModal && (
        <ModalPago
          item={pagoModal}
          onClose={() => setPagoModal(null)}
          onSuccess={() => { setPagoModal(null); window.location.reload() }}
        />
      )}
    </>
  )
}
