import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import Sidebar from './Sidebar'

async function getProfile() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('sb-access-token')?.value

  if (!accessToken) return null

  // Valida el JWT y obtiene el usuario sin depender de setSession ni RLS
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(accessToken)
  if (userError || !user) return null

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*, tenants(*)')
    .eq('id', user.id)
    .single()

  return profile
}

const PLAN_CONFIG = {
  emprendedor: { label: 'Emprendedor', className: 'bg-brand-light text-brand' },
  pro:         { label: 'Pro',         className: 'bg-accent/10 text-accent' },
  premium:     { label: 'Premium',     className: 'bg-yellow-50 text-yellow-700' },
}

const STAT_CARDS = [
  {
    label: 'Servicios hoy',
    value: '—',
    bg: 'bg-brand-light',
    color: 'text-brand',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    label: 'Clientes del mes',
    value: '—',
    bg: 'bg-blue-50',
    color: 'text-blue-600',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    label: 'Ingresos del mes',
    value: '$—',
    bg: 'bg-yellow-50',
    color: 'text-yellow-700',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: 'Pendientes',
    value: '—',
    bg: 'bg-red-50',
    color: 'text-red-500',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
]

const QUICK_LINKS = [
  {
    label: 'Nuevo servicio',
    href: '/dashboard/servicios/nuevo',
    desc: 'Registrar un lavado',
    icon: (
      <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  {
    label: 'Nuevo cliente',
    href: '/dashboard/clientes/nuevo',
    desc: 'Agregar cliente',
    icon: (
      <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
  },
  {
    label: 'Ver reportes',
    href: '/dashboard/reportes',
    desc: 'Estadísticas y resumen',
    icon: (
      <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
]

export default async function DashboardPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const tenant = profile.tenants
  const plan = PLAN_CONFIG[tenant?.plan] ?? PLAN_CONFIG.emprendedor
  const fechaHoy = new Date().toLocaleDateString('es-EC', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const nombreCorto = profile.nombre?.split(' ')[0] ?? 'Usuario'

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar profile={profile} />

      <main className="flex-1 overflow-y-auto">
        <div className="px-6 lg:px-10 py-8 pt-16 lg:pt-8 max-w-5xl mx-auto space-y-8">

          {/* Cabecera */}
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Hola, {nombreCorto} 👋
              </h1>
              <p className="text-sm text-gray-400 mt-0.5 capitalize">{fechaHoy}</p>
            </div>

            {tenant && (
              <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-brand-light flex items-center justify-center">
                  <svg className="w-4 h-4 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 leading-tight">{tenant.nombre}</p>
                  <p className="text-xs text-gray-400 leading-tight">RUC: {tenant.ruc_cedula}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${plan.className}`}>
                  {plan.label}
                </span>
              </div>
            )}
          </div>

          {/* Tarjetas de estadísticas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STAT_CARDS.map((stat) => (
              <div
                key={stat.label}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
              >
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-4`}>
                  <span className={stat.color}>{stat.icon}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Acceso rápido */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Acceso rápido
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {QUICK_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm hover:bg-gray-50 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-gray-50 group-hover:bg-white flex items-center justify-center flex-shrink-0 transition-colors">
                    {link.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{link.label}</p>
                    <p className="text-xs text-gray-400">{link.desc}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Info del tenant */}
          {tenant && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
              <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
                <div>
                  <span className="text-gray-400 text-xs">Régimen SRI</span>
                  <p className="font-medium text-gray-800">{tenant.regimen_sri}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-xs">Teléfono</span>
                  <p className="font-medium text-gray-800">{tenant.telefono ?? '—'}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-xs">Dirección</span>
                  <p className="font-medium text-gray-800">{tenant.direccion ?? '—'}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-xs">Estado</span>
                  <p className="font-medium text-brand capitalize">{tenant.estado}</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
