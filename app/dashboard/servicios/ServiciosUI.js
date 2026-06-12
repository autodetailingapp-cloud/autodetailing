'use client'

import { useState, useEffect, useOptimistic, useTransition, useActionState } from 'react'
import { crearServicio, actualizarServicio, toggleServicio, eliminarServicio } from './actions'

const fmtPrecio = (n) => `$${Number(n).toFixed(2)}`
const fmtMins = (m) => {
  if (!m) return '—'
  const h = Math.floor(m / 60), min = m % 60
  return h ? (min ? `${h}h ${min}min` : `${h}h`) : `${min}min`
}

function ToggleActivo({ id, activo }) {
  const [optimistic, setOptimistic] = useOptimistic(activo)
  const [, startTransition] = useTransition()

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          setOptimistic(!optimistic)
          await toggleServicio(id, !optimistic)
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

function CamposServicio({ state, formAction, pending, servicio, isEdit, onClose }) {
  return (
    <form action={formAction} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={servicio.id} />}

      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-bold text-gray-900">
          {isEdit ? 'Editar servicio' : 'Nuevo servicio'}
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Nombre <span className="text-red-500">*</span>
        </label>
        <input
          name="nombre" type="text" required
          defaultValue={servicio?.nombre ?? ''}
          placeholder="Ej: Lavado completo premium"
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripción</label>
        <textarea
          name="descripcion" rows={3}
          defaultValue={servicio?.descripcion ?? ''}
          placeholder="Detalle del servicio incluido..."
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Precio (USD) <span className="text-red-500">*</span>
          </label>
          <input
            name="precio" type="number" required min="0" step="0.01"
            defaultValue={servicio?.precio ?? ''}
            placeholder="0.00"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Tiempo (min)</label>
          <input
            name="tiempo_estimado" type="number" min="1"
            defaultValue={servicio?.tiempo_estimado ?? ''}
            placeholder="Ej: 60"
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
          {pending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear servicio'}
        </button>
      </div>
    </form>
  )
}

function FormCrear({ onClose }) {
  const [state, formAction, pending] = useActionState(crearServicio, null)
  useEffect(() => { if (state?.success) onClose() }, [state?.success]) // eslint-disable-line
  return <CamposServicio state={state} formAction={formAction} pending={pending} onClose={onClose} />
}

function FormEditar({ servicio, onClose }) {
  const [state, formAction, pending] = useActionState(actualizarServicio, null)
  useEffect(() => { if (state?.success) onClose() }, [state?.success]) // eslint-disable-line
  return <CamposServicio state={state} formAction={formAction} pending={pending} servicio={servicio} isEdit onClose={onClose} />
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
        <h3 className="text-base font-bold text-gray-900 text-center mb-1">Eliminar servicio</h3>
        <p className="text-sm text-gray-500 text-center mb-6">
          ¿Seguro que deseas eliminar <span className="font-semibold text-gray-800">"{nombre}"</span>? Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={pending}
            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {pending ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ServiciosUI({ servicios }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deletePending, setDeletePending] = useState(false)

  const closeModal = () => { setModalOpen(false); setEditing(null) }
  const openCreate = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (s) => { setEditing(s); setModalOpen(true) }

  async function handleDelete() {
    if (!confirmDelete) return
    setDeletePending(true)
    await eliminarServicio(confirmDelete.id)
    setDeletePending(false)
    setConfirmDelete(null)
  }

  const totalActivos = servicios.filter((s) => s.activo).length

  return (
    <>
      {/* Encabezado */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Servicios</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {totalActivos} activo{totalActivos !== 1 ? 's' : ''} ·{' '}
            {servicios.length - totalActivos} inactivo{servicios.length - totalActivos !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo servicio
        </button>
      </div>

      {/* Estado vacío */}
      {servicios.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-light mb-4">
            <svg className="w-7 h-7 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-gray-800 mb-1">Sin servicios aún</h3>
          <p className="text-sm text-gray-400 mb-6">Registra los servicios que ofrece tu lavadero</p>
          <button
            onClick={openCreate}
            className="px-5 py-2.5 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark transition-colors"
          >
            Agregar servicio
          </button>
        </div>
      )}

      {/* Tabla escritorio / Tarjetas móvil */}
      {servicios.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Tabla escritorio */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Servicio</th>
                  <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Precio</th>
                  <th className="text-center px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Duración</th>
                  <th className="text-center px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                  <th className="px-6 py-3.5 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {servicios.map((s) => (
                  <tr
                    key={s.id}
                    className={`hover:bg-gray-50/40 transition-colors ${!s.activo ? 'opacity-50' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{s.nombre}</p>
                      {s.descripcion && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1 max-w-xs">{s.descripcion}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-gray-900">{fmtPrecio(s.precio)}</span>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-500">{fmtMins(s.tiempo_estimado)}</td>
                    <td className="px-6 py-4 text-center">
                      <ToggleActivo id={s.id} activo={s.activo} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(s)}
                          title="Editar"
                          className="p-1.5 text-gray-400 hover:text-brand hover:bg-brand-light rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setConfirmDelete(s)}
                          title="Eliminar"
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tarjetas móvil */}
          <div className="md:hidden divide-y divide-gray-100">
            {servicios.map((s) => (
              <div
                key={s.id}
                className={`p-4 flex items-center gap-3 ${!s.activo ? 'opacity-50' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{s.nombre}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-sm font-bold text-gray-900">{fmtPrecio(s.precio)}</span>
                    {s.tiempo_estimado && (
                      <span className="text-xs text-gray-400">{fmtMins(s.tiempo_estimado)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <ToggleActivo id={s.id} activo={s.activo} />
                  <button
                    onClick={() => openEdit(s)}
                    className="p-1.5 text-gray-400 hover:text-brand transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setConfirmDelete(s)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal crear/editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 p-6 max-h-[90vh] overflow-y-auto">
            {editing
              ? <FormEditar key={editing.id} servicio={editing} onClose={closeModal} />
              : <FormCrear onClose={closeModal} />
            }
          </div>
        </div>
      )}

      {/* Modal confirmar eliminación */}
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
