import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Página no encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La página que buscas no existe.
        </p>
        <a href="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Ir al inicio</a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Algo salió mal</h1>
        <p className="mt-2 text-sm text-muted-foreground">Intenta nuevamente o vuelve al inicio.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Reintentar</button>
          <a href="/" className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">Inicio</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "INEVAL_UEDE — Preparación Matemática 1ro BGU" },
      { name: "description", content: "Dominio Estratégico: Aprenderás a resolver desde ejercicios fundamentales hasta problemas complejos de cálculo y álgebra sin dudar." },
      { name: "author", content: "INEVAL_UEDE" },
      { property: "og:title", content: "INEVAL_UEDE — Preparación Matemática 1ro BGU" },
      { property: "og:description", content: "Dominio Estratégico: Aprenderás a resolver desde ejercicios fundamentales hasta problemas complejos de cálculo y álgebra sin dudar." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "INEVAL_UEDE — Preparación Matemática 1ro BGU" },
      { name: "twitter:description", content: "Dominio Estratégico: Aprenderás a resolver desde ejercicios fundamentales hasta problemas complejos de cálculo y álgebra sin dudar." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/lJEZWTmKouOb8tcSffoOq6wU7E83/social-images/social-1782273359783-Gemini_Generated_Image_ym05hiym05hiym05.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/lJEZWTmKouOb8tcSffoOq6wU7E83/social-images/social-1782273359783-Gemini_Generated_Image_ym05hiym05hiym05.webp" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}
