'use client'

import { useState, useEffect, useTransition } from 'react'
import { crearServicio, eliminarServicio } from '../servicios/actions'
import { crearCliente, eliminarCliente } from '../clientes/actions'
import { crearColaborador, eliminarColaborador } from '../nomina/actions'
import { crearActivo, eliminarActivo } from '../activos/actions'
import { crearInsumo, eliminarInsumo } from '../inventario/actions'
import { CATEGORIAS_SRI } from '../activos/ActivosUI'
import {
  actualizarNegocioOnboarding, avanzarPasoOnboarding, completarOnboarding,
  listarServiciosOnboarding, listarClientesOnboarding, listarColaboradoresOnboarding,
  listarActivosOnboarding, listarInsumosOnboarding, obtenerResumenOnboarding,
} from './actions'

const INPUT = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent'
const SELECT = INPUT + ' bg-white'
const fmt = (n) => `$${Number(n ?? 0).toFixed(2)}`

const TITULOS = [
  'Bienvenida',
  'Configura tus servicios',
  'Agrega tus clientes',
  'Configura tu inventario básico',
  'Agrega tus colaboradores',
  'Registra tus equipos',
  '¡Listo para empezar!',
]

// ——— Paso 1: Bienvenida ———
function PasoBienvenida({ tenant, onNext }) {
  const [logo, setLogo] = useState(null)
  const [error, setError] = useState(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    const fd = new FormData()
    if (logo) fd.set('logo', logo)

    startTransition(async () => {
      const result = await actualizarNegocioOnboarding(fd)
      if (result?.error) { setError(result.error); return }
      onNext(1)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-500">Estos son los datos de tu negocio, ya registrados. Si algo está mal, puedes actualizarlo más adelante.</p>
      {error && <p className="px-3.5 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{error}</p>}

      <div className="space-y-1 px-4 py-3 bg-gray-50 rounded-xl text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Negocio</span>
          <span className="font-medium text-gray-800">{tenant.nombre}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">RUC / Cédula</span>
          <span className="font-medium text-gray-800">{tenant.ruc_cedula ?? '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Régimen SRI</span>
          <span className="font-medium text-gray-800">{tenant.regimen_sri ?? '—'}</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Logo del negocio (opcional)</label>
        <input type="file" accept="image/*" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} className={INPUT + ' file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-brand-light file:text-brand file:text-sm'} />
      </div>

      <button type="submit" disabled={isPending} className="w-full py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-sm font-semibold transition-colors disabled:opacity-60">
        {isPending ? 'Guardando...' : 'Siguiente'}
      </button>
    </form>
  )
}

// ——— Paso 2: Servicios ———
const SERVICIOS_SUGERIDOS = [
  { nombre: 'Lavado básico exterior', precio: 5 },
  { nombre: 'Lavado completo', precio: 10 },
  { nombre: 'Lavado + aspirado', precio: 15 },
  { nombre: 'Detailing básico', precio: 40 },
  { nombre: 'Protección cerámica', precio: 120 },
]

function PasoServicios({ onNext }) {
  const [lista, setLista] = useState([])
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')
  const [error, setError] = useState(null)
  const [isPending, startTransition] = useTransition()

  function cargar() { listarServiciosOnboarding().then(setLista) }
  useEffect(() => { cargar() }, [])

  function agregar(n, p) {
    setError(null)
    const fd = new FormData()
    fd.set('nombre', n)
    fd.set('precio', String(p))
    startTransition(async () => {
      const result = await crearServicio(null, fd)
      if (result?.error) { setError(result.error); return }
      setNombre(''); setPrecio('')
      cargar()
    })
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!nombre.trim() || !precio) { setError('Nombre y precio son requeridos'); return }
    agregar(nombre.trim(), parseFloat(precio) || 0)
  }

  function handleEliminar(id) {
    startTransition(async () => { await eliminarServicio(id); cargar() })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Define los servicios que ofreces y sus precios.</p>
      {error && <p className="px-3.5 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{error}</p>}

      <form onSubmit={handleSubmit} className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">Nombre del servicio</label>
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Lavado premium" className={INPUT} />
        </div>
        <div className="w-28">
          <label className="block text-xs font-medium text-gray-500 mb-1">Precio</label>
          <input type="number" min="0" step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="0.00" className={INPUT} />
        </div>
        <button type="submit" disabled={isPending} className="px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-sm font-semibold transition-colors disabled:opacity-60">
          Agregar
        </button>
      </form>

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Ejemplos sugeridos</p>
        <div className="flex flex-wrap gap-2">
          {SERVICIOS_SUGERIDOS.map((s) => (
            <button
              key={s.nombre} type="button" disabled={isPending}
              onClick={() => agregar(s.nombre, s.precio)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-brand hover:text-brand transition-colors"
            >
              + {s.nombre} {fmt(s.precio)}
            </button>
          ))}
        </div>
      </div>

      {lista.length > 0 && (
        <div className="space-y-1.5">
          {lista.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-4 py-2.5 bg-gray-50 rounded-xl text-sm">
              <span className="font-medium text-gray-800">{s.nombre}</span>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-900">{fmt(s.precio)}</span>
                <button type="button" onClick={() => handleEliminar(s.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button" disabled={lista.length === 0}
        onClick={() => onNext(2)}
        className="w-full py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Siguiente {lista.length === 0 && '(agrega al menos 1 servicio)'}
      </button>
    </div>
  )
}

// ——— Paso: Clientes ———
const TIPOS_DOC_CLIENTE = ['Cédula', 'RUC']

function PasoClientes({ onNext, onSkip }) {
  const [lista, setLista] = useState([])
  const [nombre, setNombre] = useState('')
  const [tipoDocumento, setTipoDocumento] = useState('Cédula')
  const [rucCedula, setRucCedula] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [isPending, startTransition] = useTransition()

  function cargar() { listarClientesOnboarding().then(setLista) }
  useEffect(() => { cargar() }, [])

  function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!nombre.trim() || !rucCedula.trim()) { setError('Nombre e identificación son requeridos'); return }
    const fd = new FormData()
    fd.set('nombre', nombre.trim())
    fd.set('tipo_documento', tipoDocumento)
    fd.set('ruc_cedula', rucCedula.trim())
    fd.set('telefono', telefono.trim())
    fd.set('email', email.trim())
    // Consumidor Final es el tipo de contribuyente por defecto para clientes cargados
    // rápido en el onboarding; se puede afinar luego desde el módulo Clientes.
    fd.set('tipo_contribuyente', 'Consumidor Final')
    startTransition(async () => {
      const result = await crearCliente(null, fd)
      if (result?.error) { setError(result.error); return }
      setNombre(''); setRucCedula(''); setTelefono(''); setEmail('')
      cargar()
    })
  }

  function handleEliminar(id) {
    startTransition(async () => { await eliminarCliente(id); cargar() })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Registra los clientes frecuentes de tu negocio (opcional — puedes vender a "Consumidor Final" sin registrar a nadie).</p>
      {error && <p className="px-3.5 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-2">
        <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre completo" className={INPUT} />
        <div className="grid grid-cols-2 gap-2">
          <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)} className={SELECT}>
            {TIPOS_DOC_CLIENTE.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input type="text" value={rucCedula} onChange={(e) => setRucCedula(e.target.value)} placeholder="Identificación" className={INPUT} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Teléfono (opcional)" className={INPUT} />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (opcional)" className={INPUT} />
        </div>
        <button type="submit" disabled={isPending} className="w-full py-2 rounded-xl bg-brand hover:bg-brand-dark text-white text-sm font-semibold transition-colors disabled:opacity-60">
          Agregar cliente
        </button>
      </form>

      {lista.length > 0 && (
        <div className="space-y-1.5">
          {lista.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-4 py-2.5 bg-gray-50 rounded-xl text-sm">
              <div>
                <p className="font-medium text-gray-800">{c.nombre}</p>
                <p className="text-xs text-gray-400">{c.tipo_documento}: {c.ruc_cedula}{c.telefono ? ` · ${c.telefono}` : ''}</p>
              </div>
              <button type="button" onClick={() => handleEliminar(c.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={() => onSkip(3)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          Saltar este paso
        </button>
        <button type="button" onClick={() => onNext(3)} className="flex-1 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-sm font-semibold transition-colors">
          Siguiente
        </button>
      </div>
    </div>
  )
}

// ——— Paso: Colaboradores ———
function PasoColaboradores({ onNext, onSkip }) {
  const [lista, setLista] = useState([])
  const [nombre, setNombre] = useState('')
  const [cargo, setCargo] = useState('')
  const [salario, setSalario] = useState('')
  const [dias, setDias] = useState('5')
  const [error, setError] = useState(null)
  const [isPending, startTransition] = useTransition()

  function cargar() { listarColaboradoresOnboarding().then(setLista) }
  useEffect(() => { cargar() }, [])

  function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!nombre.trim() || !salario) { setError('Nombre y salario por día son requeridos'); return }
    const fd = new FormData()
    fd.set('nombre', nombre.trim())
    fd.set('cargo', cargo.trim())
    fd.set('salario_dia', salario)
    fd.set('dias_semana', dias)
    startTransition(async () => {
      const result = await crearColaborador(null, fd)
      if (result?.error) { setError(result.error); return }
      setNombre(''); setCargo(''); setSalario(''); setDias('5')
      cargar()
    })
  }

  function handleEliminar(id) {
    startTransition(async () => { await eliminarColaborador(id); cargar() })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">¿Quiénes trabajan contigo?</p>
      {error && <p className="px-3.5 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" className={INPUT} />
          <input type="text" value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Cargo" className={INPUT} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input type="number" min="0" step="0.01" value={salario} onChange={(e) => setSalario(e.target.value)} placeholder="Salario por día" className={INPUT} />
          <select value={dias} onChange={(e) => setDias(e.target.value)} className={SELECT}>
            {[5, 6, 7].map((d) => <option key={d} value={d}>{d} días/semana</option>)}
          </select>
        </div>
        <button type="submit" disabled={isPending} className="w-full py-2 rounded-xl bg-brand hover:bg-brand-dark text-white text-sm font-semibold transition-colors disabled:opacity-60">
          Agregar colaborador
        </button>
      </form>

      {lista.length > 0 && (
        <div className="space-y-1.5">
          {lista.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-4 py-2.5 bg-gray-50 rounded-xl text-sm">
              <div>
                <p className="font-medium text-gray-800">{c.nombre}</p>
                <p className="text-xs text-gray-400">{c.cargo || 'Sin cargo'} · {fmt(c.salario_dia)}/día · {c.dias_semana} días/sem</p>
              </div>
              <button type="button" onClick={() => handleEliminar(c.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={() => onSkip(5)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          Saltar este paso
        </button>
        <button type="button" onClick={() => onNext(5)} className="flex-1 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-sm font-semibold transition-colors">
          Siguiente
        </button>
      </div>
    </div>
  )
}

// ——— Paso: Activos fijos ———
const ACTIVOS_SUGERIDOS = ['Aspiradora industrial', 'Lavadora a presión', 'Pulidora orbital']

function PasoActivos({ onNext, onSkip }) {
  const [lista, setLista] = useState([])
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState('')
  const [valor, setValor] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [error, setError] = useState(null)
  const [isPending, startTransition] = useTransition()

  function cargar() { listarActivosOnboarding().then(setLista) }
  useEffect(() => { cargar() }, [])

  function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!nombre.trim() || !categoria || !valor) { setError('Nombre, categoría y valor son requeridos'); return }
    const cat = CATEGORIAS_SRI.find((c) => c.value === categoria)
    const fd = new FormData()
    fd.set('nombre', nombre.trim())
    fd.set('categoria', categoria)
    fd.set('valor_adquisicion', valor)
    fd.set('fecha_compra', fecha)
    fd.set('vida_util_anos', String(cat?.anos ?? 5))
    startTransition(async () => {
      const result = await crearActivo(null, fd)
      if (result?.error) { setError(result.error); return }
      setNombre(''); setCategoria(''); setValor('')
      cargar()
    })
  }

  function handleEliminar(id) {
    startTransition(async () => { await eliminarActivo(id); cargar() })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">¿Qué equipos tienes en tu lavadero?</p>
      {error && <p className="px-3.5 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-2">
        <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del equipo" className={INPUT} />
        <div className="grid grid-cols-2 gap-2">
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={SELECT}>
            <option value="" disabled>Categoría SRI</option>
            {CATEGORIAS_SRI.map((c) => <option key={c.value} value={c.value}>{c.value}</option>)}
          </select>
          <input type="number" min="0" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Valor de adquisición" className={INPUT} />
        </div>
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={INPUT} />
        <button type="submit" disabled={isPending} className="w-full py-2 rounded-xl bg-brand hover:bg-brand-dark text-white text-sm font-semibold transition-colors disabled:opacity-60">
          Agregar equipo
        </button>
      </form>

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Ejemplos sugeridos</p>
        <div className="flex flex-wrap gap-2">
          {ACTIVOS_SUGERIDOS.map((n) => (
            <button
              key={n} type="button" onClick={() => setNombre(n)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-brand hover:text-brand transition-colors"
            >
              + {n}
            </button>
          ))}
        </div>
      </div>

      {lista.length > 0 && (
        <div className="space-y-1.5">
          {lista.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-4 py-2.5 bg-gray-50 rounded-xl text-sm">
              <div>
                <p className="font-medium text-gray-800">{a.nombre}</p>
                <p className="text-xs text-gray-400">{a.categoria} · {fmt(a.valor_adquisicion)}</p>
              </div>
              <button type="button" onClick={() => handleEliminar(a.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={() => onSkip(6)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          Saltar este paso
        </button>
        <button type="button" onClick={() => onNext(6)} className="flex-1 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-sm font-semibold transition-colors">
          Siguiente
        </button>
      </div>
    </div>
  )
}

// ——— Paso: Inventario ———
const INSUMOS_SUGERIDOS = [
  { nombre: 'Shampoo para autos', unidad: 'litros' },
  { nombre: 'Cera carnauba', unidad: 'kg' },
  { nombre: 'Desengrasante', unidad: 'litros' },
  { nombre: 'Microfibras', unidad: 'unidades' },
]

function PasoInventario({ onNext }) {
  const [lista, setLista] = useState([])
  const [nombre, setNombre] = useState('')
  const [unidad, setUnidad] = useState('')
  const [stockActual, setStockActual] = useState('')
  const [stockMinimo, setStockMinimo] = useState('')
  const [costo, setCosto] = useState('')
  const [error, setError] = useState(null)
  const [isPending, startTransition] = useTransition()

  function cargar() { listarInsumosOnboarding().then(setLista) }
  useEffect(() => { cargar() }, [])

  function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!nombre.trim() || !unidad.trim()) { setError('Nombre y unidad de medida son requeridos'); return }
    const fd = new FormData()
    fd.set('nombre', nombre.trim())
    fd.set('unidad_medida', unidad.trim())
    fd.set('stock_actual', stockActual || '0')
    fd.set('stock_minimo', stockMinimo || '0')
    fd.set('costo_unitario', costo || '0')
    startTransition(async () => {
      const result = await crearInsumo(null, fd)
      if (result?.error) { setError(result.error); return }
      setNombre(''); setUnidad(''); setStockActual(''); setStockMinimo(''); setCosto('')
      cargar()
    })
  }

  function handleEliminar(id) {
    startTransition(async () => { await eliminarInsumo(id); cargar() })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">¿Qué productos usas para lavar?</p>
      {error && <p className="px-3.5 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del insumo" className={INPUT} />
          <input type="text" value={unidad} onChange={(e) => setUnidad(e.target.value)} placeholder="Unidad (litros, kg...)" className={INPUT} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <input type="number" min="0" step="0.01" value={stockActual} onChange={(e) => setStockActual(e.target.value)} placeholder="Stock inicial" className={INPUT} />
          <input type="number" min="0" step="0.01" value={stockMinimo} onChange={(e) => setStockMinimo(e.target.value)} placeholder="Stock mínimo" className={INPUT} />
          <input type="number" min="0" step="0.01" value={costo} onChange={(e) => setCosto(e.target.value)} placeholder="Costo unitario" className={INPUT} />
        </div>
        <button type="submit" disabled={isPending} className="w-full py-2 rounded-xl bg-brand hover:bg-brand-dark text-white text-sm font-semibold transition-colors disabled:opacity-60">
          Agregar insumo
        </button>
      </form>

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Ejemplos sugeridos</p>
        <div className="flex flex-wrap gap-2">
          {INSUMOS_SUGERIDOS.map((s) => (
            <button
              key={s.nombre} type="button"
              onClick={() => { setNombre(s.nombre); setUnidad(s.unidad) }}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-brand hover:text-brand transition-colors"
            >
              + {s.nombre} ({s.unidad})
            </button>
          ))}
        </div>
      </div>

      {lista.length > 0 && (
        <div className="space-y-1.5">
          {lista.map((i) => (
            <div key={i.id} className="flex items-center justify-between px-4 py-2.5 bg-gray-50 rounded-xl text-sm">
              <div>
                <p className="font-medium text-gray-800">{i.nombre}</p>
                <p className="text-xs text-gray-400">{i.stock_actual} {i.unidad_medida} · {fmt(i.costo_unitario)}/u</p>
              </div>
              <button type="button" onClick={() => handleEliminar(i.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button" disabled={lista.length === 0}
        onClick={() => onNext(4)}
        className="w-full py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Siguiente {lista.length === 0 && '(agrega al menos 1 insumo)'}
      </button>
    </div>
  )
}

// ——— Paso: Resumen ———
function PasoResumen() {
  const [resumen, setResumen] = useState(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => { obtenerResumenOnboarding().then(setResumen) }, [])

  function handleFinalizar() {
    startTransition(async () => {
      await completarOnboarding()
      window.location.href = '/dashboard'
    })
  }

  const items = resumen ? [
    { label: 'Servicios creados', value: resumen.servicios },
    { label: 'Clientes registrados', value: resumen.clientes },
    { label: 'Insumos en inventario', value: resumen.insumos },
    { label: 'Colaboradores registrados', value: resumen.colaboradores },
    { label: 'Equipos registrados', value: resumen.activos },
  ] : []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-light mx-auto">
        <svg className="w-7 h-7 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p className="text-center text-sm text-gray-500">Esto es lo que configuraste:</p>

      <div className="grid grid-cols-2 gap-3">
        {items.map((it) => (
          <div key={it.label} className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-brand">{it.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{it.label}</p>
          </div>
        ))}
      </div>

      <button
        type="button" onClick={handleFinalizar} disabled={isPending}
        className="w-full py-3 rounded-xl bg-brand hover:bg-brand-dark text-white text-base font-bold transition-colors disabled:opacity-60"
      >
        {isPending ? 'Preparando tu dashboard...' : 'Ir al dashboard'}
      </button>
    </div>
  )
}

// ——— Wizard principal ———
export default function OnboardingWizard({ tenant }) {
  const ULTIMO_PASO = TITULOS.length - 1
  const pasoInicial = Math.min(Math.max(tenant?.onboarding_paso ?? 0, 0), ULTIMO_PASO)
  const [paso, setPaso] = useState(pasoInicial)

  if (!tenant || tenant.onboarding_completado) return null

  function avanzar(siguiente) {
    setPaso(siguiente)
    if (siguiente < ULTIMO_PASO) avanzarPasoOnboarding(siguiente)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 p-6 max-h-[95vh] overflow-y-auto">
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-brand uppercase tracking-wide">Paso {paso + 1} de {TITULOS.length}</p>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-brand transition-all duration-300" style={{ width: `${((paso + 1) / TITULOS.length) * 100}%` }} />
          </div>
          <h2 className="text-lg font-bold text-gray-900">{TITULOS[paso]}</h2>
        </div>

        {paso === 0 && <PasoBienvenida tenant={tenant} onNext={avanzar} />}
        {paso === 1 && <PasoServicios onNext={avanzar} />}
        {paso === 2 && <PasoClientes onNext={avanzar} onSkip={avanzar} />}
        {paso === 3 && <PasoInventario onNext={avanzar} />}
        {paso === 4 && <PasoColaboradores onNext={avanzar} onSkip={avanzar} />}
        {paso === 5 && <PasoActivos onNext={avanzar} onSkip={avanzar} />}
        {paso === 6 && <PasoResumen />}
      </div>
    </div>
  )
}
