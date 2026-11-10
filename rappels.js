/* =====================================================================
   rappels.js — moteur de rappels de l'agenda
   Deux échéances par événement : la veille (24 h avant) et 3 h avant.
   Le moteur tourne quand l'application est ouverte ; à l'ouverture, il
   rattrape ce qui est passé pendant qu'elle était fermée. Pour des
   notifications garanties application fermée, l'événement s'ajoute au
   calendrier du téléphone avec les deux alarmes intégrées (voir ics.js).
   ===================================================================== */
(function (global) {
  "use strict";

  var TIC = 30000;               // vérification toutes les 30 secondes
  var minuteur = null;

  var ECHEANCES = [
    { cle: "veille", delai: 24 * 3600e3, actif: function (e) { return e.rappelVeille !== false; } },
    { cle: "troisHeures", delai: 3 * 3600e3, actif: function (e) { return e.rappel3h !== false; } }
  ];

  /* ---------- Dates ---------- */

  /** Début d'un événement en Date locale (08:30 par défaut sans heure). */
  function debutDe(evt) {
    var d = U.depuisISO(evt.date);
    if (!d) return null;
    var h = /^\d{1,2}:\d{2}$/.test(evt.heure || "") ? evt.heure.split(":") : ["8", "30"];
    d.setHours(Number(h[0]), Number(h[1]), 0, 0);
    return d;
  }

  function heureLisible(heure) {
    if (!/^\d{1,2}:\d{2}$/.test(heure || "")) return "";
    return heure.replace(":", "h");
  }

  function libelle(evt, debut) {
    var restant = debut.getTime() - Date.now();
    var heures = Math.round(restant / 3600e3);
    var quand;
    if (heures < 1) quand = "dans moins d'une heure";
    else if (heures <= 6) quand = "dans " + U.pluriel(heures, "heure");
    else quand = U.dateRelative(evt.date) + (evt.heure ? " à " + heureLisible(evt.heure) : "");
    return U.majuscule(quand) + (evt.lieu ? " · " + evt.lieu : "");
  }

  /* ---------- Notifications système ---------- */

  function notificationsDisponibles() {
    return typeof Notification !== "undefined" && !!Notification.requestPermission;
  }

  function permission() {
    return notificationsDisponibles() ? Notification.permission : "indisponible";
  }

  function demanderPermission() {
    if (!notificationsDisponibles()) return Promise.resolve("indisponible");
    try {
      return Promise.resolve(Notification.requestPermission());
    } catch (e) {
      // Ancienne signature à rappel.
      return new Promise(function (resoudre) { Notification.requestPermission(resoudre); });
    }
  }

  function notifier(evt, cle, debut) {
    var titre = evt.titre || "Événement";
    var corps = libelle(evt, debut);

    if (permission() === "granted") {
      var options = { body: corps, tag: evt.id + "-" + cle, icon: "icon-192.png" };
      if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready
          .then(function (sw) { return sw.showNotification(titre, options); })
          .catch(function () { essayerConstructeur(titre, options); });
      } else {
        essayerConstructeur(titre, options);
      }
    }
    // Toujours un rappel visible dans l'application elle-même.
    if (!document.hidden) {
      UI.toast(titre + " — " + corps, "info", 8000);
      U.vibrer(30);
    }
  }

  function essayerConstructeur(titre, options) {
    try { new Notification(titre, options); } catch (e) { /* iOS : constructeur absent */ }
  }

  /* ---------- Passage ---------- */

  /** Parcourt les événements et déclenche les rappels arrivés à échéance. */
  function passage() {
    var maintenant = Date.now();
    Store.evenements.tous().forEach(function (evt) {
      var debut = debutDe(evt);
      if (!debut) return;
      var t = debut.getTime();
      var envoye = evt.envoye || {};
      var modifie = false;
      var arrivees = [];

      ECHEANCES.forEach(function (echeance) {
        if (!echeance.actif(evt) || envoye[echeance.cle]) return;
        if (maintenant >= t) {
          // L'événement est passé : on classe sans notifier.
          envoye[echeance.cle] = "obsolete";
          modifie = true;
          return;
        }
        if (maintenant >= t - echeance.delai) {
          envoye[echeance.cle] = new Date().toISOString();
          modifie = true;
          arrivees.push(echeance);
        }
      });

      // Plusieurs échéances tombées en même temps (événement créé au dernier
      // moment, application rouverte tard) : une seule notification suffit.
      if (arrivees.length) notifier(evt, arrivees[arrivees.length - 1].cle, debut);

      if (modifie) Store.evenements.modifier(evt.id, { envoye: envoye });
    });
  }

  /* ---------- Cycle de vie ---------- */

  var Rappels = {
    debutDe: debutDe,
    heureLisible: heureLisible,
    notificationsDisponibles: notificationsDisponibles,
    permission: permission,
    demanderPermission: demanderPermission,
    passage: passage,

    demarrer: function () {
      if (minuteur) return;
      passage();
      minuteur = setInterval(passage, TIC);
      document.addEventListener("visibilitychange", function () {
        if (!document.hidden) passage();
      });
    },

    /** Événements du jour non encore passés (pastille de l'onglet). */
    aujourdhui: function () {
      var jour = U.aujourdhui();
      var maintenant = Date.now();
      return Store.evenements.tous().filter(function (evt) {
        if (evt.date !== jour) return false;
        var debut = debutDe(evt);
        return debut && debut.getTime() >= maintenant - 3600e3; // encore visible 1 h après
      }).length;
    },

    /** Prochains événements, pour l'accueil. */
    prochains: function (limite) {
      var jour = U.aujourdhui();
      return Store.evenementsTries()
        .filter(function (evt) { return (evt.date || "") >= jour; })
        .slice(0, limite || 3);
    }
  };

  global.Rappels = Rappels;
})(window);
