/* Viver de Renda em 15 Anos — Service Worker
 *
 * Responsabilidades:
 *  1. PWA: cache do app shell (ícones, manifest, fontes) para instalação e
 *     abertura rápida/offline parcial. Navegações sempre passam pela rede
 *     (network-first) porque as páginas são SSR — nunca servir HTML velho.
 *  2. Web Push: recebe mensagens do servidor (alertas de preço, proventos,
 *     vereditos do Gestor IA) e as exibe como notificação nativa, mesmo com o
 *     app fechado; clicar na notificação abre a rota correspondente.
 */

const CACHE_APP_SHELL = "i15a-app-shell-v1";
const RECURSOS_APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/favicon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_APP_SHELL)
      .then((cache) => cache.addAll(RECURSOS_APP_SHELL))
      .catch(() => {
        /* recursos indisponíveis no primeiro install (ex.: build em andamento) */
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(
          chaves.filter((chave) => chave !== CACHE_APP_SHELL).map((chave) => caches.delete(chave)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navegação (HTML SSR): network-first, com fallback offline para a home.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((resposta) => {
          const copia = resposta.clone();
          caches.open(CACHE_APP_SHELL).then((cache) => cache.put("/", copia));
          return resposta;
        })
        .catch(() => caches.match("/")),
    );
    return;
  }

  // Ativos estáticos (hasheados pelo Vite): cache-first; atualização em 2ª visita.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(request).then(
        (emCache) =>
          emCache ||
          fetch(request).then((resposta) => {
            const copia = resposta.clone();
            caches.open(CACHE_APP_SHELL).then((cache) => cache.put(request, copia));
            return resposta;
          }),
      ),
    );
    return;
  }

  // Ícones, manifest e fontes: stale-while-revalidate (nunca bloqueia).
  if (
    url.pathname.endsWith(".webmanifest") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(
      caches.match(request).then((emCache) => {
        const rede = fetch(request).then((resposta) => {
          const copia = resposta.clone();
          caches.open(CACHE_APP_SHELL).then((cache) => cache.put(request, copia));
          return resposta;
        });
        return emCache || rede;
      }),
    );
  }
});

/* ------------------------------------------------------------------ *
 * Web Push
 * ------------------------------------------------------------------ */

self.addEventListener("push", (event) => {
  let dados;
  try {
    dados = event.data ? event.data.json() : {};
  } catch {
    dados = { titulo: "Viver de Renda em 15 Anos" };
  }

  const titulo = dados.titulo || "Viver de Renda em 15 Anos";
  const opcoes = {
    body: dados.corpo || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: dados.tag || "i15a-push",
    data: { url: dados.url || "/" },
    renotify: Boolean(dados.renotify),
  };

  event.waitUntil(self.registration.showNotification(titulo, opcoes));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      for (const janela of janelas) {
        if ("focus" in janela) {
          janela.navigate(url);
          return janela.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
