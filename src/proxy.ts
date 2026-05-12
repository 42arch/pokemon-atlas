import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/(zh|en|ja)/:path*', '/((?!api|_next|_static|_vercel|[\\w-]+\\.\\w+).*)']
}
