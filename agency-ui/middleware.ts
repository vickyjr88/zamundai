import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // Paths that don't require authentication
  const publicPaths = ['/', '/login', '/register', '/forgot-password', '/reset-password'];
  const isPublicPath = publicPaths.some((path) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path),
  );

  if (!token && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (
    token &&
    pathname !== '/dashboard' &&
    isPublicPath
  ) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
