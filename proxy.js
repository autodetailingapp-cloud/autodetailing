import { NextResponse } from 'next/server'

const PUBLIC_ROUTES    = ['/login', '/registro']
const PROTECTED_PREFIX = '/dashboard'

function isTokenValid(token) {
  if (!token) return false
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const { exp } = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'))
    return typeof exp === 'number' && exp * 1000 > Date.now()
  } catch {
    return false
  }
}

export function proxy(request) {
  const { pathname } = request.nextUrl
  const token      = request.cookies.get('sb-access-token')?.value
  const hasSession = isTokenValid(token)

  const isPublic    = PUBLIC_ROUTES.some((r) => pathname.startsWith(r))
  const isProtected = pathname.startsWith(PROTECTED_PREFIX)
  const isRoot      = pathname === '/'

  // Sin sesión válida → rutas protegidas van a login y se limpian cookies caducadas
  if (isProtected && !hasSession) {
    const res = NextResponse.redirect(new URL('/login', request.url))
    res.cookies.delete('sb-access-token')
    res.cookies.delete('sb-refresh-token')
    return res
  }

  // Con sesión válida → no puede ver login ni registro
  if (isPublic && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Raíz → redirigir según estado de sesión
  if (isRoot) {
    return NextResponse.redirect(
      new URL(hasSession ? '/dashboard' : '/login', request.url)
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico).*)'],
}
