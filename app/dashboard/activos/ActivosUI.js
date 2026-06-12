'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import { crearActivo, actualizarActivo, eliminarActivo } from './actions'

const fmt = (n) => `$${Number(n ?? 0).toFixed(2)}`
const fmtFecha = (s) =>
  s ? new Date(s + 'T00:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const CATEGORIAS_SRI = [
  { value: 'Inmuebles',           anos: 20 },
  { value: 'Maquinaria y equipo', anos: 10 },
  { value: 'Vehículos',           anos: 5 },
  { value: 'Muebles y enseres',   anos: 10 },
  { value: 'Equipo de cómputo',   anos: 3 },
  { value: 'Adecuaciones',        anos: 20 },
]

function calcDepreciacion(activo) {
  const hoy = new Date()
  const compra = new Date(activo.fecha_compra + 'T00:00:00')
  const mesesTranscurridos = (hoy.getFullYear() - compra.getFullYear()) * 12 + (hoy.getMonth() - compra.getMonth())
  const vidaUtilMeses = activo.vida_util_anos * 12
  const deprecMensual = Number(activo.valor_adquisicion) / vidaUtilMeses
  const deprecAcumulada = Math.min(deprecMensual * Math.max(mesesTranscurridos, 0), Number(activo.valor_adquisicion))
  const valorActual = Math.max(Number(activo.valor_adquisicion) - deprecAcumulada, 0)
  return { deprecMensual, deprecAcumulada, valorActual, mesesTranscurridos }
}

