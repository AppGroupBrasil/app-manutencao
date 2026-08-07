import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import './i18n'; // Inicialização do i18n

if (typeof window !== "undefined") {
  const { hostname, pathname, search, hash } = window.location;
  if (hostname.startsWith("www.")) {
    const targetHost = hostname.replace(/^www\./, "");
    const targetUrl = `https://${targetHost}${pathname}${search}${hash}`;
    window.location.replace(targetUrl);
  }
}

if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  if (!import.meta.env.DEV) {
    // Desregistrar apenas o SW pesado (sw.js) que causa problemas de cache.
    // Manter o sw-push.js para push notifications.
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        const swUrl = registration.active?.scriptURL || registration.installing?.scriptURL || '';
        if (swUrl.includes('sw.js') && !swUrl.includes('sw-push.js')) {
          registration.unregister();
          console.log('[SW] Desregistrado SW pesado:', swUrl);
        }
      });
    });

    // Limpar apenas caches do SW pesado (app-manutencao-v*)
    if ("caches" in window) {
      caches.keys().then((keys) => {
        keys.forEach((key) => {
          if (key.startsWith('app-manutencao')) {
            caches.delete(key);
            console.log('[Cache] Removido cache:', key);
          }
        });
      });
    }
  }
}

// Suprimir erro benigno do ResizeObserver que ocorre em alguns navegadores
// Este erro não afeta a funcionalidade da aplicação
const resizeObserverErr = window.ResizeObserver;
window.ResizeObserver = class ResizeObserver extends resizeObserverErr {
  constructor(callback: ResizeObserverCallback) {
    super((entries, observer) => {
      // Usar requestAnimationFrame para evitar o erro de loop
      window.requestAnimationFrame(() => {
        callback(entries, observer);
      });
    });
  }
};
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  // Não redirecionar se já estiver em páginas públicas
  const publicPaths = ['/login', '/recuperar-senha', '/redefinir-senha', '/', '/contrato', '/apresentacao', '/morador', '/equipe', '/votar', '/compartilhado', '/timeline', '/cadastro', '/assembleia', '/publico', '/manutencao', '/notificacao', '/termos', '/privacidade'];
  const currentPath = window.location.pathname;
  const isPublicPath = publicPaths.some(path => {
    if (path === "/") return currentPath === "/";
    return currentPath === path || currentPath.startsWith(`${path}/`);
  });
  if (isPublicPath) return;

  // Limpar cache para evitar loops de autenticação com estado obsoleto
  queryClient.clear();
  localStorage.removeItem("app_session_token");
  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

// API URL: use environment variable for hybrid deployment (Vercel frontend + Manus backend)
const apiUrl = import.meta.env.VITE_API_URL || "/api/trpc";

const SESSION_TOKEN_KEY = "app_session_token";
const TENANT_ATIVO_KEY = "condominio_ativo";

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: apiUrl,
      transformer: superjson,
      fetch(input, init) {
        // Adicionar Authorization header como fallback para WebViews
        // onde cookies não persistem corretamente
        const token = localStorage.getItem(SESSION_TOKEN_KEY);
        const headers = new Headers((init as any)?.headers);
        if (token && !headers.has("Authorization")) {
          headers.set("Authorization", `Bearer ${token}`);
        }
        // Organização ativa: só importa para quem administra mais de uma.
        // O servidor ignora o valor se não pertencer ao usuário.
        const tenantAtivo = localStorage.getItem(TENANT_ATIVO_KEY);
        if (tenantAtivo && !headers.has("x-condominio-id")) {
          headers.set("x-condominio-id", tenantAtivo);
        }
        return globalThis.fetch(input, {
          ...(init ?? {}),
          headers,
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
