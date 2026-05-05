import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'
// Never never move back to middleware.ts, otherwise it will cause a lot of issues with nextjs 14.0.0 and later, see https://github.com/vercel/next.js/issues/49400
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
