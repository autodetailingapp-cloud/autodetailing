'use client'

import { useState, useEffect, useTransition } from 'react'
import { crearVenta, anularVenta, getDetalleVenta } from './actions'

const fmt = (n) => `$${Number(n ?? 0).toFixed(2)}`
const fmtFecha = (s) =>
  s ? new Date(s + 'T00:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const TIPOS_DOC = ['Nota de Venta', 'Factura']
const TIPOS_PAGO = ['Efectivo', 'Transferencia', 'Crédito']

const ESTADO_BADGE = {
  activa: 'bg-green-50 text-green-700',
  anulada: 'bg-red-50 text-red-500',
}

// ——— Modal de confirmación anulación ———
function ModalAnular({ venta, onConfirm, onCancel, pending }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-yellow-50 mb-4 mx-auto">
          <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-gray-900 text-center mb-1">Anular venta</h3>
        <p className="text-sm text-gray-500 text-center mb-6">
          ¿Anular la venta <span className="font-semibold text-gray-800">#{venta.numero_documento}</span>? El registro se conserva como anulado.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
          <button onClick={onConfirm} disabled={pending} className="flex-1 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-semibold transition-colors disabled:opacity-60">
            {pending ? 'Anulando...' : 'Anular'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ——— Modal detalle de venta ———
function ModalDetalle({ ventaId, onClose, onAnular }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDetalleVenta(ventaId).then((d) => { setData(d); setLoading(false) })
  }, [ventaId])

  const v = data?.venta
  const detalles = data?.detalles ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Venta #{v?.numero_documento ?? '...'}</h2>
          <p className="text-sm text-gray-400 mt-0.5">{v ? fmtFecha(v.fecha) : '—'}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 mt-0.5">
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

      {!loading && v && (
        <>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">Cliente</p>
              <p className="font-medium text-gray-800">{v.clientes?.nombre ?? 'Consumidor Final'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">Tipo documento</p>
              <p className="font-medium text-gray-800">{v.tipo_documento}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">Tipo de pago</p>
              <p className="font-medium text-gray-800">{v.tipo_pago}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">Estado</p>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg capitalize ${ESTADO_BADGE[v.estado] ?? ''}`}>
                {v.estado}
              </span>
            </div>
          </div>

          {detalles.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Servicios</p>
              <div className="space-y-1.5">
                {detalles.map((d, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5 bg-gray-50 rounded-xl text-sm">
                    <div>
                      <p className="font-medium text-gray-800">{d.descripcion}</p>
                      <p className="text-xs text-gray-400">{d.cantidad} × {fmt(d.precio_unitario)}</p>
                    </div>
                    <span className="font-semibold text-gray-900">{fmt(d.subtotal)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-gray-100 pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span><span>{fmt(v.subtotal)}</span>
            </div>
            {Number(v.descuento_valor) > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Descuento ({Number(v.descuento_porcentaje).toFixed(1)}%)</span>
                <span>-{fmt(v.descuento_valor)}</span>
              </div>
            )}
            {Number(v.iva) > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>IVA 15%</span><span>{fmt(v.iva)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-100">
              <span>Total</span><span>{fmt(v.total)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Pagado</span><span>{fmt(v.monto_pagado)}</span>
            </div>
            {Number(v.monto_pagado) > Number(v.total) && (
              <div className="flex justify-between text-green-600 font-medium">
                <span>Cambio</span><span>{fmt(Number(v.monto_pagado) - Number(v.total))}</span>
              </div>
            )}
          </div>

          {v.observaciones && (
            <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-600">
              <p className="text-xs text-gray-400 mb-0.5">Observaciones</p>
              {v.observaciones}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Cerrar
            </button>
            {v.estado === 'activa' && (
              <button
                onClick={() => onAnular(v)}
                className="flex-1 py-2.5 rounded-xl border border-yellow-200 text-yellow-600 hover:bg-yellow-50 text-sm font-medium transition-colors"
              >
                Anular venta
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ——— Fila de servicio en el formulario ———
function FilaServicio({ item, index, servicios, onChange, onRemove, canRemove }) {
  const INPUT = 'w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent'

  function handleServicioChange(e) {
    const s = servicios.find((sv) => sv.id === e.target.value)
    onChange(index, {
      ...item,
      servicio_id: e.target.value,
      descripcion: s?.nombre ?? '',
      precio_unitario: s?.precio ?? 0,
    })
  }

  return (
    <div className="grid grid-cols-12 gap-2 items-end">
      <div className="col-span-5">
        <label className="block text-xs font-medium text-gray-500 mb-1">Servicio</label>
        <select value={item.servicio_id} onChange={handleServicioChange} className={INPUT + ' bg-white'}>
          <option value="">Selecciona o escribe</option>
          {servicios.map((s) => (
            <option key={s.id} value={s.id}>{s.nombre} — {fmt(s.precio)}</option>
          ))}
        </select>
      </div>
      <div className="col-span-3">
        <label className="block text-xs font-medium text-gray-500 mb-1">Descripción</label>
        <input
          type="text" value={item.descripcion} placeholder="Descripción"
          onChange={(e) => onChange(index, { ...item, descripcion: e.target.value })}
          className={INPUT}
        />
      </div>
      <div className="col-span-1">
        <label className="block text-xs font-medium text-gray-500 mb-1">Cant.</label>
        <input
          type="number" min="1" value={item.cantidad}
          onChange={(e) => onChange(index, { ...item, cantidad: parseInt(e.target.value) || 1 })}
          className={INPUT}
        />
      </div>
      <div className="col-span-2">
        <label className="block text-xs font-medium text-gray-500 mb-1">P. Unit.</label>
        <input
          type="number" min="0" step="0.01" value={item.precio_unitario}
          onChange={(e) => onChange(index, { ...item, precio_unitario: parseFloat(e.target.value) || 0 })}
          className={INPUT}
        />
      </div>
      <div className="col-span-1 flex items-center justify-center pb-0.5">
        <button
          type="button" onClick={() => onRemove(index)} disabled={!canRemove}
          className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors disabled:opacity-30"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ——— Formulario de nueva venta ———
function FormVenta({ clientes, servicios, ivaAplica, nextNumero, hoy, onClose }) {
  const INPUT = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent'
  const SELECT = INPUT + ' bg-white'

  const [items, setItems] = useState([{ servicio_id: '', descripcion: '', cantidad: 1, precio_unitario: 0 }])
  const [clienteId, setClienteId] = useState('')
  const [tipoDoc, setTipoDoc] = useState('Nota de Venta')
  const [descuentoValor, setDescuentoValor] = useState('0')
  const [tipoPago, setTipoPago] = useState('Efectivo')
  const [referencia, setReferencia] = useState('')
  const [montoPagado, setMontoPagado] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [error, setError] = useState(null)
  const [isPending, startTransition] = useTransition()

  const clienteSeleccionado = clientes.find((c) => c.id === clienteId)
  const plazoCredito = clienteSeleccionado?.plazo_credito ?? 0

  const subtotal = items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0)
  const descuento = parseFloat(descuentoValor) || 0
  const descuentoPct = subtotal > 0 ? ((descuento / subtotal) * 100).toFixed(1) : '0.0'
  const baseIva = subtotal - descuento
  const iva = ivaAplica ? parseFloat((baseIva * 0.15).toFixed(2)) : 0
  const total = parseFloat((baseIva + iva).toFixed(2))
  const pagado = parseFloat(montoPagado) || 0
  const cambio = pagado - total

  function addItem() {
    setItems((prev) => [...prev, { servicio_id: '', descripcion: '', cantidad: 1, precio_unitario: 0 }])
  }
  function updateItem(i, val) { setItems((prev) => prev.map((x, idx) => idx === i ? val : x)) }
  function removeItem(i) { setItems((prev) => prev.filter((_, idx) => idx !== i)) }

  function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (items.every((i) => !i.descripcion)) { setError('Agrega al menos un servicio'); return }

    const obs = [
      tipoPago === 'Transferencia' && referencia ? `Ref. bancaria: ${referencia}` : null,
      observaciones,
    ].filter(Boolean).join(' | ') || null

    startTransition(async () => {
      const result = await crearVenta({
        tipo_documento: tipoDoc,
        cliente_id: clienteId || null,
        fecha: hoy,
        items: items.filter((i) => i.descripcion),
        descuento_valor: descuento,
        tipo_pago: tipoPago,
        monto_pagado: pagado || total,
        observaciones: obs,
        iva_aplica: ivaAplica,
      })
      if (result?.error) { setError(result.error); return }
      onClose()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Nueva venta</h2>
          <p className="text-xs text-gray-400 mt-0.5">Documento #{nextNumero}</p>
        </div>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {error && <p className="px-3.5 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{error}</p>}

      {/* Documento y cliente */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo documento <span className="text-red-500">*</span></label>
          <select value={tipoDoc} onChange={(e) => setTipoDoc(e.target.value)} className={SELECT}>
            {TIPOS_DOC.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Cliente</label>
          <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className={SELECT}>
            <option value="">Consumidor Final</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
      </div>

      {/* Servicios */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Servicios</p>
        <div className="space-y-2">
          {items.map((item, i) => (
            <FilaServicio
              key={i} item={item} index={i}
              servicios={servicios}
              onChange={updateItem}
              onRemove={removeItem}
              canRemove={items.length > 1}
            />
          ))}
        </div>
        <button
          type="button" onClick={addItem}
          className="mt-2 flex items-center gap-1.5 text-sm text-brand hover:text-brand-dark transition-colors font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Agregar línea
        </button>
      </div>

      {/* Descuento */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Descuento (USD)</label>
          <input
            type="number" min="0" step="0.01" value={descuentoValor}
            onChange={(e) => setDescuentoValor(e.target.value)}
            className={INPUT}
          />
        </div>
        <div className="flex items-end pb-2.5">
          <p className="text-sm text-gray-400">= <span className="font-semibold text-gray-700">{descuentoPct}%</span> del subtotal</p>
        </div>
      </div>

      {/* Tipo de pago */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de pago <span className="text-red-500">*</span></label>
        <div className="flex gap-2">
          {TIPOS_PAGO.map((t) => (
            <button
              key={t} type="button"
              onClick={() => setTipoPago(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors border ${
                tipoPago === t
                  ? 'bg-brand text-white border-brand'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tipoPago === 'Transferencia' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Referencia bancaria</label>
          <input type="text" value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Núm. de comprobante" className={INPUT} />
        </div>
      )}

      {tipoPago === 'Crédito' && clienteSeleccionado && (
        <div className="px-4 py-3 bg-accent/10 rounded-xl text-sm">
          <p className="font-medium text-accent">
            {plazoCredito > 0 ? `Plazo de crédito: ${plazoCredito} días` : 'Cliente sin plazo de crédito configurado'}
          </p>
        </div>
      )}

      {/* Monto pagado y cambio */}
      {tipoPago !== 'Crédito' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Monto pagado</label>
            <input
              type="number" min="0" step="0.01" value={montoPagado}
              onChange={(e) => setMontoPagado(e.target.value)}
              placeholder={total.toFixed(2)}
              className={INPUT}
            />
          </div>
          <div className="flex items-end pb-2.5">
            {montoPagado && cambio >= 0 && (
              <p className="text-sm text-gray-500">Cambio: <span className="font-bold text-gray-900">{fmt(cambio)}</span></p>
            )}
            {montoPagado && cambio < 0 && (
              <p className="text-sm text-red-500 font-medium">Falta: {fmt(Math.abs(cambio))}</p>
            )}
          </div>
        </div>
      )}

      {/* Observaciones */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Observaciones</label>
        <textarea
          rows={2} value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          placeholder="Notas adicionales..."
          className={INPUT + ' resize-none'}
        />
      </div>

      {/* Totales */}
      <div className="bg-gray-50 rounded-2xl px-5 py-4 space-y-1.5 text-sm">
        <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
        {descuento > 0 && <div className="flex justify-between text-gray-500"><span>Descuento ({descuentoPct}%)</span><span>-{fmt(descuento)}</span></div>}
        {ivaAplica && <div className="flex justify-between text-gray-500"><span>IVA 15%</span><span>{fmt(iva)}</span></div>}
        <div className="flex justify-between font-bold text-gray-900 text-base pt-1.5 border-t border-gray-200">
          <span>Total</span><span>{fmt(total)}</span>
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={isPending} className="flex-1 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-sm font-semibold transition-colors disabled:opacity-60">
          {isPending ? 'Guardando...' : 'Registrar venta'}
        </button>
      </div>
    </form>
  )
}

// ——— Componente principal ———
export default function VentasUI({ ventas, clientes, servicios, ivaAplica, nextNumero, hoy }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [detalleId, setDetalleId] = useState(null)
  const [anulando, setAnulando] = useState(null)
  const [anulaPending, setAnulaPending] = useState(false)

  const ventasActivas = ventas.filter((v) => v.estado === 'activa')
  const totalDia = ventasActivas.reduce((s, v) => s + Number(v.total), 0)

  async function handleAnular() {
    if (!anulando) return
    setAnulaPending(true)
    await anularVenta(anulando.id)
    setAnulaPending(false)
    setAnulando(null)
    setDetalleId(null)
  }

  const fechaHoy = new Date().toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <>
      {/* Encabezado */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ventas</h1>
          <p className="text-sm text-gray-400 mt-0.5 capitalize">{fechaHoy}</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva venta
        </button>
      </div>

      {/* Tarjeta resumen del día */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 col-span-2 sm:col-span-1">
          <p className="text-xs text-gray-400 mb-1">Total del día</p>
          <p className="text-2xl font-bold text-brand">{fmt(totalDia)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-400 mb-1">Ventas</p>
          <p className="text-xl font-bold text-gray-900">{ventasActivas.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-400 mb-1">Efectivo</p>
          <p className="text-xl font-bold text-gray-900">{fmt(ventasActivas.filter((v) => v.tipo_pago === 'Efectivo').reduce((s, v) => s + Number(v.total), 0))}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-400 mb-1">Transferencia</p>
          <p className="text-xl font-bold text-gray-900">{fmt(ventasActivas.filter((v) => v.tipo_pago === 'Transferencia').reduce((s, v) => s + Number(v.total), 0))}</p>
        </div>
      </div>

      {/* Estado vacío */}
      {ventas.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-light mb-4">
            <svg className="w-7 h-7 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-gray-800 mb-1">Sin ventas hoy</h3>
          <p className="text-sm text-gray-400 mb-6">Registra la primera venta del día</p>
          <button onClick={() => setModalOpen(true)} className="px-5 py-2.5 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark transition-colors">
            Nueva venta
          </button>
        </div>
      )}

      {/* Lista de ventas */}
      {ventas.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pago</th>
                  <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                  <th className="text-center px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                  <th className="px-6 py-3.5 w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {ventas.map((v) => (
                  <tr key={v.id} className={`hover:bg-gray-50/40 transition-colors ${v.estado === 'anulada' ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4 font-medium text-gray-900">#{v.numero_documento}</td>
                    <td className="px-6 py-4 text-gray-700">{v.clientes?.nombre ?? 'Consumidor Final'}</td>
                    <td className="px-6 py-4 text-gray-500">{v.tipo_documento}</td>
                    <td className="px-6 py-4 text-gray-500">{v.tipo_pago}</td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">{fmt(v.total)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-lg capitalize ${ESTADO_BADGE[v.estado] ?? 'bg-gray-100 text-gray-600'}`}>
                        {v.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setDetalleId(v.id)}
                        className="p-1.5 text-gray-400 hover:text-brand hover:bg-brand-light rounded-lg transition-colors"
                        title="Ver detalle"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tarjetas móvil */}
          <div className="md:hidden divide-y divide-gray-100">
            {ventas.map((v) => (
              <div
                key={v.id}
                onClick={() => setDetalleId(v.id)}
                className={`p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-gray-50 transition-colors ${v.estado === 'anulada' ? 'opacity-50' : ''}`}
              >
                <div>
                  <p className="font-medium text-gray-900">#{v.numero_documento} · {v.clientes?.nombre ?? 'Consumidor Final'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{v.tipo_pago} · {v.tipo_documento}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{fmt(v.total)}</p>
                  <span className={`text-xs font-semibold capitalize ${v.estado === 'anulada' ? 'text-red-400' : 'text-green-600'}`}>{v.estado}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal nueva venta */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-gray-100 p-6 max-h-[95vh] overflow-y-auto">
            <FormVenta
              clientes={clientes} servicios={servicios}
              ivaAplica={ivaAplica} nextNumero={nextNumero} hoy={hoy}
              onClose={() => setModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Modal detalle */}
      {detalleId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDetalleId(null)} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-6 max-h-[90vh] overflow-y-auto">
            <ModalDetalle
              ventaId={detalleId}
              onClose={() => setDetalleId(null)}
              onAnular={(v) => setAnulando(v)}
            />
          </div>
        </div>
      )}

      {/* Modal anular */}
      {anulando && (
        <ModalAnular
          venta={anulando}
          onConfirm={handleAnular}
          onCancel={() => setAnulando(null)}
          pending={anulaPending}
        />
      )}
    </>
  )
}
