'use client'

import { useState, useTransition } from 'react'
import { invitarUsuario, toggleUsuario } from './actions'

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'cajero', label: 'Cajero' },
  { value: 'lectura', label: 'Solo lectura' },
]

const ROL_LABEL = Object.fromEntries(ROLES.map((r) => [r.value, r.label]))

const fmtFecha = (s) =>
  s ? new Date(s).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

// ——— Modal invitar usuario ———
function ModalInvitar({ onClose }) {
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [rol, setRol] = useState('cajero')
  const [error, setError] = useState(null)
  const [credenciales, setCredenciales] = useState(null)
  const [copiado, setCopiado] = useState(false)
  const [isPending, startTransition] = useTransition()

  const INPUT = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent'
  const SELECT = INPUT + ' bg-white'

  function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    const fd = new FormData()
    fd.set('email', email)
    fd.set('nombre', nombre)
    fd.set('rol', rol)
    startTransition(async () => {
      const result = await invitarUsuario(null, fd)
      if (result?.error) { setError(result.error); return }
      setCredenciales({ email: result.email, password: result.tempPassword })
    })
  }

  function copiar() {
    const texto = `Email: ${credenciales.email}\nContraseña temporal: ${credenciales.password}`
    navigator.clipboard?.writeText(texto)
    setCopiado(true)
  }

  if (credenciales) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 p-6 space-y-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-green-50 mx-auto">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="text-center">
            <h3 className="text-base font-bold text-gray-900">Usuario creado</h3>
            <p className="text-sm text-gray-500 mt-1">
              Aún no hay un servicio de correo configurado, así que comparte estas credenciales manualmente. El usuario podrá cambiar su contraseña al entrar.
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 text-sm font-mono">
            <p><span className="text-gray-400">Email:</span> {credenciales.email}</p>
            <p><span className="text-gray-400">Contraseña:</span> {credenciales.password}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={copiar} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              {copiado ? 'Copiado ✓' : 'Copiar'}
            </button>
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-sm font-semibold transition-colors">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-bold text-gray-900">Invitar usuario</h2>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && <p className="px-3.5 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{error}</p>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre <span className="text-red-500">*</span></label>
            <input type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre completo" className={INPUT} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email <span className="text-red-500">*</span></label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" className={INPUT} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Rol <span className="text-red-500">*</span></label>
            <select value={rol} onChange={(e) => setRol(e.target.value)} className={SELECT}>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isPending} className="flex-1 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-sm font-semibold transition-colors disabled:opacity-60">
              {isPending ? 'Creando...' : 'Invitar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function UsuariosUI({ usuarios, usuarioActualId }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [error, setError] = useState(null)
  const [isPending, startTransition] = useTransition()

  function handleToggle(usuario) {
    setError(null)
    startTransition(async () => {
      const result = await toggleUsuario(usuario.id, !usuario.activo)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-400 mt-0.5">Gestiona quién tiene acceso a tu cuenta</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Invitar usuario
        </button>
      </div>

      {error && <p className="mb-4 px-3.5 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{error}</p>}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rol</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Desde</th>
                <th className="text-center px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="px-6 py-3.5 w-32" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {usuarios.map((u) => (
                <tr key={u.id} className={`hover:bg-gray-50/40 transition-colors ${!u.activo ? 'opacity-50' : ''}`}>
                  <td className="px-6 py-4 font-medium text-gray-900">{u.nombre} {u.id === usuarioActualId && <span className="text-xs text-gray-400">(tú)</span>}</td>
                  <td className="px-6 py-4 text-gray-500">{u.email}</td>
                  <td className="px-6 py-4 text-gray-700">{ROL_LABEL[u.rol] ?? u.rol}</td>
                  <td className="px-6 py-4 text-gray-500">{fmtFecha(u.created_at)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-lg ${u.activo ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-500'}`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {u.id !== usuarioActualId && (
                      <button
                        onClick={() => handleToggle(u)} disabled={isPending}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                          u.activo ? 'text-red-500 hover:bg-red-50' : 'text-brand hover:bg-brand-light'
                        }`}
                      >
                        {u.activo ? 'Desactivar' : 'Reactivar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-gray-100">
          {usuarios.map((u) => (
            <div key={u.id} className={`p-4 flex items-center justify-between gap-3 ${!u.activo ? 'opacity-50' : ''}`}>
              <div>
                <p className="font-medium text-gray-900">{u.nombre} {u.id === usuarioActualId && <span className="text-xs text-gray-400">(tú)</span>}</p>
                <p className="text-xs text-gray-400 mt-0.5">{u.email}</p>
                <p className="text-xs text-gray-400">{ROL_LABEL[u.rol] ?? u.rol}</p>
              </div>
              {u.id !== usuarioActualId && (
                <button
                  onClick={() => handleToggle(u)} disabled={isPending}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                    u.activo ? 'text-red-500 hover:bg-red-50' : 'text-brand hover:bg-brand-light'
                  }`}
                >
                  {u.activo ? 'Desactivar' : 'Reactivar'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {modalOpen && <ModalInvitar onClose={() => setModalOpen(false)} />}
    </>
  )
}
