import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getProfile } from '@/lib/getProfile'
import Sidebar from '../Sidebar'
import ClientesUI from './ClientesUI'

export const metadata = { title: 'Clientes — AutoDetailing Manager' }

export default async function ClientesPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const { data: clientes } = await supabaseAdmin
    .from('clientes')
    .select('id, nombre, ruc_cedula, tipo_documento, email, telefono, tipo_contribuyente, plazo_credito, limite_credito, activo')
    .eq('tenant_id', profile.tenant_id)
    .order('nombre')

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-y-auto">
        <div className="px-6 lg:px-10 py-8 pt-16 lg:pt-8 max-w-5xl mx-auto">
          <ClientesUI clientes={clientes ?? []} />
        </div>
      </main>
    </div>
  )
}
