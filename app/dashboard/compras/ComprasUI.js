'use client'

import { useState, useEffect, useActionState, useTransition } from 'react'
import Link from 'next/link'
import { crearCompra, actualizarCompra, eliminarCompra } from './actions'

const fmt = (n) => `$${Number(n ?? 0).toFixed(2)}`
const fmtFecha = (s) =>
  s ? new Date(s + 'T00:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const TIPOS = ['Costo', 'Gasto']
const TIPOS_DOC = ['Factura', 'Nota de Venta']
const PLAZOS = [0, 30, 60, 90]
const INPUT = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent'
const SELECT = INPUT + ' bg-white'

// ——— Modal confirmar eliminación ———
function ModalConfirmar({ nombre, onConfirm, onCancel, pending }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-red-50 mb-4 mx-auto">
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-gray-900 text-center mb-1">Eliminar compra</h3>
        <p className="text-sm text-gray-500 text-center mb-6">
          ¿Eliminar <span className="font-semibold text-gray-800">"{nombre}"</span>?
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
          <button onClick={onConfirm} disabled={pending} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-60">
            {pending ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ——— Campos compartidos del formulario ———
function CamposCompra({ state, formAction, pending, compra, isEdit, onClose, hoy, insumos }) {
  const [tipoDocCompra, setTipoDocCompra] = useState(compra?.tipo_doc_compra ?? 'Factura')
  const [subtotal, setSubtotal] = useState(String(compra?.subtotal ?? ''))
  const [ivaVal, setIvaVal] = useState(String(compra?.iva ?? '0'))
  const [plazo, setPlazo] = useState(String(compra?.plazo_pago_proveedor ?? '0'))
  const [tipo, setTipo] = useState(compra?.tipo ?? '')
  const [insumoId, setInsumoId] = useState('')

  const esCostoNueva = tipo === 'Costo' && !isEdit
  const insumoSeleccionado = insumos?.find((i) => i.id === insumoId)

  // Auto-calcular IVA cuando cambia el subtotal o tipo de documento
  useEffect(() => {
    const sub = parseFloat(subtotal) || 0
    if (tipoDocCompra === 'Factura') {
      setIvaVal((sub * 0.15).toFixed(2))
    } else {
      setIvaVal('0')
    }
  }, [subtotal, tipoDocCompra])

  const sub = parseFloat(subtotal) || 0
  const iva = parseFloat(ivaVal) || 0
  const total = (sub + iva).toFixed(2)

  return (
    <form action={formAction} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={compra.id} />}
      <input type="hidden" name="total" value={total} />

      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'Editar compra' : 'Nueva compra'}</h2>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {state?.error && (
        <p className="px-3.5 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{state.error}</p>
      )}

      {/* Tipo documento + Tipo (Costo/Gasto) */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Doc. proveedor <span className="text-red-500">*</span></label>
          <select
            name="tipo_doc_compra" required value={tipoDocCompra}
            onChange={(e) => setTipoDocCompra(e.target.value)}
            className={SELECT}
          >
            {TIPOS_DOC.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Clasificación <span className="text-red-500">*</span></label>
          <select name="tipo" required value={tipo} onChange={(e) => { setTipo(e.target.value); setInsumoId('') }} className={SELECT}>
            <option value="" disabled>Selecciona</option>
            {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {tipo === 'Costo' && (
        <div className="flex items-start gap-2 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Si este costo es un insumo del inventario, regístralo desde el módulo <strong>Inventario</strong> para mantener el stock actualizado.</span>
        </div>
      )}

      {esCostoNueva && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Insumo de inventario (opcional)</label>
          <select value={insumoId} onChange={(e) => setInsumoId(e.target.value)} className={SELECT}>
            <option value="">No es un insumo de inventario</option>
            {insumos?.map((i) => (
              <option key={i.id} value={i.id}>{i.nombre} ({i.unidad_medida})</option>
            ))}
          </select>
        </div>
      )}

      {!insumoSeleccionado && (
      <>
      {/* Proveedor + Crédito */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Proveedor <span className="text-red-500">*</span></label>
          <input name="proveedor" type="text" required defaultValue={compra?.proveedor ?? ''} placeholder="Nombre del proveedor" className={INPUT} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Crédito proveedor</label>
          <select
            name="plazo_pago_proveedor" value={plazo}
            onChange={(e) => setPlazo(e.target.value)}
            className={SELECT}
          >
            {PLAZOS.map((p) => <option key={p} value={p}>{p === 0 ? 'Contado' : `${p} días`}</option>)}
          </select>
        </div>
      </div>

      {plazo !== '0' && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-accent/10 rounded-xl text-sm text-accent font-medium">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Se registrará en cartera de proveedores con {plazo} días de plazo
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripción <span className="text-red-500">*</span></label>
        <input name="descripcion" type="text" required defaultValue={compra?.descripcion ?? ''} placeholder="Detalle del producto o servicio comprado" className={INPUT} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">N° {tipoDocCompra === 'Factura' ? 'factura' : 'documento'}</label>
          <input name="numero_factura" type="text" defaultValue={compra?.numero_factura ?? ''} placeholder="001-001-00000001" className={INPUT} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha <span className="text-red-500">*</span></label>
          <input name="fecha" type="date" required defaultValue={compra?.fecha ?? hoy} className={INPUT} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Subtotal <span className="text-red-500">*</span></label>
          <input
            name="subtotal" type="number" min="0" step="0.01" required
            value={subtotal} onChange={(e) => setSubtotal(e.target.value)}
            placeholder="0.00" className={INPUT}
          />
        </div>
        {tipoDocCompra === 'Factura' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">IVA 15%</label>
            <input
              name="iva" type="number" min="0" step="0.01"
              value={ivaVal} onChange={(e) => setIvaVal(e.target.value)}
              placeholder="0.00" className={INPUT}
            />
          </div>
        ) : (
          <input type="hidden" name="iva" value="0" />
        )}
        <div className={tipoDocCompra !== 'Factura' ? 'col-span-2' : ''}>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Total</label>
          <div className="w-full px-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-sm font-bold text-gray-900">
            ${total}
          </div>
        </div>
      </div>

      {tipoDocCompra !== 'Factura' && (
        <p className="text-xs text-gray-400">Nota de Venta: sin IVA</p>
      )}
      </>
      )}

      {insumoSeleccionado && (
        <div className="flex items-start gap-2 px-4 py-3 bg-brand-light rounded-xl text-sm text-brand">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>
            Esta compra corresponde a <strong>{insumoSeleccionado.nombre}</strong>. Regístrala como entrada de stock
            desde Inventario para que el costo y el stock queden sincronizados (no se debe registrar también aquí).
          </span>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          Cancelar
        </button>
        {insumoSeleccionado ? (
          <Link
            href={`/dashboard/inventario?entrada=${insumoSeleccionado.id}`}
            className="flex-1 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-sm font-semibold transition-colors text-center"
          >
            Ir a Inventario
          </Link>
        ) : (
          <button type="submit" disabled={pending} className="flex-1 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-sm font-semibold transition-colors disabled:opacity-60">
            {pending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Registrar compra'}
          </button>
        )}
      </div>
    </form>
  )
}

function FormCrear({ onClose, hoy, insumos }) {
  const [state, formAction, pending] = useActionState(crearCompra, null)
  useEffect(() => { if (state?.success) onClose() }, [state?.success]) // eslint-disable-line
  return <CamposCompra state={state} formAction={formAction} pending={pending} onClose={onClose} hoy={hoy} insumos={insumos} />
}

function FormEditar({ compra, onClose, hoy }) {
  const [state, formAction, pending] = useActionState(actualizarCompra, null)
  useEffect(() => { if (state?.success) onClose() }, [state?.success]) // eslint-disable-line
  return <CamposCompra state={state} formAction={formAction} pending={pending} compra={compra} isEdit onClose={onClose} hoy={hoy} />
}

export default function ComprasUI({ compras, hoy, insumos }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deletePending, setDeletePending] = useState(false)

  const closeModal = () => { setModalOpen(false); setEditing(null) }
  const openCreate = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (c) => { setEditing(c); setModalOpen(true) }

  async function handleDelete() {
    if (!confirmDelete) return
    setDeletePending(true)
    await eliminarCompra(confirmDelete.id)
    setDeletePending(false)
    setConfirmDelete(null)
  }

  const totalCostos = compras.filter((c) => c.tipo === 'Costo').reduce((s, c) => s + Number(c.total), 0)
  const totalGastos = compras.filter((c) => c.tipo === 'Gasto').reduce((s, c) => s + Number(c.total), 0)
  const totalMes = totalCostos + totalGastos

  const mesLabel = new Date().toLocaleDateString('es-EC', { month: 'long', year: 'numeric' })

  return (
    <>
      {/* Encabezado */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compras</h1>
          <p className="text-sm text-gray-400 mt-0.5 capitalize">{mesLabel}</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva compra
        </button>
      </div>

      {/* Resumen del mes */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-400 mb-1">Total costos</p>
          <p className="text-xl font-bold text-gray-900">{fmt(totalCostos)}</p>
          <p className="text-xs text-gray-400 mt-1">Insumos directos</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-400 mb-1">Total gastos</p>
          <p className="text-xl font-bold text-gray-900">{fmt(totalGastos)}</p>
          <p className="text-xs text-gray-400 mt-1">Operacionales</p>
        </div>
        <div className="bg-brand-light rounded-2xl border border-brand/10 shadow-sm p-5">
          <p className="text-xs text-gray-500 mb-1">Total del mes</p>
          <p className="text-xl font-bold text-brand">{fmt(totalMes)}</p>
          <p className="text-xs text-gray-400 mt-1">{compras.length} registro{compras.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Estado vacío */}
      {compras.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-light mb-4">
            <svg className="w-7 h-7 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-gray-800 mb-1">Sin compras este mes</h3>
          <p className="text-sm text-gray-400 mb-6">Registra las compras e insumos del negocio</p>
          <button onClick={openCreate} className="px-5 py-2.5 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark transition-colors">
            Registrar compra
          </button>
        </div>
      )}

      {/* Tabla */}
      {compras.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Proveedor</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Descripción</th>
                  <th className="text-center px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                  <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                  <th className="px-6 py-3.5 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {compras.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/40 transition-colors">
                    <td className="px-6 py-4 text-gray-500">{fmtFecha(c.fecha)}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{c.proveedor}</td>
                    <td className="px-6 py-4 text-gray-600">
                      <p className="line-clamp-1 max-w-xs">{c.descripcion}</p>
                      {c.numero_factura && <p className="text-xs text-gray-400 mt-0.5">Fact: {c.numero_factura}</p>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-lg ${c.tipo === 'Costo' ? 'bg-brand-light text-brand' : 'bg-yellow-50 text-yellow-700'}`}>
                        {c.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">{fmt(c.total)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(c)} title="Editar" className="p-1.5 text-gray-400 hover:text-brand hover:bg-brand-light rounded-lg transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => setConfirmDelete(c)} title="Eliminar" className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
            {compras.map((c) => (
              <div key={c.id} className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 truncate">{c.proveedor}</p>
                    <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-lg flex-shrink-0 ${c.tipo === 'Costo' ? 'bg-brand-light text-brand' : 'bg-yellow-50 text-yellow-700'}`}>
                      {c.tipo}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{c.descripcion}</p>
                  <p className="text-xs text-gray-400">{fmtFecha(c.fecha)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-gray-900">{fmt(c.total)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <button onClick={() => openEdit(c)} className="p-1 text-gray-400 hover:text-brand transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button onClick={() => setConfirmDelete(c)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal crear/editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 p-6 max-h-[90vh] overflow-y-auto">
            {editing
              ? <FormEditar key={editing.id} compra={editing} onClose={closeModal} hoy={hoy} />
              : <FormCrear onClose={closeModal} hoy={hoy} insumos={insumos} />
            }
          </div>
        </div>
      )}

      {confirmDelete && (
        <ModalConfirmar
          nombre={confirmDelete.descripcion}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
          pending={deletePending}
        />
      )}
    </>
  )
}
