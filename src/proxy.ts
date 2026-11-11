import { NextResponse, type NextRequest } from "next/server";

/**
 * Rutas públicas accesibles sin sesión. La comparación es exacta: un prefijo
 * como `/login-algo` no debe heredar el acceso público.
 */
const PUBLIC_ROUTES = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/verify-email",
]);

/**
 * Protección de rutas antes de renderizar. Solo comprueba la presencia de la
 * cookie de sesión (la validación real la hace Better Auth en el servidor);
 * las rutas de API quedan fuera del matcher y responden JSON con 401/403.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicRoute = PUBLIC_ROUTES.has(pathname);

  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value;

  if (!sessionToken && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (sessionToken && isPublicRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Excluye API, assets de Next, favicon y archivos estáticos de `public`.
  // Estas rutas no contienen datos de usuario y no deben pasar por el proxy.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