function ModalActivo({ activo, onClose }) {
  const isEdit = !!activo?.id
  const action = isEdit ? actualizarActivo : crearActivo
  const [state, formAction, isPending] = useActionState(action, null)
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(activo?.categoria ?? '')
  const [vidaUtil, setVidaUtil] = useState(activo?.vida_util_anos?.toString() ?? '')

  function handleCategoria(e) {
    const cat = CATEGORIAS_SRI.find((c) => c.value === e.target.value)
    setCategoriaSeleccionada(e.target.value)
    if (cat) setVidaUtil(cat.anos.toString())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-base font-bold text-gray-900 mb-4">
          {isEdit ? 'Editar activo' : 'Nuevo activo fijo'}
        </h3>

        {state?.error && (
          <p className="px-3.5 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm mb-4">{state.error}</p>
        )}

        <form action={formAction} className="space-y-3">
          {isEdit && <input type="hidden" name="id" value={activo.id} />}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre / descripción *</label>
            <input
              name="nombre" required defaultValue={activo?.nombre ?? ''}
              placeholder="Ej: Pulidora orbital DeWalt"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoría SRI *</label>
            <select
              name="categoria" required value={categoriaSeleccionada}
              onChange={handleCategoria}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            >
              <option value="">Seleccionar categoría...</option>
              {CATEGORIAS_SRI.map((c) => (
                <option key={c.value} value={c.value}>{c.value} ({c.anos} años)</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Valor adquisición *</label>
              <input
                name="valor_adquisicion" type="number" step="0.01" min="0.01" required
                defaultValue={activo?.valor_adquisicion ?? ''}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Vida útil (años) *</label>
              <input
                name="vida_util_anos" type="number" min="1" required
                value={vidaUtil}
                onChange={(e) => setVidaUtil(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha de compra *</label>
            <input
              name="fecha_compra" type="date" required
              defaultValue={activo?.fecha_compra ?? new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button
              type="submit" disabled={isPending}
              className="flex-1 py-2.5 rounded-xl bg-brand hover:bg-brand/90 text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {isPending ? 'Guardando...' : isEdit ? 'Actualizar' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ActivosUI({ activos }) {
  const [modal, setModal] = useState(null)

  const activosConCalculo = activos.map((a) => ({ ...a, ...calcDepreciacion(a) }))

  const totalAdquisicion = activosConCalculo.reduce((s, a) => s + Number(a.valor_adquisicion), 0)
  const totalDeprecMensual = activosConCalculo.reduce((s, a) => s + a.deprecMensual, 0)
  const totalValorActual = activosConCalculo.reduce((s, a) => s + a.valorActual, 0)

  async function handleEliminar(id) {
    if (!confirm('¿Dar de baja este activo?')) return
    await eliminarActivo(id)
  }

  return (
    <>
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activos fijos</h1>
          <p className="text-sm text-gray-400 mt-0.5">Depreciación según tabla SRI Ecuador</p>
        </div>
        <button
          onClick={() => setModal({})}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand hover:bg-brand/90 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo activo
        </button>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-400 mb-1">Valor total adquisición</p>
          <p className="text-2xl font-bold text-gray-900">{fmt(totalAdquisicion)}</p>
          <p className="text-xs text-gray-400 mt-1">{activos.length} activo{activos.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-400 mb-1">Depreciación mensual</p>
          <p className="text-2xl font-bold text-red-500">{fmt(totalDeprecMensual)}</p>
          <p className="text-xs text-gray-400 mt-1">Gasto mensual total</p>
        </div>
        <div className="bg-gray-900 rounded-2xl p-5">
          <p className="text-xs text-gray-400 mb-1">Valor neto contable</p>
          <p className="text-2xl font-bold text-white">{fmt(totalValorActual)}</p>
          <p className="text-xs text-gray-400 mt-1">Valor actual en libros</p>
        </div>
      </div>

      {activos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
          <p className="text-gray-400 text-sm">No hay activos fijos registrados.</p>
          <button onClick={() => setModal({})} className="mt-3 text-brand text-sm font-semibold hover:underline">
            + Registrar el primero
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Desktop */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Activo</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Categoría</th>
                  <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Adquisición</th>
                  <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Depr. mensual</th>
                  <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acumulada</th>
                  <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Valor actual</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Compra</th>
                  <th className="px-6 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {activosConCalculo.map((a) => {
                  const pctDepreciado = ((a.deprecAcumulada / Number(a.valor_adquisicion)) * 100).toFixed(0)
                  const totalmenteDepreciado = a.valorActual < 1
                  return (
                    <tr key={a.id} className={`hover:bg-gray-50/40 transition-colors ${totalmenteDepreciado ? 'opacity-60' : ''}`}>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{a.nombre}</p>
                        <p className="text-xs text-gray-400">{a.vida_util_anos} años vida útil</p>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{a.categoria}</td>
                      <td className="px-6 py-4 text-right text-gray-700">{fmt(a.valor_adquisicion)}</td>
                      <td className="px-6 py-4 text-right text-red-500">{fmt(a.deprecMensual)}</td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-gray-700">{fmt(a.deprecAcumulada)}</p>
                        <p className="text-xs text-gray-400">{pctDepreciado}% depreciado</p>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900">{fmt(a.valorActual)}</td>
                      <td className="px-6 py-4 text-gray-500">{fmtFecha(a.fecha_compra)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setModal(a)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleEliminar(a.id)}
                            className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile / Tablet */}
          <div className="lg:hidden divide-y divide-gray-100">
            {activosConCalculo.map((a) => (
              <div key={a.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">{a.nombre}</p>
                    <p className="text-xs text-gray-400">{a.categoria} · {a.vida_util_anos} años · desde {fmtFecha(a.fecha_compra)}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => setModal(a)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button onClick={() => handleEliminar(a.id)} className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-gray-400">Adquisición</p>
                    <p className="font-medium text-gray-700">{fmt(a.valor_adquisicion)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Depr./mes</p>
                    <p className="font-medium text-red-500">{fmt(a.deprecMensual)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Valor actual</p>
                    <p className="font-bold text-gray-900">{fmt(a.valorActual)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {modal !== null && (
        <ModalActivo activo={modal?.id ? modal : null} onClose={() => setModal(null)} />
      )}
    </>
  )
}
