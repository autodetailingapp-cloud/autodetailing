import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/getProfile'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import Sidebar from '../Sidebar'
import UsuariosUI from './UsuariosUI'

export const metadata = { title: 'Usuarios — AutoDetailing Manager' }

export default async function UsuariosPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')
  if (profile.rol !== 'admin') redirect('/dashboard')

  const { data: usuarios } = await supabaseAdmin
    .from('profiles')
    .select('id, nombre, email, rol, activo, created_at')
    .eq('tenant_id', profile.tenant_id)
    .order('created_at')

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-y-auto">
        <div className="px-6 lg:px-10 py-8 pt-16 lg:pt-8 max-w-4xl mx-auto">
          <UsuariosUI usuarios={usuarios ?? []} usuarioActualId={profile.id} />
        </div>
      </main>
    </div>
  )
}
