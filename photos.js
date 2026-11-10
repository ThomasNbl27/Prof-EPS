/* =====================================================================
   photos.js — photos de justificatifs (dispenses)
   Stockées dans IndexedDB, hors du stockage principal : une photo pèse
   bien plus lourd que du texte. Réduites avant enregistrement.
   ===================================================================== */
(function (global) {
  "use strict";

  var BASE = "jarvis-eps-photos";
  var MAGASIN = "photos";
  var ouverture = null;

  function disponible() {
    try { return !!global.indexedDB; } catch (e) { return false; }
  }

  function ouvrir() {
    if (ouverture) return ouverture;
    ouverture = new Promise(function (resoudre, rejeter) {
      if (!disponible()) { rejeter(new Error("Stockage de photos indisponible.")); return; }
      var req = indexedDB.open(BASE, 1);
      req.onupgradeneeded = function () { req.result.createObjectStore(MAGASIN); };
      req.onsuccess = function () { resoudre(req.result); };
      req.onerror = function () { ouverture = null; rejeter(req.error || new Error("Ouverture impossible.")); };
    });
    return ouverture;
  }

  function transaction(mode, action) {
    return ouvrir().then(function (db) {
      return new Promise(function (resoudre, rejeter) {
        var tx = db.transaction(MAGASIN, mode);
        var magasin = tx.objectStore(MAGASIN);
        var resultat = action(magasin);
        tx.oncomplete = function () { resoudre(resultat && resultat.result !== undefined ? resultat.result : undefined); };
        tx.onerror = function () { rejeter(tx.error); };
        tx.onabort = function () { rejeter(tx.error); };
      });
    });
  }

  /** Réduit l'image (1400 px max, JPEG) ; en cas d'échec, garde l'original. */
  function reduire(fichier) {
    return new Promise(function (resoudre) {
      var url = URL.createObjectURL(fichier);
      var img = new Image();
      img.onload = function () {
        try {
          var max = 1400;
          var ratio = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
          var canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio));
          canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(function (blob) {
            URL.revokeObjectURL(url);
            resoudre(blob || fichier);
          }, "image/jpeg", 0.72);
        } catch (e) { URL.revokeObjectURL(url); resoudre(fichier); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); resoudre(fichier); };
      img.src = url;
    });
  }

  function versDataURL(blob) {
    return new Promise(function (resoudre, rejeter) {
      var l = new FileReader();
      l.onload = function () { resoudre(String(l.result)); };
      l.onerror = function () { rejeter(l.error); };
      l.readAsDataURL(blob);
    });
  }

  function depuisDataURL(texte) {
    var morceaux = String(texte).split(",");
    var type = (morceaux[0].match(/data:([^;]+)/) || [])[1] || "image/jpeg";
    var binaire = atob(morceaux[1] || "");
    var octets = new Uint8Array(binaire.length);
    for (var i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
    return new Blob([octets], { type: type });
  }

  var Photos = {
    disponible: disponible,

    ajouter: function (fichier) {
      var id = "ph-" + U.uid();
      return reduire(fichier).then(function (blob) {
        return transaction("readwrite", function (m) { return m.put(blob, id); });
      }).then(function () { return id; });
    },

    lire: function (id) {
      if (!id) return Promise.resolve(null);
      return transaction("readonly", function (m) { return m.get(id); })
        .then(function (b) { return b || null; })
        .catch(function () { return null; });
    },

    supprimer: function (id) {
      if (!id) return Promise.resolve();
      return transaction("readwrite", function (m) { return m.delete(id); }).catch(function () {});
    },

    vider: function () {
      if (!disponible()) return Promise.resolve();
      return transaction("readwrite", function (m) { return m.clear(); }).catch(function () {});
    },

    /** Toutes les photos en texte (pour la sauvegarde JSON). */
    exporter: function () {
      if (!disponible()) return Promise.resolve({});
      return ouvrir().then(function (db) {
        return new Promise(function (resoudre) {
          var sortie = {};
          var attente = [];
          var req = db.transaction(MAGASIN, "readonly").objectStore(MAGASIN).openCursor();
          req.onsuccess = function () {
            var curseur = req.result;
            if (curseur) {
              var cle = curseur.key;
              attente.push(versDataURL(curseur.value).then(function (t) { sortie[cle] = t; }));
              curseur.continue();
            } else {
              Promise.all(attente).then(function () { resoudre(sortie); });
            }
          };
          req.onerror = function () { resoudre({}); };
        });
      }).catch(function () { return {}; });
    },

    /** Restaure les photos d'une sauvegarde (mode "remplacer" : on repart de zéro). */
    importer: function (carte, mode) {
      if (!carte || typeof carte !== "object" || !disponible()) return Promise.resolve();
      var debut = mode === "fusionner" ? Promise.resolve() : Photos.vider();
      return debut.then(function () {
        return Object.keys(carte).reduce(function (suite, id) {
          return suite.then(function () {
            return transaction("readwrite", function (m) { return m.put(depuisDataURL(carte[id]), id); });
          });
        }, Promise.resolve());
      }).catch(function () {});
    }
  };

  global.Photos = Photos;
})(window);
