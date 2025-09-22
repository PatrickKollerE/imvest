import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware({
  // A list of all locales that are supported
  locales: ['en', 'de'],
  
  // Used when no locale matches
  defaultLocale: 'de'
});

export default async function middleware(req: NextRequest) {
  // Handle internationalization first
  const intlResponse = intlMiddleware(req);
  
  // If intl middleware wants to redirect, let it handle that
  if (intlResponse.status === 307 || intlResponse.status === 308) {
    return intlResponse;
  }
  
  // Check if this is a protected route (but not login/register/evaluate pages)
  const isLoginPage = req.nextUrl.pathname.includes('/login') || req.nextUrl.pathname.includes('/register');
  const isEvaluatePage = req.nextUrl.pathname.startsWith('/en/evaluate') || req.nextUrl.pathname.startsWith('/de/evaluate');
  const isProtectedPath = req.nextUrl.pathname === '/en' || req.nextUrl.pathname === '/de' || 
                         req.nextUrl.pathname.startsWith('/en/properties') || 
                         req.nextUrl.pathname.startsWith('/de/properties');
  
  if (isProtectedPath && !isLoginPage && !isEvaluatePage) {
    // Check authentication
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    
    if (!token) {
      // Determine locale and redirect to appropriate login (default to 'de' now)
      const locale = req.nextUrl.pathname.startsWith('/en') ? 'en' : 'de';
      const loginUrl = new URL(`/${locale}/login`, req.url);
      loginUrl.searchParams.set('callbackUrl', req.url);
      return NextResponse.redirect(loginUrl);
    }
  }
  
  return intlResponse;
}

export const config = {
  // Match only internationalized pathnames, exclude API routes
  matcher: ['/', '/(de|en)/:path*']
};