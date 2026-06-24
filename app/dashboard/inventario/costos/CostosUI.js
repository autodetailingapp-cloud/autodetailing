'use client'

import { useState, useEffect, useMemo, useActionState } from 'react'
import Link from 'next/link'
import { agregarInsumoServicio, eliminarInsumoServicio } from './actions'

const INPUT = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent'
const SELECT = INPUT + ' bg-white'

const fmtMoney = (n) => `$${Number(n ?? 0).toFixed(2)}`
const fmtCant = (n) => Number(n ?? 0).toFixed(3).replace(/\.?0+$/, '') || '0'

function FormAgregarInsumo({ servicioId, insumos, onDone }) {
  const [state, formAction, pending] = useActionState(agregarInsumoServicio, null)

  useEffect(() => {
    if (state?.success) onDone()
  }, [state?.success]) // eslint-disable-line

  return (
    <form action={formAction} className="space-y-3 p-4 bg-gray-50/60 rounded-xl border border-gray-100">
      <input type="hidden" name="servicio_id" value={servicioId} />
      {state?.error && (
        <p className="px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs">{state.error}</p>
      )}
      <div className="grid grid-cols-3 gap-2">
        <select name="insumo_id" required defaultValue="" className={SELECT + ' col-span-2'}>
          <option value="" disabled>Selecciona insumo...</option>
          {insumos.map((i) => (
            <option key={i.id} value={i.id}>{i.nombre} ({fmtMoney(i.costo_unitario)}/{i.unidad_medida})</option>
          ))}
        </select>
        <input name="cantidad" type="number" required min="0.001" step="0.001" placeholder="Cantidad" className={INPUT} />
      </div>
      <button
        type="submit" disabled={pending}
        className="w-full py-2 rounded-xl bg-brand hover:bg-brand-dark text-white text-sm font-semibold transition-colors disabled:opacity-60"
      >
        {pending ? 'Agregando...' : 'Agregar insumo a la receta'}
      </button>
    </form>
  )
}

export default function CostosUI({ servicios, insumos, servicioInsumos, readOnly }) {
  const [selectedId, setSelectedId] = useState(servicios[0]?.id ?? null)
  const [showAddForm, setShowAddForm] = useState(false)

  const costoPorServicio = useMemo(() => {
    const map = {}
    for (const si of servicioInsumos) {
      const costo = Number(si.cantidad) * Number(si.insumos?.costo_unitario ?? 0)
      map[si.servicio_id] = (map[si.servicio_id] ?? 0) + costo
    }
    return map
  }, [servicioInsumos])

  const selectedServicio = servicios.find((s) => s.id === selectedId)
  const recetaSeleccionada = servicioInsumos.filter((si) => si.servicio_id === selectedId)

  const costoTotal = costoPorServicio[selectedId] ?? 0
  const precio = Number(selectedServicio?.precio ?? 0)
  const margen = precio - costoTotal
  const margenPorc = precio > 0 ? (margen / precio) * 100 : 0

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Costos por servicio</h1>
          <p className="text-sm text-gray-400 mt-0.5">Receta de insumos y margen real de cada servicio</p>
        </div>
        <Link
          href="/dashboard/inventario"
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
        >
          Volver a inventario
        </Link>
      </div>

      {servicios.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-sm text-gray-400">No hay servicios activos. Crea servicios primero.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[260px_1fr] gap-5">
          {/* Lista de servicios */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50 max-h-[70vh] overflow-y-auto">
              {servicios.map((s) => {
                const costo = costoPorServicio[s.id] ?? 0
                return (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedId(s.id); setShowAddForm(false) }}
                    className={`w-full text-left px-4 py-3.5 transition-colors ${
                      selectedId === s.id ? 'bg-brand-light' : 'hover:bg-gray-50'
                    }`}
                  >
                    <p className={`text-sm font-medium truncate ${selectedId === s.id ? 'text-brand' : 'text-gray-900'}`}>{s.nombre}</p>
                    <div className="flex items-center justify-between text-xs text-gray-400 mt-0.5">
                      <span>{fmtMoney(s.precio)}</span>
                      {costo > 0 && <span>costo: {fmtMoney(costo)}</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Detalle del servicio seleccionado */}
          {selectedServicio && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="text-lg font-bold text-gray-900 mb-4">{selectedServicio.nombre}</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Precio de venta</p>
                    <p className="text-xl font-bold text-gray-900">{fmtMoney(precio)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Costo insumos</p>
                    <p className="text-xl font-bold text-red-500">{fmtMoney(costoTotal)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Margen real</p>
                    <p className={`text-xl font-bold ${margen >= 0 ? 'text-brand' : 'text-red-500'}`}>
                      {fmtMoney(margen)} <span className="text-sm font-medium">({margenPorc.toFixed(1)}%)</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-gray-800">Receta de insumos</p>
                  {!readOnly && !showAddForm && (
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="text-xs font-semibold text-brand hover:text-brand-dark transition-colors"
                    >
                      + Agregar insumo
                    </button>
                  )}
                </div>

                {!readOnly && showAddForm && (
                  <div className="mb-4">
                    <FormAgregarInsumo
                      servicioId={selectedId}
                      insumos={insumos}
                      onDone={() => setShowAddForm(false)}
                    />
                  </div>
                )}

                {recetaSeleccionada.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">Este servicio no tiene insumos configurados aún.</p>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {recetaSeleccionada.map((si) => (
                      <div key={si.id} className="py-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{si.insumos?.nombre}</p>
                          <p className="text-xs text-gray-400">
                            {fmtCant(si.cantidad)} {si.insumos?.unidad_medida} × {fmtMoney(si.insumos?.costo_unitario)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-gray-900">
                            {fmtMoney(Number(si.cantidad) * Number(si.insumos?.costo_unitario ?? 0))}
                          </span>
                          {!readOnly && (
                            <button
                              onClick={() => eliminarInsumoServicio(si.id)}
                              title="Quitar"
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
