import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/getProfile'
import { getDashboardExecutiveData } from '@/lib/dashboard/getDashboardData'
import Sidebar from '../dashboard/Sidebar'
import DashboardUI from './DashboardUI'

export const metadata = { title: 'Dashboard Ejecutivo — AutoDetailing Manager' }

export default async function DashboardEjecutivoPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const datos = await getDashboardExecutiveData(profile.tenant_id)

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-y-auto">
        <div className="px-6 lg:px-10 py-8 pt-16 lg:pt-8 max-w-6xl mx-auto">
          <DashboardUI datos={datos} />
        </div>
      </main>
    </div>
  )
}
