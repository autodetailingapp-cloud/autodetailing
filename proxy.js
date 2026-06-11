import { NextResponse } from 'next/server'

const PUBLIC_ROUTES   = ['/login', '/registro']
const PROTECTED_PREFIX = '/dashboard'

export function proxy(request) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('sb-access-token')?.value

  const isPublic    = PUBLIC_ROUTES.some((r) => pathname.startsWith(r))
  const isProtected = pathname.startsWith(PROTECTED_PREFIX)
  const isRoot      = pathname === '/'

  // Sin sesión → solo puede estar en rutas públicas
  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Con sesión → no puede ver login ni registro
  if (isPublic && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Raíz → redirigir según estado de sesión
  if (isRoot) {
    return NextResponse.redirect(
      new URL(token ? '/dashboard' : '/login', request.url)
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico).*)'],
}
