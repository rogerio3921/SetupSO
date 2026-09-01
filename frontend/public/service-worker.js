// SetupSO — Service Worker "kill switch".
//
// A versão anterior usava cache-first para HTML/JS. Depois de cada deploy ela
// servia um index.html antigo apontando para bundles que já não existiam (404),
// impedindo o React de montar — o app ficava preso na tela "Carregando...".
//
// Este SW apenas se remove: limpa todos os caches, desregistra a si mesmo e
// recarrega as abas abertas. Depois disso o app volta a carregar sempre do
// servidor. Para reativar PWA offline no futuro, use um SW gerado com hash de
// arquivos (Workbox / cra-template-pwa), nunca cache-first manual.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      } catch (err) {
        /* ignore */
      }
      try {
        await self.registration.unregister();
      } catch (err) {
        /* ignore */
      }
      try {
        const clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach((client) => {
          if ('navigate' in client) client.navigate(client.url);
        });
      } catch (err) {
        /* ignore */
      }
    })(),
  );
});
