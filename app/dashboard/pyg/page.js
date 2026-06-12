import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/getProfile'
import { getDatosPyg } from './actions'
import Sidebar from '../Sidebar'
import PygUI from './PygUI'

export const metadata = { title: 'Estado de Resultados — AutoDetailing Manager' }

export default async function PygPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')
  if (!['admin', 'lectura'].includes(profile.rol)) redirect('/dashboard')

  const hoy = new Date()
  const datos = await getDatosPyg(hoy.getMonth() + 1, hoy.getFullYear())

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-y-auto">
        <div className="px-6 lg:px-10 py-8 pt-16 lg:pt-8 max-w-4xl mx-auto">
          <PygUI datos={datos} mesInicial={hoy.getMonth() + 1} anoInicial={hoy.getFullYear()} />
        </div>
      </main>
    </div>
  )
}
