// Monetag/PropellerAds logic
self.options = {
  domain: "3nbf4.com",
  zoneId: 11171968,
};
self.lary = "";
importScripts("https://3nbf4.com/act/files/service-worker.min.js?r=sw");

// PWA requirement: fetch listener
self.addEventListener("fetch", (event) => {
  // Basic fetch handler to satisfy PWA requirements.
  // The imported script likely handles ad-related fetches.
});

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});
