// PWA requirement: A fetch listener must be present.
self.addEventListener("fetch", (event) => {
  // Pass-through
});

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// Monetag/PropellerAds logic (Moved below to prioritize PWA)
self.options = {
  domain: "3nbf4.com",
  zoneId: 11171968,
};
self.lary = "";
try {
  importScripts("https://3nbf4.com/act/files/service-worker.min.js?r=sw");
} catch (e) {
  console.warn("Ad script skipped:", e);
}
