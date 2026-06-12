'use client'

import { useState, useTransition } from 'react'
import { cerrarCaja } from './actions'

const fmt = (n) => `$${Number(n ?? 0).toFixed(2)}`
const fmtFecha = (s) =>
  s ? new Date(s + 'T00:00:00').toLocaleDateString('es-EC', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : '—'

function TarjetaResumen({ label, valor, sub, color }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color ?? 'text-gray-900'}`}>{fmt(valor)}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function CajaUI({ datos, historial }) {
  const [observaciones, setObservaciones] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState(null)
  const [isPending, startTransition] = useTransition()

  if (!datos) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-400 text-sm">Error al cargar datos de caja.</p>
      </div>
    )
  }

  const {
    hoy, cajaHoy,
    total_efectivo, total_transferencia, total_credito,
    total_ventas, total_gastos, saldo_final,
  } = datos

  const cajaCerrada = cajaHoy?.cerrado === true

  const fechaHoy = new Date().toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  function handleCerrar() {
    setError(null)
    startTransition(async () => {
      const result = await cerrarCaja(observaciones)
      if (result?.error) { setError(result.error); return }
      setConfirmOpen(false)
    })
  }

  return (
    <>
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Caja diaria</h1>
          <p className="text-sm text-gray-400 mt-0.5 capitalize">{fechaHoy}</p>
        </div>
        {!cajaCerrada && (
          <button
            onClick={() => setConfirmOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent/90 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Cerrar caja
          </button>
        )}
      </div>

      {cajaCerrada && (
        <div className="flex items-center gap-3 px-5 py-4 bg-green-50 border border-green-100 rounded-2xl mb-6">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-green-800">Caja cerrada</p>
            <p className="text-xs text-green-600">Esta caja ya fue cerrada y no puede modificarse.</p>
          </div>
        </div>
      )}

      {/* Resumen del día */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Ventas del día</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <TarjetaResumen label="Efectivo" valor={total_efectivo} color="text-brand" />
          <TarjetaResumen label="Transferencia" valor={total_transferencia} color="text-blue-600" />
          <TarjetaResumen label="Crédito" valor={total_credito} color="text-accent" />
          <TarjetaResumen label="Total ventas" valor={total_ventas} color="text-gray-900" sub="Suma de todos los cobros" />
        </div>
      </div>

      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Egresos del día</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <TarjetaResumen label="Compras y gastos" valor={total_gastos} color="text-red-500" />
          <div className="bg-gray-900 rounded-2xl p-5 col-span-1 lg:col-span-2">
            <p className="text-xs text-gray-400 mb-1">Saldo en caja (disponible)</p>
            <p className={`text-3xl font-bold ${saldo_final >= 0 ? 'text-white' : 'text-red-400'}`}>{fmt(saldo_final)}</p>
            <p className="text-xs text-gray-400 mt-2">Efectivo + Transferencias − Egresos</p>
          </div>
        </div>
      </div>

      {/* Historial de cierres */}
      {historial.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Historial de cierres</p>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
                    <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ventas</th>
                    <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Efectivo</th>
                    <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Transfer.</th>
                    <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Egresos</th>
                    <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {historial.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/40 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-800">{fmtFecha(c.fecha)}</td>
                      <td className="px-6 py-4 text-right text-gray-700">{fmt(c.total_ventas)}</td>
                      <td className="px-6 py-4 text-right text-brand font-medium">{fmt(c.total_efectivo)}</td>
                      <td className="px-6 py-4 text-right text-blue-600 font-medium">{fmt(c.total_transferencia)}</td>
                      <td className="px-6 py-4 text-right text-red-500">{fmt(c.total_gastos)}</td>
                      <td className={`px-6 py-4 text-right font-bold ${Number(c.saldo_final) >= 0 ? 'text-gray-900' : 'text-red-500'}`}>
                        {fmt(c.saldo_final)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tarjetas móvil historial */}
            <div className="md:hidden divide-y divide-gray-100">
              {historial.map((c) => (
                <div key={c.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium text-gray-900">{fmtFecha(c.fecha)}</p>
                    <p className={`font-bold text-lg ${Number(c.saldo_final) >= 0 ? 'text-gray-900' : 'text-red-500'}`}>{fmt(c.saldo_final)}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                    <div><span className="text-gray-400">Ventas</span><br /><span className="font-medium text-gray-700">{fmt(c.total_ventas)}</span></div>
                    <div><span className="text-gray-400">Efectivo</span><br /><span className="font-medium text-brand">{fmt(c.total_efectivo)}</span></div>
                    <div><span className="text-gray-400">Egresos</span><br /><span className="font-medium text-red-500">{fmt(c.total_gastos)}</span></div>
                  </div>
                  {c.observaciones && <p className="text-xs text-gray-400 mt-1.5 italic">{c.observaciones}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal cerrar caja */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmOpen(false)} />
          <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-accent/10 mb-4 mx-auto">
              <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-gray-900 text-center mb-1">Cerrar caja del día</h3>
            <p className="text-sm text-gray-500 text-center mb-4">
              Saldo final: <span className="font-bold text-gray-900">{fmt(saldo_final)}</span>
            </p>

            {error && <p className="px-3.5 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm mb-4">{error}</p>}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Observaciones (opcional)</label>
              <textarea
                rows={2} value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Notas del cierre..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCerrar}
                disabled={isPending}
                className="flex-1 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {isPending ? 'Cerrando...' : 'Confirmar cierre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
