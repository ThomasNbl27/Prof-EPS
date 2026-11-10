/* =====================================================================
   utils.js — fonctions transverses (dates, texte, DOM)
   ===================================================================== */
(function (global) {
  "use strict";

  var MOIS = ["janvier","février","mars","avril","mai","juin",
              "juillet","août","septembre","octobre","novembre","décembre"];
  var MOIS_COURT = ["janv.","févr.","mars","avr.","mai","juin",
                    "juil.","août","sept.","oct.","nov.","déc."];
  var JOURS = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];

  var U = {

    /* ---- Identifiants ---- */
    uid: function () {
      return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
    },

    /* ---- Dates (format interne : AAAA-MM-JJ) ---- */
    aujourdhui: function () {
      return U.versISO(new Date());
    },

    versISO: function (d) {
      var m = String(d.getMonth() + 1).padStart(2, "0");
      var j = String(d.getDate()).padStart(2, "0");
      return d.getFullYear() + "-" + m + "-" + j;
    },

    depuisISO: function (iso) {
      if (!iso) return null;
      var p = String(iso).split("-");
      if (p.length !== 3) return null;
      var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
      return isNaN(d.getTime()) ? null : d;
    },

    /** "2026-03-12" -> "12 mars 2026" (variante courte : "12 mars") */
    dateLongue: function (iso, sansAnnee) {
      var d = U.depuisISO(iso);
      if (!d) return iso || "";
      return d.getDate() + " " + MOIS[d.getMonth()] + (sansAnnee ? "" : " " + d.getFullYear());
    },

    dateAvecJour: function (iso) {
      var d = U.depuisISO(iso);
      if (!d) return iso || "";
      return JOURS[d.getDay()] + " " + d.getDate() + " " + MOIS[d.getMonth()] + " " + d.getFullYear();
    },

    moisCourt: function (iso) {
      var d = U.depuisISO(iso);
      return d ? MOIS_COURT[d.getMonth()] : "";
    },

    jourDuMois: function (iso) {
      var d = U.depuisISO(iso);
      return d ? String(d.getDate()) : "–";
    },

    /** "il y a 3 jours", "aujourd'hui", "dans 2 jours" */
    dateRelative: function (iso) {
      var d = U.depuisISO(iso);
      if (!d) return "";
      var t = new Date(); t.setHours(0, 0, 0, 0);
      var ecart = Math.round((d - t) / 86400000);
      if (ecart === 0) return "aujourd'hui";
      if (ecart === -1) return "hier";
      if (ecart === 1) return "demain";
      if (ecart < 0 && ecart > -7) return "il y a " + (-ecart) + " jours";
      if (ecart > 0 && ecart < 7) return "dans " + ecart + " jours";
      return U.dateLongue(iso, d.getFullYear() === new Date().getFullYear());
    },

    moisAnnee: function (iso) {
      var d = U.depuisISO(iso);
      if (!d) return "Sans date";
      return U.majuscule(MOIS[d.getMonth()]) + " " + d.getFullYear();
    },

    /* ---- Texte ---- */
    majuscule: function (s) {
      s = String(s || "");
      return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
    },

    /** Minuscules sans accents : base de toutes les recherches. */
    normaliser: function (s) {
      return String(s || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[’‘]/g, "'")
        .replace(/[“”]/g, '"');
    },

    /** Échappe le HTML : indispensable, tout le contenu vient de l'utilisateur. */
    echapper: function (s) {
      return String(s === null || s === undefined ? "" : s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    },

    tronquer: function (s, n) {
      s = String(s || "").replace(/\s+/g, " ").trim();
      return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
    },

    initiales: function (nom) {
      var mots = String(nom || "").trim().split(/[\s-]+/).filter(Boolean);
      if (!mots.length) return "?";
      if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
      return (mots[0][0] + mots[mots.length - 1][0]).toUpperCase();
    },

    pluriel: function (n, singulier, plurielMot) {
      return n + " " + (n > 1 ? (plurielMot || singulier + "s") : singulier);
    },

    /* ---- Tri ---- */
    /** Trie des classes façon humaine : 6A, 6B, 5A, 4C, 3B, 2nde... */
    comparerClasses: function (a, b) {
      var na = U.normaliser(a), nb = U.normaliser(b);
      var da = parseInt((na.match(/\d+/) || ["99"])[0], 10);
      var db = parseInt((nb.match(/\d+/) || ["99"])[0], 10);
      if (da !== db) return db - da; // 6e avant 5e avant 4e...
      return na.localeCompare(nb, "fr");
    },

    /* ---- DOM ---- */
    $: function (sel, racine) { return (racine || document).querySelector(sel); },
    $$: function (sel, racine) {
      return Array.prototype.slice.call((racine || document).querySelectorAll(sel));
    },

    /** Crée un élément à partir d'une chaîne HTML. */
    depuisHTML: function (html) {
      var t = document.createElement("template");
      t.innerHTML = String(html).trim();
      return t.content.firstElementChild;
    },

    /** Délégation d'événement : U.sur(racine, "click", "[data-x]", fn) */
    sur: function (racine, type, selecteur, gestionnaire) {
      racine.addEventListener(type, function (e) {
        var cible = e.target.closest(selecteur);
        if (cible && racine.contains(cible)) gestionnaire.call(cible, e, cible);
      });
    },

    /** Regroupe un tableau par clé : renvoie [[cle, elements], ...] */
    grouper: function (liste, cle) {
      var carte = new Map();
      liste.forEach(function (el) {
        var k = typeof cle === "function" ? cle(el) : el[cle];
        if (!carte.has(k)) carte.set(k, []);
        carte.get(k).push(el);
      });
      return Array.from(carte.entries());
    },

    /** Anti-rebond, pour les champs de recherche. */
    antiRebond: function (fn, delai) {
      var t;
      return function () {
        var args = arguments, ctx = this;
        clearTimeout(t);
        t = setTimeout(function () { fn.apply(ctx, args); }, delai || 200);
      };
    },

    /** Déclenche le téléchargement d'un fichier généré côté navigateur. */
    telecharger: function (nomFichier, contenu, type) {
      var blob = contenu instanceof Blob ? contenu : new Blob([contenu], { type: type || "text/plain;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = nomFichier;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    },

    /** Petite vibration de confirmation (ignorée si non supportée). */
    vibrer: function (ms) {
      try { if (navigator.vibrate) navigator.vibrate(ms || 12); } catch (e) {}
    }
  };

  global.U = U;
})(window);
