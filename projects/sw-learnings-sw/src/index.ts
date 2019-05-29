import { Store, get } from 'idb-keyval';

declare const __BUILDTIMESTAMP__: string;
declare const importScripts: Function;
declare const workbox;

importScripts('https://storage.googleapis.com/workbox-cdn/releases/4.3.1/workbox-sw.js');

if (workbox) {

  // Avoid async imports
  // see https://developers.google.com/web/tools/workbox/modules/workbox-sw#avoid_async_imports

  console.log(`Yay! Workbox is loaded 🎉`);

  // Precache & Route setup
  // Keep it here or it will not get picked up
  // see workbox-config.jss
  // This array gets injected automagically by the workbox cli
  workbox.precaching.precacheAndRoute([]);

  // This will update the app with an event of updated precache files
  workbox.precaching.addPlugins([
    new workbox.broadcastUpdate.Plugin({
      channelName: 'precache-updates'
    })
  ]);

  // Google Fonts cache setup
  // see https://developers.google.com/web/tools/workbox/guides/common-recipes#google_fonts
  workbox.routing.registerRoute(
    /^https:\/\/fonts\.googleapis\.com/,
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'google-fonts-stylesheets'
    })
  );

  // Cache the underlying font files with a cache-first strategy for 1 year.
  workbox.routing.registerRoute(
    /^https:\/\/fonts\.gstatic\.com/,
    new workbox.strategies.CacheFirst({
      cacheName: 'google-fonts-webfonts',
      plugins: [
        new workbox.cacheableResponse.Plugin({
          statuses: [0, 200]
        }),
        new workbox.expiration.Plugin({
          maxAgeSeconds: 60 * 60 * 24 * 365,
          maxEntries: 30,
          purgeOnQuotaError: true // Automatically cleanup if quota is exceeded.
        })
      ]
    })
  );

  // default page handler for offline usage, where the browser does not how to handle deep links
  // it's a SPA, so each path that is a navigation should default to index.html
  workbox.routing.registerRoute(
    ({ event }) => event.request.mode === 'navigate',
    async () => {
      const defaultBase = '/index.html';
      return caches
        .match(workbox.precaching.getCacheKeyForURL(defaultBase))
        .then(response => {
          return response || fetch(defaultBase);
        })
        .catch(err => {
          return fetch(defaultBase);
        });
    }
  );

  // OAuth header interceptor
  workbox.routing.registerRoute(
    ({ url }) => {
      return /map\.png/.test(url);
    },
    async ({ event, url }) => {

      // get the eventual token
      const customStore = new Store('swl-db', 'swl-db-store');
      const oAuthToken = await get<string>('token', customStore);

      // if token available, set it as the Authorization header
      if (!!oAuthToken) {
        const modifiedHeaders = new Headers(event.request.headers);
        modifiedHeaders.set('Authorization', oAuthToken);
        const overwrite = {
          headers: modifiedHeaders
        };
        const modifiedRequest = new Request(url.toString(), overwrite);
        return fetch(modifiedRequest);
      }

      const defaultNotAuthedBase = '/assets/not_authorized.png';
      return caches
        .match(workbox.precaching.getCacheKeyForURL(defaultNotAuthedBase))
        .then(response => {
          return response || fetch(defaultNotAuthedBase);
        })
        .catch(err => {
          return fetch(defaultNotAuthedBase);
        });

    }
  );

} else {
  console.log(`Boo! Workbox didn't load 😬`);
}

self.addEventListener('install', (e) => {
  console.log('sw install event', __BUILDTIMESTAMP__);
});

self.addEventListener('activate', (e) => {
  console.log('sw activate event', __BUILDTIMESTAMP__);
});

self.addEventListener('waiting', (e) => {
  console.log('sw waiting event', __BUILDTIMESTAMP__);
});

