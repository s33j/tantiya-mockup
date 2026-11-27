// Service worker for the Tantiya PWA.
// Push and notificationclick handlers go here once web push is built.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
