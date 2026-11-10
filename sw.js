/* =====================================================================
   sw.js — service worker
   Met l'application en cache pour qu'elle fonctionne sans connexion
   (gymnase, stade, sous-sol...). Les données restent dans le navigateur.
   ===================================================================== */
var CACHE = "jarvis-eps-v1.5.0";

var FICHIERS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "app.css",
  "extras.css",
  "utils.js",
  "store.js",
  "photos.js",
  "seed.js",
  "eps.js",
  "speech.js",
  "ui.js",
  "verrou.js",
  "exports.js",
  "pdf.js",
  "ics.js",
  "rappels.js",
  "vue-accueil.js",
  "vue-seances.js",
  "vue-eleves.js",
  "vue-as.js",
  "vue-evals.js",
  "vue-resume.js",
  "vue-profprincipal.js",
  "vue-base.js",
  "vue-pdf.js",
  "vue-agenda.js",
  "vue-reglages.js",
  "app.js",
  "favicon.svg",
  "favicon-32.png",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
  "apple-touch-icon.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (cache) { return cache.addAll(FICHIERS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (cles) {
        return Promise.all(cles.filter(function (c) { return c !== CACHE; })
                               .map(function (c) { return caches.delete(c); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

/* Réseau d'abord pour la navigation (mise à jour immédiate),
   cache d'abord pour les ressources (rapidité et hors-ligne). */
/* Un appui sur une notification ramène à l'agenda. */
self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (liste) {
      for (var i = 0; i < liste.length; i++) {
        if ("focus" in liste[i]) return liste[i].focus();
      }
      if (clients.openWindow) return clients.openWindow("./#agenda");
    })
  );
});

self.addEventListener("fetch", function (e) {
  var requete = e.request;
  if (requete.method !== "GET" || new URL(requete.url).origin !== location.origin) return;

  if (requete.mode === "navigate") {
    e.respondWith(
      fetch(requete)
        .then(function (reponse) {
          var copie = reponse.clone();
          caches.open(CACHE).then(function (c) { c.put("index.html", copie); });
          return reponse;
        })
        .catch(function () {
          return caches.match("index.html").then(function (r) { return r || caches.match("./"); });
        })
    );
    return;
  }

  e.respondWith(
    caches.match(requete).then(function (cache) {
      return cache || fetch(requete).then(function (reponse) {
        if (reponse && reponse.status === 200 && reponse.type === "basic") {
          var copie = reponse.clone();
          caches.open(CACHE).then(function (c) { c.put(requete, copie); });
        }
        return reponse;
      });
    })
  );
});
