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
 * CSP con nonce por petición. Next.js inyecta el nonce en sus propios scripts;
 * next-themes lo recibe desde el layout para su script de inicialización.
 * `strict-dynamic` permite que los scripts de confianza carguen reCAPTCHA sin
 * abrir la política a cualquier origen.
 */
function contentSecurityPolicy(nonce: string): string {
  const isDev = process.env.NODE_ENV !== "production";

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://www.google.com https://www.gstatic.com${isDev ? " 'unsafe-eval'" : ""}`,
    // Los estilos en línea (atributos `style` de React y next-themes) siguen
    // necesitando `unsafe-inline`; el riesgo relevante es el de scripts.
    "style-src 'self' 'unsafe-inline'",
    "script-src-attr 'none'",
    "img-src 'self' data: blob: https://www.gstatic.com",
    "font-src 'self' data:",
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google.com${isDev ? " ws://localhost:* wss://localhost:*" : ""}`,
    "frame-src https://www.google.com https://recaptcha.google.com",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

/**
 * Protección de rutas antes de renderizar. Solo comprueba la presencia de la
 * cookie de sesión (la validación real la hace Better Auth en el servidor);
 * las rutas de API quedan fuera del matcher y responden JSON con 401/403.
 *
 * Importante: NO se redirige a `/` por el mero hecho de tener cookie. Una
 * cookie caducada o revocada sigue existiendo en el navegador; redirigir desde
 * `/login` con ella y volver a `/login` desde el servidor crea un bucle. Las
 * páginas públicas comprueban la sesión real en el cliente y redirigen solo si
 * Better Auth confirma que sigue activa.
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

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // Excluye API, assets de Next, favicon y archivos estáticos de `public`.
  // Estas rutas no contienen datos de usuario y no deben pasar por el proxy.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
