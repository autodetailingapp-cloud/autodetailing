import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getProfile } from '@/lib/getProfile'
import Sidebar from '../Sidebar'
import ComprasUI from './ComprasUI'

export const metadata = { title: 'Compras — AutoDetailing Manager' }

export default async function ComprasPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const now = new Date()
  const primerDiaMes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const hoy = now.toISOString().split('T')[0]

  const { data: compras } = await supabaseAdmin
    .from('compras')
    .select('*')
    .eq('tenant_id', profile.tenant_id)
    .gte('fecha', primerDiaMes)
    .lte('fecha', hoy)
    .order('fecha', { ascending: false })

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-y-auto">
        <div className="px-6 lg:px-10 py-8 pt-16 lg:pt-8 max-w-5xl mx-auto">
          <ComprasUI compras={compras ?? []} hoy={hoy} />
        </div>
      </main>
    </div>
  )
}
