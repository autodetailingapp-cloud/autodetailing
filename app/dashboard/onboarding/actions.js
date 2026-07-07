'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getProfile } from '@/lib/getProfile'

export async function actualizarNegocioOnboarding(formData) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }

  const direccion = formData.get('direccion')?.toString().trim()
  const telefono = formData.get('telefono')?.toString().trim()
  const regimen_sri = formData.get('regimen_sri')?.toString()
  const logo = formData.get('logo')

  if (!direccion) return { error: 'La dirección es requerida' }
  if (!telefono) return { error: 'El teléfono es requerido' }
  if (!regimen_sri) return { error: 'El régimen SRI es requerido' }

  const update = { direccion, telefono, regimen_sri, onboarding_paso: 1 }

  if (logo instanceof File && logo.size > 0) {
    const ext = logo.name.split('.').pop() || 'png'
    const path = `${profile.tenant_id}.${ext}`
    const { error: uploadErr } = await supabaseAdmin.storage
      .from('logos')
      .upload(path, logo, { upsert: true, contentType: logo.type })

    if (uploadErr) return { error: 'Error al subir el logo: ' + uploadErr.message }

    const { data: publicUrl } = supabaseAdmin.storage.from('logos').getPublicUrl(path)
    update.logo_url = publicUrl.publicUrl
  }

  const { error } = await supabaseAdmin
    .from('tenants')
    .update(update)
    .eq('id', profile.tenant_id)

  if (error) return { error: 'Error al guardar: ' + error.message }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function avanzarPasoOnboarding(paso) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }

  const { error } = await supabaseAdmin
    .from('tenants')
    .update({ onboarding_paso: paso })
    .eq('id', profile.tenant_id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function completarOnboarding() {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }

  const { error } = await supabaseAdmin
    .from('tenants')
    .update({ onboarding_completado: true, onboarding_paso: 6 })
    .eq('id', profile.tenant_id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function listarServiciosOnboarding() {
  const profile = await getProfile()
  if (!profile) return []
  const { data } = await supabaseAdmin
    .from('servicios')
    .select('id, nombre, precio')
    .eq('tenant_id', profile.tenant_id)
    .eq('activo', true)
    .order('created_at')
  return data ?? []
}

export async function listarColaboradoresOnboarding() {
  const profile = await getProfile()
  if (!profile) return []
  const { data } = await supabaseAdmin
    .from('colaboradores')
    .select('id, nombre, cargo, salario_dia, dias_semana')
    .eq('tenant_id', profile.tenant_id)
    .eq('activo', true)
    .order('created_at')
  return data ?? []
}

export async function listarActivosOnboarding() {
  const profile = await getProfile()
  if (!profile) return []
  const { data } = await supabaseAdmin
    .from('activos_fijos')
    .select('id, nombre, categoria, valor_adquisicion, fecha_compra')
    .eq('tenant_id', profile.tenant_id)
    .eq('activo', true)
    .order('created_at')
  return data ?? []
}

export async function listarInsumosOnboarding() {
  const profile = await getProfile()
  if (!profile) return []
  const { data } = await supabaseAdmin
    .from('insumos')
    .select('id, nombre, unidad_medida, stock_actual, costo_unitario')
    .eq('tenant_id', profile.tenant_id)
    .eq('activo', true)
    .order('created_at')
  return data ?? []
}

export async function obtenerResumenOnboarding() {
  const profile = await getProfile()
  if (!profile) return { servicios: 0, colaboradores: 0, activos: 0, insumos: 0 }

  const tenantId = profile.tenant_id
  const [servicios, colaboradores, activos, insumos] = await Promise.all([
    supabaseAdmin.from('servicios').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('activo', true),
    supabaseAdmin.from('colaboradores').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('activo', true),
    supabaseAdmin.from('activos_fijos').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('activo', true),
    supabaseAdmin.from('insumos').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('activo', true),
  ])

  return {
    servicios: servicios.count ?? 0,
    colaboradores: colaboradores.count ?? 0,
    activos: activos.count ?? 0,
    insumos: insumos.count ?? 0,
  }
}
