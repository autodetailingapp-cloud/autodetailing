import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/getProfile'
import { getDatosTributario } from './actions'
import Sidebar from '../Sidebar'
import TributarioUI from './TributarioUI'

export const metadata = { title: 'Informe Tributario SRI — AutoDetailing Manager' }

export default async function TributarioPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')
  if (!['admin', 'lectura'].includes(profile.rol)) redirect('/dashboard')

  const ano = new Date().getFullYear()
  const datos = await getDatosTributario(ano)

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-y-auto">
        <div className="px-6 lg:px-10 py-8 pt-16 lg:pt-8 max-w-4xl mx-auto">
          <TributarioUI datos={datos} anoInicial={ano} />
        </div>
      </main>
    </div>
  )
}
