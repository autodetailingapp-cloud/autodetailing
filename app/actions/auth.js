'use server'

import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

// Solo para loginAction (anon key válida para signInWithPassword del lado cliente)
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

async function setAuthCookies(session) {
  const cookieStore = await cookies()
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'lax',
    path: '/',
  }
  cookieStore.set('sb-access-token', session.access_token, opts)
  cookieStore.set('sb-refresh-token', session.refresh_token, opts)
}

export async function loginAction(prevState, formData) {
  const email    = formData.get('email')?.toString().trim()
  const password = formData.get('password')?.toString()

  if (!email || !password) {
    return { error: 'Email y contraseña son requeridos.' }
  }

  const supabase = getSupabase()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Credenciales incorrectas. Verifica tu email y contraseña.' }
  }

  await setAuthCookies(data.session)
  redirect('/dashboard')
}

export async function registrarAction(prevState, formData) {
  const nombre      = formData.get('nombre')?.toString().trim()
  const email       = formData.get('email')?.toString().trim()
  const password    = formData.get('password')?.toString()
  const ruc_cedula  = formData.get('ruc_cedula')?.toString().trim()
  const telefono    = formData.get('telefono')?.toString().trim()
  const direccion   = formData.get('direccion')?.toString().trim() ?? ''
  const regimen_sri = formData.get('regimen_sri')?.toString()
  const plan        = formData.get('plan')?.toString()

  if (!nombre || !email || !password || !ruc_cedula || !telefono || !regimen_sri || !plan) {
    return { error: 'Todos los campos marcados con * son requeridos.' }
  }

  if (password.length < 8) {
    return { error: 'La contraseña debe tener al menos 8 caracteres.' }
  }

  // 1. Crear usuario via Admin API (evita triggers problemáticos y confirma email directo)
  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre },
  })

  if (userError) {
    if (userError.message.toLowerCase().includes('already been registered')) {
      return { error: 'Este correo ya está registrado. Inicia sesión.' }
    }
    return { error: 'Error al crear el usuario: ' + userError.message }
  }

  const userId = userData.user.id

  // 2. Insertar tenant
  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from('tenants')
    .insert({ nombre, ruc_cedula, telefono, direccion, regimen_sri, plan, estado: 'activo' })
    .select()
    .single()

  if (tenantError) {
    await supabaseAdmin.auth.admin.deleteUser(userId)
    return { error: 'Error al registrar el negocio: ' + tenantError.message }
  }

  // 3. Insertar profile con rol admin
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: userId,
      tenant_id: tenant.id,
      nombre,
      email,
      rol: 'admin',
    })

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(userId)
    return { error: 'Error al crear el perfil: ' + profileError.message }
  }

  // 4. Iniciar sesión para obtener tokens (admin client evita problemas con sb_publishable_ key)
  const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  })

  if (sessionError) {
    return { error: 'Registro exitoso pero no se pudo iniciar sesión: ' + sessionError.message }
  }

  await setAuthCookies(sessionData.session)

  // 5. Redirigir al dashboard
  redirect('/dashboard')
}

export async function logoutAction() {
  const cookieStore = await cookies()
  cookieStore.delete('sb-access-token')
  cookieStore.delete('sb-refresh-token')
  redirect('/login')
}
