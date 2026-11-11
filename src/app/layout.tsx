import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tablero de tareas",
  description:
    "Organiza tus tareas en un tablero Kanban con prioridades, fechas límite y etiquetas. Tus datos se guardan en tu cuenta y se sincronizan entre dispositivos.",
};

// El layout lee `headers()` para el nonce de la CSP: todas las rutas se
// renderizan por petición en lugar de prerenderizarse en el build.
export const instant = false;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // `proxy.ts` genera un nonce por petición. Next lo aplica a sus scripts y
  // next-themes lo necesita para su script de inicialización del tema.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          nonce={nonce}
        >
          <TooltipProvider>
            {children}
            <Toaster position="bottom-right" closeButton />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
