'use client'

import { useState, useEffect, useOptimistic, useTransition, useActionState } from 'react'
import Link from 'next/link'
import {
  crearInsumo, actualizarInsumo, toggleInsumo, eliminarInsumo,
  registrarEntrada, getHistorialInsumo,
} from './actions'

const UNIDADES = ['litros', 'kg', 'ml', 'gramos', 'unidades']

const INPUT = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent'
const SELECT = INPUT + ' bg-white'

const fmtMoney = (n) => `$${Number(n ?? 0).toFixed(2)}`
const fmtCant = (n) => Number(n ?? 0).toFixed(3).replace(/\.?0+$/, '') || '0'
const fmtFechaHora = (s) =>
  s ? new Date(s).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

const TIPO_LABELS = {
  entrada: { label: 'Entrada', color: 'text-green-600 bg-green-50' },
  consumo: { label: 'Consumo', color: 'text-red-500 bg-red-50' },
  reversion: { label: 'Reversión', color: 'text-blue-600 bg-blue-50' },
}

function TarjetaResumen({ label, valor, color, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color ?? 'text-gray-900'}`}>{valor}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function ToggleActivo({ id, activo }) {
  const [optimistic, setOptimistic] = useOptimistic(activo)
  const [, startTransition] = useTransition()

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          setOptimistic(!optimistic)
          await toggleInsumo(id, !optimistic)
        })
      }
      title={optimistic ? 'Desactivar' : 'Activar'}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none ${
        optimistic ? 'bg-brand' : 'bg-gray-200'
      }`}
    >
      <span
        className={`m-0.5 inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          optimistic ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

function CamposInsumo({ state, formAction, pending, insumo, isEdit, onClose }) {
  return (
    <form action={formAction} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={insumo.id} />}

      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'Editar insumo' : 'Nuevo insumo'}</h2>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {state?.error && (
        <p className="px-3.5 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{state.error}</p>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Nombre <span className="text-red-500">*</span>
        </label>
        <input
          name="nombre" type="text" required
          defaultValue={insumo?.nombre ?? ''}
          placeholder="Ej: Shampoo para autos"
          className={INPUT}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripción</label>
        <textarea
          name="descripcion" rows={2}
          defaultValue={insumo?.descripcion ?? ''}
          placeholder="Detalle del insumo..."
          className={INPUT + ' resize-none'}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Unidad de medida <span className="text-red-500">*</span>
          </label>
          <select name="unidad_medida" required defaultValue={insumo?.unidad_medida ?? ''} className={SELECT}>
            <option value="" disabled>Selecciona...</option>
            {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Proveedor</label>
          <input
            name="proveedor" type="text"
            defaultValue={insumo?.proveedor ?? ''}
            placeholder="Ej: Distribuidora ABC"
            className={INPUT}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {!isEdit && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Stock inicial</label>
            <input
              name="stock_actual" type="number" min="0" step="0.001"
              defaultValue="0"
              className={INPUT}
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Stock mínimo <span className="text-red-500">*</span>
          </label>
          <input
            name="stock_minimo" type="number" required min="0" step="0.001"
            defaultValue={insumo?.stock_minimo ?? '0'}
            className={INPUT}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Costo unitario <span className="text-red-500">*</span>
          </label>
          <input
            name="costo_unitario" type="number" required min="0" step="0.01"
            defaultValue={insumo?.costo_unitario ?? '0'}
            className={INPUT}
          />
        </div>
      </div>

      {isEdit && (
        <p className="text-xs text-gray-400">
          El stock actual se ajusta registrando entradas o por consumo automático en ventas.
        </p>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="button" onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit" disabled={pending}
          className="flex-1 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear insumo'}
        </button>
      </div>
    </form>
  )
}

function FormCrear({ onClose }) {
  const [state, formAction, pending] = useActionState(crearInsumo, null)
  useEffect(() => { if (state?.success) onClose() }, [state?.success]) // eslint-disable-line
  return <CamposInsumo state={state} formAction={formAction} pending={pending} onClose={onClose} />
}

function FormEditar({ insumo, onClose }) {
  const [state, formAction, pending] = useActionState(actualizarInsumo, null)
  useEffect(() => { if (state?.success) onClose() }, [state?.success]) // eslint-disable-line
  return <CamposInsumo state={state} formAction={formAction} pending={pending} insumo={insumo} isEdit onClose={onClose} />
}

function FormEntrada({ insumos, insumoPreseleccionado, onClose }) {
  const [state, formAction, pending] = useActionState(registrarEntrada, null)
  const [insumoId, setInsumoId] = useState(insumoPreseleccionado?.id ?? '')
  useEffect(() => { if (state?.success) onClose() }, [state?.success]) // eslint-disable-line

  const insumoSel = insumos.find((i) => i.id === insumoId)
  const hoy = new Date().toISOString().split('T')[0]

  return (
    <form action={formAction} className="space-y-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-bold text-gray-900">Registrar entrada de stock</h2>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {state?.error && (
        <p className="px-3.5 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{state.error}</p>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Insumo <span className="text-red-500">*</span>
        </label>
        <select
          name="insumo_id" required value={insumoId}
          onChange={(e) => setInsumoId(e.target.value)}
          className={SELECT}
        >
          <option value="" disabled>Selecciona...</option>
          {insumos.map((i) => (
            <option key={i.id} value={i.id}>{i.nombre} ({i.unidad_medida})</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Cantidad {insumoSel ? `(${insumoSel.unidad_medida})` : ''} <span className="text-red-500">*</span>
          </label>
          <input name="cantidad" type="number" required min="0.001" step="0.001" placeholder="0" className={INPUT} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Costo unitario <span className="text-red-500">*</span>
          </label>
          <input
            name="costo_unitario" type="number" required min="0" step="0.01"
            defaultValue={insumoSel?.costo_unitario ?? ''}
            placeholder="0.00"
            className={INPUT}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Proveedor</label>
          <input
            name="proveedor" type="text"
            defaultValue={insumoSel?.proveedor ?? ''}
            placeholder="Ej: Distribuidora ABC"
            className={INPUT}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha</label>
          <input name="fecha" type="date" defaultValue={hoy} className={INPUT} />
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Se creará automáticamente un registro en Compras (tipo Costo) por el monto total.
      </p>

      <div className="flex gap-3 pt-1">
        <button
          type="button" onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit" disabled={pending}
          className="flex-1 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? 'Registrando...' : 'Registrar entrada'}
        </button>
      </div>
    </form>
  )
}

function ModalHistorial({ insumo, onClose }) {
  const [movimientos, setMovimientos] = useState(null)

  useEffect(() => {
    getHistorialInsumo(insumo.id).then(setMovimientos)
  }, [insumo.id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Historial — {insumo.nombre}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {movimientos === null && <p className="text-sm text-gray-400 text-center py-8">Cargando...</p>}
        {movimientos?.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Sin movimientos registrados.</p>}

        {movimientos && movimientos.length > 0 && (
          <div className="divide-y divide-gray-100">
            {movimientos.map((m) => {
              const tipo = TIPO_LABELS[m.tipo] ?? { label: m.tipo, color: 'text-gray-600 bg-gray-50' }
              return (
                <div key={m.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold ${tipo.color}`}>
                      {tipo.label}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">{fmtFechaHora(m.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${m.tipo === 'consumo' ? 'text-red-500' : 'text-green-600'}`}>
                      {m.tipo === 'consumo' ? '-' : '+'}{fmtCant(m.cantidad)} {insumo.unidad_medida}
                    </p>
                    <p className="text-xs text-gray-400">{fmtCant(m.stock_anterior)} → {fmtCant(m.stock_nuevo)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function ModalConfirmar({ nombre, onConfirm, onCancel, pending }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-red-50 mb-4 mx-auto">
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-gray-900 text-center mb-1">Eliminar insumo</h3>
        <p className="text-sm text-gray-500 text-center mb-6">
          ¿Seguro que deseas eliminar <span className="font-semibold text-gray-800">"{nombre}"</span>? Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button
            onClick={onConfirm} disabled={pending}
            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {pending ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function InventarioUI({ insumos, alertas, valorInventario, rankingCosto, rankingMargen, readOnly, entradaInicialId }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [entradaOpen, setEntradaOpen] = useState(false)
  const [entradaPre, setEntradaPre] = useState(null)
  const [historialInsumo, setHistorialInsumo] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deletePending, setDeletePending] = useState(false)

  useEffect(() => {
    if (!entradaInicialId || readOnly) return
    const insumo = insumos.find((i) => i.id === entradaInicialId)
    if (insumo) {
      setEntradaPre(insumo)
      setEntradaOpen(true)
    }
  }, [entradaInicialId]) // eslint-disable-line

  const closeModal = () => { setModalOpen(false); setEditing(null) }
  const openCreate = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (i) => { setEditing(i); setModalOpen(true) }
  const openEntrada = (i) => { setEntradaPre(i ?? null); setEntradaOpen(true) }

  async function handleDelete() {
    if (!confirmDelete) return
    setDeletePending(true)
    await eliminarInsumo(confirmDelete.id)
    setDeletePending(false)
    setConfirmDelete(null)
  }

  const totalInsumos = insumos.length
  const totalAlertas = alertas.length

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
          <p className="text-sm text-gray-400 mt-0.5">Insumos, stock y costos por servicio</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/inventario/costos"
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
          >
            Costos por servicio
          </Link>
          {!readOnly && (
            <>
              <button
                onClick={() => openEntrada(null)}
                className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent/90 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
              >
                Registrar entrada
              </button>
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2.5 bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nuevo insumo
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <TarjetaResumen label="Total insumos" valor={totalInsumos} />
        <TarjetaResumen label="En alerta de reabastecimiento" valor={totalAlertas} color={totalAlertas > 0 ? 'text-red-500' : 'text-gray-900'} />
        <TarjetaResumen label="Valor total del inventario" valor={fmtMoney(valorInventario)} color="text-brand" />
      </div>

      {/* Alertas de reabastecimiento */}
      {alertas.length > 0 && (
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm mb-6 overflow-hidden">
          <div className="px-5 py-3.5 bg-red-50 border-b border-red-100">
            <p className="text-sm font-semibold text-red-700">Alertas de reabastecimiento</p>
          </div>
          <div className="divide-y divide-gray-100">
            {alertas.map((i) => (
              <div key={i.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{i.nombre}</p>
                  <p className="text-xs text-red-500 mt-0.5">
                    Stock: {fmtCant(i.stock_actual)} {i.unidad_medida} (mínimo: {fmtCant(i.stock_minimo)})
                  </p>
                </div>
                {!readOnly && (
                  <button
                    onClick={() => openEntrada(i)}
                    className="px-3 py-1.5 bg-brand hover:bg-brand-dark text-white text-xs font-semibold rounded-lg transition-colors flex-shrink-0"
                  >
                    Registrar compra
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ranking costo y margen */}
      {rankingCosto.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Servicios más costosos</p>
            <div className="space-y-2.5">
              {rankingCosto.slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 truncate pr-2">{s.nombre}</span>
                  <span className="font-bold text-gray-900 flex-shrink-0">{fmtMoney(s.costoInsumos)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Margen real por servicio</p>
            <div className="space-y-2.5">
              {rankingMargen.slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 truncate pr-2">{s.nombre}</span>
                  <span className={`font-bold flex-shrink-0 ${s.margen >= 0 ? 'text-brand' : 'text-red-500'}`}>
                    {fmtMoney(s.margen)} ({s.margenPorc.toFixed(0)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Estado vacío */}
      {insumos.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <h3 className="text-base font-semibold text-gray-800 mb-1">Sin insumos aún</h3>
          <p className="text-sm text-gray-400 mb-6">Registra los insumos que usas en tus servicios</p>
          {!readOnly && (
            <button onClick={openCreate} className="px-5 py-2.5 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark transition-colors">
              Agregar insumo
            </button>
          )}
        </div>
      )}

      {/* Tabla insumos */}
      {insumos.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Insumo</th>
                  <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock</th>
                  <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Costo unit.</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Proveedor</th>
                  <th className="text-center px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Activo</th>
                  <th className="px-6 py-3.5 w-32" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {insumos.map((i) => {
                  const enAlerta = Number(i.stock_actual) <= Number(i.stock_minimo)
                  return (
                    <tr key={i.id} className={`hover:bg-gray-50/40 transition-colors ${!i.activo ? 'opacity-50' : ''}`}>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{i.nombre}</p>
                        {i.descripcion && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1 max-w-xs">{i.descripcion}</p>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-bold ${enAlerta ? 'text-red-500' : 'text-gray-900'}`}>
                          {fmtCant(i.stock_actual)} {i.unidad_medida}
                        </span>
                        <p className="text-xs text-gray-400">mín: {fmtCant(i.stock_minimo)}</p>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-700">{fmtMoney(i.costo_unitario)}</td>
                      <td className="px-6 py-4 text-gray-500">{i.proveedor ?? '—'}</td>
                      <td className="px-6 py-4 text-center">
                        {readOnly ? (
                          <span className={i.activo ? 'text-brand' : 'text-gray-400'}>{i.activo ? 'Sí' : 'No'}</span>
                        ) : (
                          <ToggleActivo id={i.id} activo={i.activo} />
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setHistorialInsumo(i)} title="Historial" className="p-1.5 text-gray-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          {!readOnly && (
                            <>
                              <button onClick={() => openEdit(i)} title="Editar" className="p-1.5 text-gray-400 hover:text-brand hover:bg-brand-light rounded-lg transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button onClick={() => setConfirmDelete(i)} title="Eliminar" className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Tarjetas móvil */}
          <div className="md:hidden divide-y divide-gray-100">
            {insumos.map((i) => {
              const enAlerta = Number(i.stock_actual) <= Number(i.stock_minimo)
              return (
                <div key={i.id} className={`p-4 ${!i.activo ? 'opacity-50' : ''}`}>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="font-medium text-gray-900 truncate">{i.nombre}</p>
                    {readOnly ? (
                      <span className={`text-xs ${i.activo ? 'text-brand' : 'text-gray-400'}`}>{i.activo ? 'Activo' : 'Inactivo'}</span>
                    ) : (
                      <ToggleActivo id={i.id} activo={i.activo} />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className={`font-bold ${enAlerta ? 'text-red-500' : 'text-gray-900'}`}>
                      {fmtCant(i.stock_actual)} {i.unidad_medida}
                    </span>
                    <span className="text-gray-500">{fmtMoney(i.costo_unitario)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setHistorialInsumo(i)} className="flex-1 py-1.5 text-xs text-center border border-gray-200 rounded-lg text-gray-600">Historial</button>
                    {!readOnly && (
                      <>
                        <button onClick={() => openEdit(i)} className="flex-1 py-1.5 text-xs text-center border border-gray-200 rounded-lg text-brand">Editar</button>
                        <button onClick={() => setConfirmDelete(i)} className="flex-1 py-1.5 text-xs text-center border border-gray-200 rounded-lg text-red-500">Eliminar</button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 p-6 max-h-[90vh] overflow-y-auto">
            {editing
              ? <FormEditar key={editing.id} insumo={editing} onClose={closeModal} />
              : <FormCrear onClose={closeModal} />}
          </div>
        </div>
      )}

      {entradaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEntradaOpen(false)} />
          <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 p-6 max-h-[90vh] overflow-y-auto">
            <FormEntrada insumos={insumos} insumoPreseleccionado={entradaPre} onClose={() => setEntradaOpen(false)} />
          </div>
        </div>
      )}

      {historialInsumo && (
        <ModalHistorial insumo={historialInsumo} onClose={() => setHistorialInsumo(null)} />
      )}

      {confirmDelete && (
        <ModalConfirmar
          nombre={confirmDelete.nombre}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
          pending={deletePending}
        />
      )}
    </>
  )
}
