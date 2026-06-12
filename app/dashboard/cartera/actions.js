'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getProfile } from '@/lib/getProfile'

export async function pagarCartera(carteraId, monto, tipoPago) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }

  const { data: result, error } = await supabaseAdmin.rpc('registrar_pago_cartera', {
    p_cartera_id: carteraId,
    p_tenant_id: profile.tenant_id,
    p_monto: parseFloat(monto),
    p_tipo_pago: tipoPago || 'Efectivo',
  })

  if (error) return { error: error.message }
  if (result?.error) return { error: result.error }

  revalidatePath('/dashboard/cartera')
  revalidatePath('/dashboard/caja')
  return { success: true, estado: result?.estado, saldo: result?.saldo }
}
