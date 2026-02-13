import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const m = pathname.match(/^\/wl(?:\/(.*))?$/)
  if (m) {
    const token = m[1] ?? ''
    if (!token || token === 'undefined' || token.trim() === '') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/wl', '/wl/:path*'],
}
