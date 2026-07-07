import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/getProfile'
import Sidebar from '../Sidebar'

export const metadata = { title: 'Reportes — AutoDetailing Manager' }

const REPORTES_DISPONIBLES = [
  { label: 'Estado de Resultados (P&G)', href: '/dashboard/pyg' },
  { label: 'Balance', href: '/dashboard/balance' },
  { label: 'Flujo de caja', href: '/dashboard/flujo' },
  { label: 'KPI financieros', href: '/dashboard/kpi' },
  { label: 'Tributario SRI', href: '/dashboard/tributario' },
]

export default async function ReportesPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-y-auto">
        <div className="px-6 lg:px-10 py-8 pt-16 lg:pt-8 max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Reportes</h1>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <p className="text-sm text-gray-500 mb-5">
              Un dashboard unificado de reportes está próximamente. Mientras tanto, estos reportes ya están disponibles:
            </p>
            <div className="space-y-2">
              {REPORTES_DISPONIBLES.map((r) => (
                <a
                  key={r.href} href={r.href}
                  className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-800">{r.label}</span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
