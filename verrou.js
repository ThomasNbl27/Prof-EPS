/* =====================================================================
   verrou.js — code d'accès à 4 chiffres
   Des noms d'élèves sont enregistrés sur un téléphone qui peut être
   perdu ou prêté. Ce verrou empêche l'ouverture par un tiers ; il ne
   chiffre pas les données (l'application le dit clairement à l'écran).
   ===================================================================== */
(function (global) {
  "use strict";

  /**
   * Code livré avec l'application, appliqué au premier lancement.
   * Le dépôt étant public, ce code est visible de tous : il vaut comme
   * garde-fou, pas comme protection. À changer dans Réglages → seule
   * l'empreinte du nouveau code est alors enregistrée, en local.
   */
  var CODE_INITIAL = "1707";

  var LONGUEUR = 4;
  var ATTENTE_APRES_ECHECS = 5;     // nombre d'essais avant temporisation
  var DUREE_ATTENTE = 30000;        // 30 secondes

  var echecs = 0;
  var bloqueJusqua = 0;
  var masqueDepuis = 0;
  var verrouille = false;

  /* ---------- Empreinte du code ---------- */

  function sel() {
    return Math.random().toString(36).slice(2, 12);
  }

  /** Repli déterministe si l'API de hachage n'est pas disponible (http, vieux navigateur). */
  function empreinteSimple(texte) {
    var h = 0x811c9dc5;
    for (var i = 0; i < texte.length; i++) {
      h ^= texte.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return ("0000000" + h.toString(16)).slice(-8);
  }

  function empreinte(code, grain) {
    var entree = grain + "|" + code;
    if (global.crypto && global.crypto.subtle && global.crypto.subtle.digest) {
      return global.crypto.subtle
        .digest("SHA-256", new TextEncoder().encode(entree))
        .then(function (tampon) {
          return { algo: "sha256", valeur: Array.prototype.map
            .call(new Uint8Array(tampon), function (o) { return ("0" + o.toString(16)).slice(-2); })
            .join("") };
        })
        .catch(function () { return { algo: "simple", valeur: empreinteSimple(entree) }; });
    }
    return Promise.resolve({ algo: "simple", valeur: empreinteSimple(entree) });
  }

  /* ---------- API ---------- */

  var Verrou = {

    /** Applique le code livré, une seule fois, au premier lancement. */
    initialiser: function () {
      var r = Store.reglages();
      if (!CODE_INITIAL || r.codeInitialise || r.codeEmpreinte) return Promise.resolve(false);
      return Verrou.definir(CODE_INITIAL).then(function () {
        Store.majReglages({ codeInitialise: true });
        return true;
      });
    },

    estActif: function () {
      var r = Store.reglages();
      return !!(r.codeEmpreinte && r.codeGrain);
    },

    estVerrouille: function () { return verrouille; },

    definir: function (code) {
      var grain = sel();
      return empreinte(code, grain).then(function (e) {
        Store.majReglages({ codeEmpreinte: e.valeur, codeGrain: grain, codeAlgo: e.algo });
        return true;
      });
    },

    retirer: function () {
      Store.majReglages({ codeEmpreinte: "", codeGrain: "", codeAlgo: "", codeInitialise: true });
    },

    verifier: function (code) {
      var r = Store.reglages();
      if (!r.codeEmpreinte) return Promise.resolve(true);
      return empreinte(code, r.codeGrain).then(function (e) {
        // L'empreinte enregistrée peut venir d'un autre algorithme (repli).
        if (e.algo === r.codeAlgo) return e.valeur === r.codeEmpreinte;
        return empreinteSimple(r.codeGrain + "|" + code) === r.codeEmpreinte;
      });
    },

    /* ---------- Écran de saisie ---------- */

    afficher: function (surSucces) {
      if (verrouille) return;
      verrouille = true;
      document.body.classList.add("est-verrouille");

      var saisie = "";
      var ecran = U.depuisHTML(
        '<div class="verrou" role="dialog" aria-modal="true" aria-label="Code d\'accès">' +
          '<div class="verrou__boite">' +
            '<span class="verrou__marque">' + UI.icone("chrono") + "</span>" +
            "<h1>Prof EPS+</h1>" +
            '<p id="verrou-message">Saisissez votre code</p>' +
            '<div class="verrou__points" id="verrou-points">' +
              Array.apply(null, Array(LONGUEUR)).map(function () {
                return '<span class="verrou__point"></span>';
              }).join("") +
            "</div>" +
            '<div class="verrou__clavier">' +
              [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) {
                return '<button type="button" data-chiffre="' + n + '">' + n + "</button>";
              }).join("") +
              '<span></span>' +
              '<button type="button" data-chiffre="0">0</button>' +
              '<button type="button" data-effacer aria-label="Effacer">' + UI.icone("retour") + "</button>" +
            "</div>" +
            '<button class="link" data-oubli type="button">Code oublié ?</button>' +
          "</div>" +
        "</div>"
      );
      document.body.appendChild(ecran);

      var points = U.$$(".verrou__point", ecran);
      var message = ecran.querySelector("#verrou-message");

      function dessiner() {
        points.forEach(function (p, i) { p.classList.toggle("is-on", i < saisie.length); });
      }

      function refuser(texte) {
        message.textContent = texte;
        ecran.querySelector(".verrou__boite").classList.add("tremble");
        setTimeout(function () {
          ecran.querySelector(".verrou__boite").classList.remove("tremble");
        }, 420);
        saisie = "";
        dessiner();
      }

      function valider() {
        if (Date.now() < bloqueJusqua) {
          refuser("Trop d'essais. Patientez " +
                  Math.ceil((bloqueJusqua - Date.now()) / 1000) + " s.");
          return;
        }
        Verrou.verifier(saisie).then(function (bon) {
          if (bon) {
            echecs = 0;
            verrouille = false;
            document.body.classList.remove("est-verrouille");
            ecran.remove();
            if (surSucces) surSucces();
            return;
          }
          echecs++;
          U.vibrer(60);
          if (echecs >= ATTENTE_APRES_ECHECS) {
            bloqueJusqua = Date.now() + DUREE_ATTENTE;
            echecs = 0;
            refuser("Trop d'essais. Patientez 30 s.");
          } else {
            refuser("Code incorrect. Réessayez.");
          }
        });
      }

      U.sur(ecran, "click", "[data-chiffre]", function (e, el) {
        if (saisie.length >= LONGUEUR) return;
        saisie += el.getAttribute("data-chiffre");
        U.vibrer(8);
        dessiner();
        if (saisie.length === LONGUEUR) setTimeout(valider, 120);
      });

      U.sur(ecran, "click", "[data-effacer]", function () {
        saisie = saisie.slice(0, -1);
        dessiner();
      });

      U.sur(ecran, "click", "[data-oubli]", function () {
        UI.confirmer({
          titre: "Code oublié",
          message: "Le code ne peut pas être retrouvé. Le seul moyen d'entrer est d'effacer " +
                   "les données de ce téléphone, puis de restaurer une sauvegarde. " +
                   "Voulez-vous tout effacer ?",
          valider: "Tout effacer",
          danger: true
        }).then(function (ok) {
          if (!ok) return;
          Store.toutEffacer();
          location.reload();
        });
      });

      document.addEventListener("keydown", auClavier);
      function auClavier(e) {
        if (!verrouille) { document.removeEventListener("keydown", auClavier); return; }
        if (/^[0-9]$/.test(e.key) && saisie.length < LONGUEUR) {
          saisie += e.key;
          dessiner();
          if (saisie.length === LONGUEUR) setTimeout(valider, 120);
        } else if (e.key === "Backspace") {
          saisie = saisie.slice(0, -1);
          dessiner();
        }
      }
    },

    /* ---------- Verrouillage automatique ---------- */

    surveiller: function () {
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
          masqueDepuis = Date.now();
          return;
        }
        if (!Verrou.estActif() || verrouille) return;
        var delai = Number(Store.reglages().delaiVerrou);
        if (isNaN(delai)) delai = 60000;
        if (delai === 0 || (masqueDepuis && Date.now() - masqueDepuis >= delai)) {
          Verrou.afficher();
        }
      });
    },

    /** Verrouillage immédiat, depuis les réglages. */
    verrouillerMaintenant: function () {
      if (Verrou.estActif()) Verrou.afficher();
      else UI.toast("Aucun code n'est défini.", "error");
    }
  };

  global.Verrou = Verrou;
})(window);
