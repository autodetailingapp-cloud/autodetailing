import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/getProfile'
import { getDatosBalance } from './actions'
import Sidebar from '../Sidebar'
import BalanceUI from './BalanceUI'

export const metadata = { title: 'Balance General — AutoDetailing Manager' }

export default async function BalancePage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')
  if (!['admin', 'lectura'].includes(profile.rol)) redirect('/dashboard')

  const hoy = new Date().toISOString().split('T')[0]
  const datos = await getDatosBalance(hoy)

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-y-auto">
        <div className="px-6 lg:px-10 py-8 pt-16 lg:pt-8 max-w-4xl mx-auto">
          <BalanceUI datos={datos} fechaInicial={hoy} />
        </div>
      </main>
    </div>
  )
}
