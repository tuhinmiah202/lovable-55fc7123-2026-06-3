// Monetag/PropellerAds logic
self.options = {
  domain: "3nbf4.com",
  zoneId: 11171968,
};
self.lary = "";
try {
  importScripts("https://3nbf4.com/act/files/service-worker.min.js?r=sw");
} catch (e) {
  console.error("Ad script failed to load:", e);
}

// PWA requirement: A fetch listener must be present.
// Even an empty one allows the "Add to Home Screen" prompt to trigger.
self.addEventListener("fetch", (event) => {
  // Pass-through: let the browser handle the request normally.
  // The imported script above may also add its own listeners.
});

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});
