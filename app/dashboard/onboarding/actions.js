'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getProfile } from '@/lib/getProfile'

export async function actualizarNegocioOnboarding(formData) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }

  const logo = formData.get('logo')

  // Nombre, RUC/cédula, teléfono, dirección y régimen SRI ya se capturaron en el
  // registro (app/registro/page.js → registrarAction). Este paso solo confirma esos
  // datos (solo lectura) y agrega el logo, que es lo único genuinamente nuevo aquí.
  const update = { onboarding_paso: 1 }

  if (logo instanceof File && logo.size > 0) {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets()
    const logosBucket = buckets?.find((b) => b.name === 'logos')
    if (!logosBucket) {
      await supabaseAdmin.storage.createBucket('logos', {
        public: true,
        fileSizeLimit: 2097152,
      })
    }

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
    .update({ onboarding_completado: true, onboarding_paso: 7 })
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

export async function listarClientesOnboarding() {
  const profile = await getProfile()
  if (!profile) return []
  const { data } = await supabaseAdmin
    .from('clientes')
    .select('id, nombre, tipo_documento, ruc_cedula, telefono, email')
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
    .select('id, nombre, categoria, valor_adquisicion, fecha_adquisicion')
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
  if (!profile) return { servicios: 0, clientes: 0, colaboradores: 0, activos: 0, insumos: 0 }

  const tenantId = profile.tenant_id
  const [servicios, clientes, colaboradores, activos, insumos] = await Promise.all([
    supabaseAdmin.from('servicios').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('activo', true),
    supabaseAdmin.from('clientes').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('activo', true),
    supabaseAdmin.from('colaboradores').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('activo', true),
    supabaseAdmin.from('activos_fijos').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('activo', true),
    supabaseAdmin.from('insumos').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('activo', true),
  ])

  return {
    servicios: servicios.count ?? 0,
    clientes: clientes.count ?? 0,
    colaboradores: colaboradores.count ?? 0,
    activos: activos.count ?? 0,
    insumos: insumos.count ?? 0,
  }
}
