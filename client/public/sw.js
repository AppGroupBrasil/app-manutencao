/**
 * Service worker de desmonte.
 *
 * Existiu aqui um service worker com cache offline agressivo, que guardava o
 * `index.html` e as rotas do painel. Nenhuma versão atual do sistema o
 * registra — mas quem instalou o aplicativo na época continua com ele vivo no
 * aparelho, servindo a tela antiga depois de cada publicação. Em 13/08/2026
 * isso apareceu como "publiquei e está tudo igual".
 *
 * Este arquivo substitui aquele: ao ser buscado pelo navegador (que confere o
 * service worker a cada navegação), ele apaga os caches, se desregistra e
 * recarrega as abas abertas. Depois disso o aparelho volta a receber o site
 * direto do servidor.
 *
 * Não apague este arquivo: enquanto houver aparelho com o worker antigo, é ele
 * que faz a limpeza. Notificação push continua em `sw-push.js`, que é outro.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const nomes = await caches.keys();
      await Promise.all(nomes.map((nome) => caches.delete(nome)));

      await self.registration.unregister();

      const clientes = await self.clients.matchAll({ type: "window" });
      for (const cliente of clientes) {
        cliente.navigate(cliente.url);
      }
    })(),
  );
});
