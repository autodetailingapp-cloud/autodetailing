'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getProfile } from '@/lib/getProfile'

export async function crearColaborador(prevState, formData) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }

  const nombre = formData.get('nombre')?.toString().trim()
  const cargo = formData.get('cargo')?.toString().trim() || null
  const salario_dia = parseFloat(formData.get('salario_dia'))
  const dias_semana = parseInt(formData.get('dias_semana') ?? '5')

  if (!nombre) return { error: 'El nombre es requerido' }
  if (isNaN(salario_dia) || salario_dia < 0) return { error: 'El salario diario es inválido' }

  const { error } = await supabaseAdmin.from('colaboradores').insert({
    tenant_id: profile.tenant_id,
    nombre, cargo, salario_dia, dias_semana, activo: true,
  })

  if (error) return { error: 'Error al crear colaborador: ' + error.message }
  revalidatePath('/dashboard/nomina')
  return { success: true }
}

export async function actualizarColaborador(prevState, formData) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }

  const id = formData.get('id')?.toString()
  const nombre = formData.get('nombre')?.toString().trim()
  const cargo = formData.get('cargo')?.toString().trim() || null
  const salario_dia = parseFloat(formData.get('salario_dia'))
  const dias_semana = parseInt(formData.get('dias_semana') ?? '5')

  if (!id || !nombre) return { error: 'Datos inválidos' }

  const { error } = await supabaseAdmin
    .from('colaboradores')
    .update({ nombre, cargo, salario_dia, dias_semana })
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)

  if (error) return { error: 'Error al actualizar: ' + error.message }
  revalidatePath('/dashboard/nomina')
  return { success: true }
}

export async function eliminarColaborador(id) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }

  const { error } = await supabaseAdmin
    .from('colaboradores')
    .update({ activo: false })
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/nomina')
  return { success: true }
}

// Usa RPC para evitar el error de schema cache de tenant_id en asistencia
export async function registrarAsistencia(colaboradorId, fecha, estado) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }

  const { error } = await supabaseAdmin.rpc('upsert_asistencias', {
    p_registros: JSON.stringify([{
      tenant_id: profile.tenant_id,
      colaborador_id: colaboradorId,
      fecha,
      estado,
    }]),
  })

  if (error) return { error: error.message }
  revalidatePath('/dashboard/nomina')
  return { success: true }
}

export async function registrarAsistenciaBulk(registros) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }

  const rows = registros.map((r) => ({
    tenant_id: profile.tenant_id,
    colaborador_id: r.colaborador_id,
    fecha: r.fecha,
    estado: r.estado,
  }))

  const { error } = await supabaseAdmin.rpc('upsert_asistencias', {
    p_registros: JSON.stringify(rows),
  })

  if (error) return { error: error.message }
  revalidatePath('/dashboard/nomina')
  return { success: true }
}

export async function pagarNomina(colaboradorId, monto, descripcion) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }

  const hoy = new Date().toISOString().split('T')[0]

  const { data: caja } = await supabaseAdmin
    .from('caja_diaria').select('cerrado')
    .eq('tenant_id', profile.tenant_id).eq('fecha', hoy).maybeSingle()

  if (caja?.cerrado) return { error: 'La caja de hoy ya está cerrada' }

  const { error } = await supabaseAdmin.from('compras').insert({
    tenant_id: profile.tenant_id,
    proveedor: 'Nómina',
    tipo: 'Gasto',
    tipo_doc_compra: 'Nota de Venta',
    descripcion,
    fecha: hoy,
    subtotal: parseFloat(monto.toFixed(2)),
    iva: 0,
    total: parseFloat(monto.toFixed(2)),
    plazo_pago_proveedor: 0,
  })

  if (error) return { error: 'Error al registrar pago: ' + error.message }

  await supabaseAdmin.rpc('recalcular_caja_diaria', {
    p_tenant_id: profile.tenant_id,
    p_fecha: hoy,
  })

  revalidatePath('/dashboard/nomina')
  revalidatePath('/dashboard/compras')
  revalidatePath('/dashboard/caja')
  return { success: true }
}
