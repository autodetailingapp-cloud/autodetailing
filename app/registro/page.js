'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { registrarAction } from '../actions/auth'

const PLANES = [
  {
    value: 'emprendedor',
    label: 'Emprendedor',
    precio: '$18',
    periodo: '/mes',
    desc: 'Hasta 2 usuarios',
    color: 'brand',
  },
  {
    value: 'pro',
    label: 'Pro',
    precio: '$45',
    periodo: '/mes',
    desc: 'Hasta 5 usuarios',
    color: 'accent',
    popular: true,
  },
  {
    value: 'premium',
    label: 'Premium',
    precio: '$85',
    periodo: '/mes',
    desc: 'Usuarios ilimitados',
    color: 'accent',
  },
]

const REGIMENES = [
  { value: 'RIMPE Popular', label: 'RIMPE Popular' },
  { value: 'RIMPE Emprendedor', label: 'RIMPE Emprendedor' },
  { value: 'RUC General', label: 'RUC General' },
]

function FieldInput({ id, name, label, required, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={id}
        name={name}
        required={required}
        {...props}
        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-colors bg-white"
      />
    </div>
  )
}

export default function RegistroPage() {
  const [state, action, pending] = useActionState(registrarAction, undefined)

  if (state?.success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-light mb-5">
            <svg className="w-8 h-8 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Registro exitoso</h2>
          <p className="text-gray-500 text-sm leading-relaxed">{state.message}</p>
          <Link
            href="/login"
            className="inline-block mt-6 px-6 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-sm font-semibold transition-colors"
          >
            Ir al login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="w-full max-w-2xl mx-auto">

        {/* Cabecera */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand mb-4 shadow-md">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">AutoDetailing Manager</h1>
          <p className="text-gray-400 text-sm mt-1">Registra tu lavadero y comienza hoy</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

          {state?.error && (
            <div className="mb-6 flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {state.error}
            </div>
          )}

          <form action={action} className="space-y-5">

            {/* Sección: datos del negocio */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Datos del negocio
              </h3>
              <div className="space-y-4">
                <FieldInput
                  id="nombre"
                  name="nombre"
                  label="Nombre del negocio"
                  required
                  type="text"
                  placeholder="Ej: Lavadero El Brillante"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldInput
                    id="ruc_cedula"
                    name="ruc_cedula"
                    label="RUC / Cédula"
                    required
                    type="text"
                    placeholder="0912345678001"
                    maxLength={13}
                  />
                  <FieldInput
                    id="telefono"
                    name="telefono"
                    label="Teléfono"
                    required
                    type="tel"
                    placeholder="0991234567"
                  />
                </div>

                <FieldInput
                  id="direccion"
                  name="direccion"
                  label="Dirección"
                  type="text"
                  placeholder="Av. Principal 123, Guayaquil"
                />

                <div>
                  <label htmlFor="regimen_sri" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Régimen tributario SRI <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="regimen_sri"
                    name="regimen_sri"
                    required
                    defaultValue=""
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-colors bg-white"
                  >
                    <option value="" disabled>Selecciona el régimen</option>
                    {REGIMENES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Sección: datos de acceso */}
            <div className="border-t border-gray-100 pt-5">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Datos de acceso
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldInput
                  id="email"
                  name="email"
                  label="Correo electrónico"
                  required
                  type="email"
                  placeholder="correo@ejemplo.com"
                  autoComplete="email"
                />
                <FieldInput
                  id="password"
                  name="password"
                  label="Contraseña"
                  required
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
            </div>

            {/* Sección: plan */}
            <div className="border-t border-gray-100 pt-5">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Elige tu plan <span className="text-red-500 normal-case font-normal">*</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PLANES.map((plan) => (
                  <label key={plan.value} className="relative cursor-pointer block">
                    <input
                      type="radio"
                      name="plan"
                      value={plan.value}
                      required
                      className="sr-only peer"
                    />
                    {plan.popular && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-accent text-white text-xs font-semibold px-2.5 py-0.5 rounded-full z-10">
                        Popular
                      </span>
                    )}
                    <div className="border-2 border-gray-200 rounded-xl p-4 text-center transition-all hover:border-gray-300 peer-checked:border-brand peer-checked:bg-brand-light">
                      <p className="text-sm font-semibold text-gray-800">{plan.label}</p>
                      <p className="mt-2">
                        <span className="text-2xl font-bold text-gray-900">{plan.precio}</span>
                        <span className="text-xs text-gray-400">{plan.periodo}</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-1">{plan.desc}</p>
                    </div>
                    {/* Checkmark visible cuando está seleccionado */}
                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full border-2 border-gray-300 peer-checked:border-brand peer-checked:bg-brand hidden peer-checked:flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full py-3 px-4 rounded-xl bg-brand hover:bg-brand-dark text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {pending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creando cuenta...
                </span>
              ) : 'Crear cuenta'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="font-semibold text-brand hover:text-brand-dark transition-colors">
              Iniciar sesión
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          &copy; {new Date().getFullYear()} AutoDetailing Manager &mdash; Ecuador
        </p>
      </div>
    </div>
  )
}
