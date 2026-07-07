'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getProfile } from '@/lib/getProfile'

const ROLES = ['admin', 'supervisor', 'cajero', 'lectura']

function generarPasswordTemporal() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let pass = ''
  for (let i = 0; i < 12; i++) pass += chars[Math.floor(Math.random() * chars.length)]
  return pass
}

export async function invitarUsuario(prevState, formData) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }
  if (profile.rol !== 'admin') return { error: 'Solo un administrador puede invitar usuarios' }

  const email = formData.get('email')?.toString().trim().toLowerCase()
  const nombre = formData.get('nombre')?.toString().trim()
  const rol = formData.get('rol')?.toString()

  if (!email) return { error: 'El email es requerido' }
  if (!nombre) return { error: 'El nombre es requerido' }
  if (!ROLES.includes(rol)) return { error: 'Rol inválido' }

  const tempPassword = generarPasswordTemporal()

  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { nombre },
  })

  if (userError) {
    if (userError.message.toLowerCase().includes('already been registered'))
      return { error: 'Este correo ya está registrado' }
    return { error: 'Error al crear el usuario: ' + userError.message }
  }

  const { error: profileError } = await supabaseAdmin.from('profiles').insert({
    id: userData.user.id,
    tenant_id: profile.tenant_id,
    nombre,
    email,
    rol,
    activo: true,
  })

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(userData.user.id)
    return { error: 'Error al crear el perfil: ' + profileError.message }
  }

  revalidatePath('/dashboard/usuarios')
  return { success: true, email, tempPassword }
}

export async function toggleUsuario(id, activo) {
  const profile = await getProfile()
  if (!profile) return { error: 'No autorizado' }
  if (profile.rol !== 'admin') return { error: 'Solo un administrador puede hacer esto' }
  if (id === profile.id) return { error: 'No puedes desactivarte a ti mismo' }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ activo })
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/usuarios')
  return { success: true }
}
