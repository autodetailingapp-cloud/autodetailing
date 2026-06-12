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
  if (isNaN(dias_semana) || dias_semana < 1 || dias_semana > 7) return { error: 'Los días por semana deben ser entre 1 y 7' }

  const { error } = await supabaseAdmin.from('colaboradores').insert({
    tenant_id: profile.tenant_id,
    nombre,
    cargo,
    salario_dia,
    dias_semana,
    activo: true,
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
  if (isNaN(salario_dia) || salario_dia < 0) return { error: 'El salario diario es inválido' }

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

export async function registrarAsistencia(colaboradorId, fecha, estado) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }

  const { error } = await supabaseAdmin
    .from('asistencia')
    .upsert({
      tenant_id: profile.tenant_id,
      colaborador_id: colaboradorId,
      fecha,
      estado,
    }, { onConflict: 'colaborador_id,fecha' })

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

  const { error } = await supabaseAdmin
    .from('asistencia')
    .upsert(rows, { onConflict: 'colaborador_id,fecha' })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/nomina')
  return { success: true }
}

export async function pagarNomina(colaboradorId, monto, descripcion) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }

  const hoy = new Date().toISOString().split('T')[0]

  // Verificar si la caja de hoy está cerrada
  const { data: caja } = await supabaseAdmin
    .from('caja_diaria')
    .select('cerrado')
    .eq('tenant_id', profile.tenant_id)
    .eq('fecha', hoy)
    .maybeSingle()

  if (caja?.cerrado) return { error: 'La caja de hoy ya está cerrada' }

  const { error } = await supabaseAdmin.from('compras').insert({
    tenant_id: profile.tenant_id,
    proveedor: 'Nómina',
    tipo: 'Gasto',
    descripcion,
    fecha: hoy,
    subtotal: parseFloat(monto.toFixed(2)),
    iva: 0,
    total: parseFloat(monto.toFixed(2)),
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
