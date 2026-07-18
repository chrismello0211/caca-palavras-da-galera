/* Caça-Palavras da Galera — Service Worker
   Estratégia (igual ao Dominó da Galera):
   - documento (index.html): REDE primeiro, cache como reserva
     → online sempre pega a versão nova; offline joga solo e duelo local normalmente.
   - estáticos (manifesto, ícones): cache primeiro, atualiza por baixo.
   - Firebase e qualquer coisa de fora da origem: NÃO intercepta (desafios e diário intactos).
   Ao mudar ícones/manifesto, suba o número do CACHE pra forçar atualização. */
const CACHE = 'caca-v4';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './bg/bg-quadro.webp',
  './bg/bg-madeira.webp',
  './bg/bg-papel.webp',
  './bg/bg-cortica.webp',
  './bg/bg-kraft.webp',
  './bg/bg-ceu.webp',
  './bg/bg-areia.webp',
  './bg/bg-aquarela.webp'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                          // PUT/PATCH (Firebase) passam direto
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;           // Firebase e externos: não intercepta

  const isDoc = req.mode === 'navigate' ||
                url.pathname.endsWith('/') ||
                url.pathname.endsWith('index.html');

  if (isDoc) {                                               // rede primeiro (updates), cache reserva (offline)
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(                                             // estáticos: cache primeiro
    caches.match(req).then(cached => {
      const net = fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => cached);
      return cached || net;
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) return c.focus(); }
    return clients.openWindow('./');
  }));
});
