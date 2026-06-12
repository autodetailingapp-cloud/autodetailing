'use client'

import { useState, useEffect, useMemo, useOptimistic, useTransition, useActionState } from 'react'
import { crearCliente, actualizarCliente, toggleCliente, getHistorialCliente } from './actions'

const TIPOS_DOC = ['Cédula', 'RUC', 'Pasaporte']
const TIPOS_CONTRIB = ['Consumidor Final', 'RIMPE', 'RUC']
const PLAZOS = [0, 30, 60, 90]

const fmtMoneda = (n) => `$${Number(n ?? 0).toFixed(2)}`
const fmtFecha = (s) =>
  s ? new Date(s).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

// Toggle con optimistic UI
function ToggleActivo({ id, activo }) {
  const [optimistic, setOptimistic] = useOptimistic(activo)
  const [, startTransition] = useTransition()
  return (
    <button
      onClick={() =>
        startTransition(async () => {
          setOptimistic(!optimistic)
          await toggleCliente(id, !optimistic)
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

// Campos compartidos del formulario de cliente
function CamposCliente({ state, formAction, pending, cliente, isEdit, onClose }) {
  return (
    <form action={formAction} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={cliente.id} />}

      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-bold text-gray-900">
          {isEdit ? 'Editar cliente' : 'Nuevo cliente'}
        </h2>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {state?.error && (
        <p className="px-3.5 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
          {state.error}
        </p>
      )}

      {/* Sección: datos personales */}
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Datos del cliente</p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Nombre completo <span className="text-red-500">*</span>
        </label>
        <input
          name="nombre" type="text" required
          defaultValue={cliente?.nombre ?? ''}
          placeholder="Ej: Juan Pérez García"
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Tipo documento <span className="text-red-500">*</span>
          </label>
          <select
            name="tipo_documento" required
            defaultValue={cliente?.tipo_documento ?? ''}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent bg-white"
          >
            <option value="" disabled>Selecciona</option>
            {TIPOS_DOC.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            RUC / Cédula <span className="text-red-500">*</span>
          </label>
          <input
            name="ruc_cedula" type="text" required
            defaultValue={cliente?.ruc_cedula ?? ''}
            placeholder="0912345678001"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
          <input
            name="email" type="email"
            defaultValue={cliente?.email ?? ''}
            placeholder="correo@ejemplo.com"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Teléfono</label>
          <input
            name="telefono" type="tel"
            defaultValue={cliente?.telefono ?? ''}
            placeholder="0991234567"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Dirección</label>
        <input
          name="direccion" type="text"
          defaultValue={cliente?.direccion ?? ''}
          placeholder="Av. Principal 123, Guayaquil"
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
        />
      </div>

      {/* Sección: datos tributarios y crédito */}
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-1">Tributario y crédito</p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Tipo contribuyente <span className="text-red-500">*</span>
        </label>
        <select
          name="tipo_contribuyente" required
          defaultValue={cliente?.tipo_contribuyente ?? ''}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent bg-white"
        >
          <option value="" disabled>Selecciona</option>
          {TIPOS_CONTRIB.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Plazo crédito</label>
          <select
            name="plazo_credito"
            defaultValue={cliente?.plazo_credito ?? 0}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent bg-white"
          >
            {PLAZOS.map((p) => (
              <option key={p} value={p}>{p === 0 ? 'Contado' : `${p} días`}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Límite crédito (USD)</label>
          <input
            name="limite_credito" type="number" min="0" step="0.01"
            defaultValue={cliente?.limite_credito ?? 0}
            placeholder="0.00"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
        </div>
      </div>

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
          {pending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear cliente'}
        </button>
      </div>
    </form>
  )
}

function FormCrear({ onClose }) {
  const [state, formAction, pending] = useActionState(crearCliente, null)
  useEffect(() => { if (state?.success) onClose() }, [state?.success]) // eslint-disable-line
  return <CamposCliente state={state} formAction={formAction} pending={pending} onClose={onClose} />
}

function FormEditar({ cliente, onClose }) {
  const [state, formAction, pending] = useActionState(actualizarCliente, null)
  useEffect(() => { if (state?.success) onClose() }, [state?.success]) // eslint-disable-line
  return <CamposCliente state={state} formAction={formAction} pending={pending} cliente={cliente} isEdit onClose={onClose} />
}

// Modal de historial de compras
function ModalHistorial({ cliente, onClose }) {
  const [ventas, setVentas] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getHistorialCliente(cliente.id).then(({ ventas }) => {
      setVentas(ventas)
      setLoading(false)
    })
  }, [cliente.id])

  const totalCompras = ventas?.reduce((acc, v) => acc + Number(v.total ?? 0), 0) ?? 0

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Historial de compras</h2>
          <p className="text-sm text-gray-400 mt-0.5">{cliente.nombre}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors mt-0.5">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {loading && (
        <div className="py-10 text-center">
          <div className="inline-block w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && ventas?.length === 0 && (
        <div className="py-10 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gray-100 mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-600">Sin compras registradas</p>
          <p className="text-xs text-gray-400 mt-1">Las ventas aparecerán aquí cuando se registren</p>
        </div>
      )}

      {!loading && ventas && ventas.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-brand-light rounded-xl p-3.5">
              <p className="text-xs text-gray-500 mb-0.5">Total compras</p>
              <p className="text-lg font-bold text-brand">{fmtMoneda(totalCompras)}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3.5">
              <p className="text-xs text-gray-500 mb-0.5">Número de visitas</p>
              <p className="text-lg font-bold text-gray-900">{ventas.length}</p>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto -mx-1 px-1 space-y-1.5">
            {ventas.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl text-sm"
              >
                <div>
                  <p className="font-medium text-gray-900">{fmtFecha(v.fecha)}</p>
                  {v.estado && (
                    <p className="text-xs text-gray-400 capitalize mt-0.5">{v.estado}</p>
                  )}
                </div>
                <span className="font-bold text-gray-900">{fmtMoneda(v.total)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <button
        onClick={onClose}
        className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
      >
        Cerrar
      </button>
    </div>
  )
}

export default function ClientesUI({ clientes }) {
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [historialCliente, setHistorialCliente] = useState(null)

  const closeModal = () => { setModalOpen(false); setEditing(null) }
  const openCreate = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (c) => { setEditing(c); setModalOpen(true) }
  const openHistorial = (c) => setHistorialCliente(c)
  const closeHistorial = () => setHistorialCliente(null)

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clientes
    return clientes.filter(
      (c) =>
        c.nombre?.toLowerCase().includes(q) ||
        c.ruc_cedula?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.telefono?.toLowerCase().includes(q)
    )
  }, [clientes, search])

  const totalActivos = clientes.filter((c) => c.activo).length

  return (
    <>
      {/* Encabezado */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {clientes.length} total · {totalActivos} activo{totalActivos !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo cliente
        </button>
      </div>

      {/* Buscador */}
      {clientes.length > 0 && (
        <div className="relative mb-4">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, RUC, email o teléfono..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Estado vacío */}
      {clientes.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-light mb-4">
            <svg className="w-7 h-7 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-gray-800 mb-1">Sin clientes aún</h3>
          <p className="text-sm text-gray-400 mb-6">Registra tu primer cliente para comenzar</p>
          <button
            onClick={openCreate}
            className="px-5 py-2.5 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark transition-colors"
          >
            Agregar cliente
          </button>
        </div>
      )}

      {/* Sin resultados en búsqueda */}
      {clientes.length > 0 && filtrados.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <p className="text-sm text-gray-500">
            Sin resultados para <span className="font-semibold">"{search}"</span>
          </p>
          <button onClick={() => setSearch('')} className="mt-2 text-sm text-brand hover:text-brand-dark transition-colors">
            Limpiar búsqueda
          </button>
        </div>
      )}

      {/* Tabla escritorio / Tarjetas móvil */}
      {filtrados.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Tabla escritorio */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Documento</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Teléfono</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                  <th className="text-center px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Crédito</th>
                  <th className="text-center px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                  <th className="px-6 py-3.5 w-28" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtrados.map((c) => (
                  <tr
                    key={c.id}
                    className={`hover:bg-gray-50/40 transition-colors ${!c.activo ? 'opacity-50' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{c.nombre}</p>
                      {c.email && <p className="text-xs text-gray-400 mt-0.5">{c.email}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-700">{c.ruc_cedula}</p>
                      <p className="text-xs text-gray-400">{c.tipo_documento}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{c.telefono ?? '—'}</td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg">
                        {c.tipo_contribuyente ?? '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {c.plazo_credito > 0 ? (
                        <div>
                          <p className="text-xs font-medium text-gray-700">{c.plazo_credito} días</p>
                          <p className="text-xs text-gray-400">{fmtMoneda(c.limite_credito)}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Contado</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <ToggleActivo id={c.id} activo={c.activo} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openHistorial(c)}
                          title="Ver historial"
                          className="p-1.5 text-gray-400 hover:text-accent transition-colors rounded-lg hover:bg-accent/10"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openEdit(c)}
                          title="Editar"
                          className="p-1.5 text-gray-400 hover:text-brand transition-colors rounded-lg hover:bg-brand-light"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tarjetas móvil/tablet */}
          <div className="lg:hidden divide-y divide-gray-100">
            {filtrados.map((c) => (
              <div key={c.id} className={`p-4 ${!c.activo ? 'opacity-50' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{c.nombre}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {c.tipo_documento} · {c.ruc_cedula}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <ToggleActivo id={c.id} activo={c.activo} />
                    <button
                      onClick={() => openHistorial(c)}
                      className="p-1.5 text-gray-400 hover:text-accent transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => openEdit(c)}
                      className="p-1.5 text-gray-400 hover:text-brand transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>
                </div>
                {(c.telefono || c.email) && (
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                    {c.telefono && <span>{c.telefono}</span>}
                    {c.email && <span className="truncate">{c.email}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer con conteo de resultados */}
          {search && (
            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/40">
              <p className="text-xs text-gray-400">
                {filtrados.length} de {clientes.length} clientes
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal crear/editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 p-6 max-h-[90vh] overflow-y-auto">
            {editing
              ? <FormEditar key={editing.id} cliente={editing} onClose={closeModal} />
              : <FormCrear onClose={closeModal} />
            }
          </div>
        </div>
      )}

      {/* Modal historial */}
      {historialCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeHistorial} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-6 max-h-[80vh] overflow-y-auto">
            <ModalHistorial cliente={historialCliente} onClose={closeHistorial} />
          </div>
        </div>
      )}
    </>
  )
}
