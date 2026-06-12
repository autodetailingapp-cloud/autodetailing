'use client'

import { useState, useTransition } from 'react'
import { useActionState } from 'react'
import {
  crearColaborador, actualizarColaborador, eliminarColaborador,
  registrarAsistenciaBulk, pagarNomina,
} from './actions'

const fmt = (n) => `$${Number(n ?? 0).toFixed(2)}`

const ESTADOS_ASISTENCIA = [
  { value: 'presente', label: 'P', title: 'Presente', color: 'bg-green-100 text-green-700 hover:bg-green-200' },
  { value: 'ausente',  label: 'A', title: 'Ausente',  color: 'bg-red-100 text-red-700 hover:bg-red-200' },
  { value: 'permiso',  label: 'Pe', title: 'Permiso', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
  { value: 'feriado',  label: 'F', title: 'Feriado',  color: 'bg-gray-100 text-gray-500 hover:bg-gray-200' },
]

function ModalColaborador({ colaborador, onClose }) {
  const isEdit = !!colaborador?.id
  const action = isEdit ? actualizarColaborador : crearColaborador
  const [state, formAction, isPending] = useActionState(action, null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4">
          {isEdit ? 'Editar colaborador' : 'Nuevo colaborador'}
        </h3>

        {state?.error && (
          <p className="px-3.5 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm mb-4">{state.error}</p>
        )}

        <form action={formAction} className="space-y-3">
          {isEdit && <input type="hidden" name="id" value={colaborador.id} />}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre *</label>
            <input
              name="nombre" required defaultValue={colaborador?.nombre ?? ''}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Cargo</label>
            <input
              name="cargo" defaultValue={colaborador?.cargo ?? ''}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Salario/día *</label>
              <input
                name="salario_dia" type="number" step="0.01" min="0" required
                defaultValue={colaborador?.salario_dia ?? ''}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Días/semana *</label>
              <select
                name="dias_semana" defaultValue={colaborador?.dias_semana ?? '5'}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              >
                {[1,2,3,4,5,6,7].map((d) => (
                  <option key={d} value={d}>{d} día{d !== 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button
              type="submit" disabled={isPending}
              className="flex-1 py-2.5 rounded-xl bg-brand hover:bg-brand/90 text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {isPending ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalAsistencia({ colaboradores, fechaHoy, asistenciaHoy, onClose }) {
  const [estados, setEstados] = useState(() => {
    const map = {}
    colaboradores.forEach((c) => {
      const reg = asistenciaHoy.find((a) => a.colaborador_id === c.id)
      map[c.id] = reg?.estado ?? 'presente'
    })
    return map
  })
  const [error, setError] = useState(null)
  const [isPending, startTransition] = useTransition()

  function handleGuardar() {
    setError(null)
    const registros = colaboradores.map((c) => ({
      colaborador_id: c.id,
      fecha: fechaHoy,
      estado: estados[c.id] ?? 'presente',
    }))
    startTransition(async () => {
      const result = await registrarAsistenciaBulk(registros)
      if (result?.error) { setError(result.error); return }
      onClose()
    })
  }

  const fechaLabel = new Date(fechaHoy + 'T00:00:00').toLocaleDateString('es-EC', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-base font-bold text-gray-900 mb-0.5">Asistencia del día</h3>
        <p className="text-sm text-gray-400 mb-4 capitalize">{fechaLabel}</p>

        {error && <p className="px-3.5 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm mb-4">{error}</p>}

        <div className="space-y-3 mb-5">
          {colaboradores.map((c) => (
            <div key={c.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{c.nombre}</p>
                {c.cargo && <p className="text-xs text-gray-400">{c.cargo}</p>}
              </div>
              <div className="flex gap-1.5">
                {ESTADOS_ASISTENCIA.map((est) => (
                  <button
                    key={est.value}
                    title={est.title}
                    onClick={() => setEstados((prev) => ({ ...prev, [c.id]: est.value }))}
                    className={`w-9 h-9 rounded-lg text-xs font-bold transition-colors ${
                      estados[c.id] === est.value
                        ? est.color + ' ring-2 ring-offset-1 ring-current'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    {est.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs text-gray-400 mb-4 flex gap-4">
          {ESTADOS_ASISTENCIA.map((e) => (
            <span key={e.value} className={`px-2 py-0.5 rounded ${e.color}`}>{e.label} = {e.title}</span>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleGuardar} disabled={isPending}
            className="flex-1 py-2.5 rounded-xl bg-brand hover:bg-brand/90 text-white text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {isPending ? 'Guardando...' : 'Guardar asistencia'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalPagoNomina({ colaborador, diasPresentes, onClose }) {
  const monto = (diasPresentes * Number(colaborador.salario_dia)).toFixed(2)
  const [montoInput, setMontoInput] = useState(monto)
  const [error, setError] = useState(null)
  const [isPending, startTransition] = useTransition()
  const mesLabel = new Date().toLocaleDateString('es-EC', { month: 'long', year: 'numeric' })

  function handlePagar() {
    setError(null)
    const montoNum = parseFloat(montoInput)
    if (isNaN(montoNum) || montoNum <= 0) { setError('Ingresa un monto válido'); return }

    const descripcion = `Pago nómina: ${colaborador.nombre} — ${mesLabel} (${diasPresentes} días)`
    startTransition(async () => {
      const result = await pagarNomina(colaborador.id, montoNum, descripcion)
      if (result?.error) { setError(result.error); return }
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
        <h3 className="text-base font-bold text-gray-900 mb-1">Pago de nómina</h3>
        <p className="text-sm text-gray-500 mb-4">{colaborador.nombre} · {diasPresentes} días trabajados</p>

        {error && <p className="px-3.5 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm mb-4">{error}</p>}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Monto a pagar</label>
          <input
            type="number" step="0.01" min="0" value={montoInput}
            onChange={(e) => setMontoInput(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-1">
            Calculado: {diasPresentes} días × {fmt(colaborador.salario_dia)}/día = {fmt(monto)}
          </p>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handlePagar} disabled={isPending}
            className="flex-1 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {isPending ? 'Registrando...' : 'Registrar pago'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function NominaUI({ colaboradores, asistencia, fechaHoy, mesLabel }) {
  const [modalColab, setModalColab] = useState(null)
  const [modalAsistencia, setModalAsistencia] = useState(false)
  const [modalPago, setModalPago] = useState(null)
  const [eliminandoId, setEliminandoId] = useState(null)
  const [isPendingElim, startElim] = useTransition()

  const asistenciaHoy = asistencia.filter((a) => a.fecha === fechaHoy)

  function getDiasPresentes(colaboradorId) {
    return asistencia.filter((a) => a.colaborador_id === colaboradorId && a.estado === 'presente').length
  }

  function getEstadoHoy(colaboradorId) {
    return asistenciaHoy.find((a) => a.colaborador_id === colaboradorId)?.estado ?? null
  }

  const totalNomina = colaboradores.reduce((s, c) => s + getDiasPresentes(c.id) * Number(c.salario_dia), 0)

  function handleEliminar(id) {
    if (!confirm('¿Desactivar este colaborador?')) return
    setEliminandoId(id)
    startElim(async () => {
      await eliminarColaborador(id)
      setEliminandoId(null)
    })
  }

  const estadoHoyConfig = {
    presente: 'bg-green-100 text-green-700',
    ausente: 'bg-red-100 text-red-700',
    permiso: 'bg-blue-100 text-blue-700',
    feriado: 'bg-gray-100 text-gray-500',
  }

  return (
    <>
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nómina y colaboradores</h1>
          <p className="text-sm text-gray-400 mt-0.5 capitalize">{mesLabel}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setModalAsistencia(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Asistencia de hoy
          </button>
          <button
            onClick={() => setModalColab({})}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand hover:bg-brand/90 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo colaborador
          </button>
        </div>
      </div>

      {/* Tarjeta resumen del mes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-400 mb-1">Colaboradores activos</p>
          <p className="text-2xl font-bold text-gray-900">{colaboradores.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-400 mb-1">Presentes hoy</p>
          <p className="text-2xl font-bold text-brand">
            {asistenciaHoy.filter((a) => a.estado === 'presente').length}
          </p>
          <p className="text-xs text-gray-400 mt-1">de {colaboradores.length} colaboradores</p>
        </div>
        <div className="bg-gray-900 rounded-2xl p-5">
          <p className="text-xs text-gray-400 mb-1">Total nómina {mesLabel}</p>
          <p className="text-2xl font-bold text-white">{fmt(totalNomina)}</p>
          <p className="text-xs text-gray-400 mt-1">Calculado por asistencia</p>
        </div>
      </div>

      {/* Lista colaboradores */}
      {colaboradores.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
          <p className="text-gray-400 text-sm">No hay colaboradores registrados.</p>
          <button onClick={() => setModalColab({})} className="mt-3 text-brand text-sm font-semibold hover:underline">
            + Agregar el primero
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Colaborador</th>
                  <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Salario/día</th>
                  <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Días presentes</th>
                  <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pago {mesLabel}</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Hoy</th>
                  <th className="px-6 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {colaboradores.map((c) => {
                  const dias = getDiasPresentes(c.id)
                  const pago = dias * Number(c.salario_dia)
                  const estadoHoy = getEstadoHoy(c.id)
                  return (
                    <tr key={c.id} className="hover:bg-gray-50/40 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{c.nombre}</p>
                        {c.cargo && <p className="text-xs text-gray-400">{c.cargo}</p>}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-700">{fmt(c.salario_dia)}</td>
                      <td className="px-6 py-4 text-right text-gray-700">{dias}</td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900">{fmt(pago)}</td>
                      <td className="px-6 py-4">
                        {estadoHoy ? (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${estadoHoyConfig[estadoHoy] ?? 'bg-gray-100 text-gray-500'}`}>
                            {estadoHoy}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">Sin registro</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setModalPago({ colaborador: c, diasPresentes: dias })}
                            className="px-3 py-1.5 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent text-xs font-semibold transition-colors"
                          >
                            Pagar
                          </button>
                          <button
                            onClick={() => setModalColab(c)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleEliminar(c.id)}
                            disabled={eliminandoId === c.id && isPendingElim}
                            className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
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

          {/* Mobile */}
          <div className="md:hidden divide-y divide-gray-100">
            {colaboradores.map((c) => {
              const dias = getDiasPresentes(c.id)
              const pago = dias * Number(c.salario_dia)
              const estadoHoy = getEstadoHoy(c.id)
              return (
                <div key={c.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">{c.nombre}</p>
                      {c.cargo && <p className="text-xs text-gray-400">{c.cargo}</p>}
                    </div>
                    {estadoHoy ? (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${estadoHoyConfig[estadoHoy] ?? 'bg-gray-100 text-gray-500'}`}>
                        {estadoHoy}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">Sin registro hoy</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      {dias} días · <span className="font-semibold text-gray-900">{fmt(pago)}</span>
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => setModalPago({ colaborador: c, diasPresentes: dias })} className="px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-semibold">Pagar</button>
                      <button onClick={() => setModalColab(c)} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold">Editar</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {modalColab !== null && (
        <ModalColaborador colaborador={modalColab.id ? modalColab : null} onClose={() => setModalColab(null)} />
      )}
      {modalAsistencia && (
        <ModalAsistencia
          colaboradores={colaboradores}
          fechaHoy={fechaHoy}
          asistenciaHoy={asistenciaHoy}
          onClose={() => setModalAsistencia(false)}
        />
      )}
      {modalPago && (
        <ModalPagoNomina
          colaborador={modalPago.colaborador}
          diasPresentes={modalPago.diasPresentes}
          onClose={() => setModalPago(null)}
        />
      )}
    </>
  )
}
