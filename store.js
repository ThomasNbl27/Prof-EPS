/* =====================================================================
   store.js — persistance locale
   Remplace SQLite : tout est stocké dans le navigateur du professeur.
   Aucune donnée ne quitte le téléphone (RGPD : les élèves sont nommés).
   ===================================================================== */
(function (global) {
  "use strict";

  var CLE = "jarvis-eps";
  var VERSION = 1;

  var vide = {
    version: VERSION,
    seances: [],
    evenements: [],
    eleves: [],
    competences: [],
    attendus: [],
    evaluations: [],
    asEleves: [],
    asSeances: [],
    grillesTypes: [],
    reglages: {
      theme: "auto",          // auto | clair | sombre
      seuilAlerte: 3,         // nb d'oublis/absences/dispenses déclenchant une alerte
      enseignant: "",
      etablissement: "",
      baseInitialisee: false,
      codeEmpreinte: "",        // empreinte du code d'accès (jamais le code lui-même)
      codeGrain: "",
      codeAlgo: "",
      codeInitialise: false,
      delaiVerrou: 60000,       // reverrouillage après ce temps en arrière-plan
      derniereSauvegarde: "",
      rappelReporteAu: "",
      profPrincipal: false,     // affiche l'onglet « Prof principal »
      classePP: "",             // classe dont on est professeur principal
      modeTerrain: false,       // gros boutons pour utiliser l'appli au gymnase
      rappelSauvegardeJours: 7  // délai avant le rappel de sauvegarde
    }
  };

  var TABLES = ["seances", "evenements", "eleves", "competences", "attendus",
                "evaluations", "asEleves", "asSeances", "grillesTypes"];

  var etat = null;
  var abonnes = [];
  var dernierEchec = null;

  /* ---------- Lecture / écriture ---------- */

  function lire() {
    try {
      var brut = localStorage.getItem(CLE);
      if (!brut) return clone(vide);
      var donnees = JSON.parse(brut);
      return migrer(donnees);
    } catch (e) {
      dernierEchec = e;
      return clone(vide);
    }
  }

  function ecrire() {
    try {
      localStorage.setItem(CLE, JSON.stringify(etat));
      dernierEchec = null;
      return true;
    } catch (e) {
      // Quota dépassé ou stockage bloqué (navigation privée) : on prévient.
      dernierEchec = e;
      if (global.UI && UI.toast) {
        UI.toast("Sauvegarde impossible : espace de stockage plein ou navigation privée.", "error", 6000);
      }
      return false;
    }
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /** Complète les données anciennes avec les champs manquants. */
  function migrer(donnees) {
    var base = clone(vide);
    if (!donnees || typeof donnees !== "object") return base;
    TABLES.forEach(function (t) {
      if (Array.isArray(donnees[t])) base[t] = donnees[t];
    });
    if (donnees.reglages && typeof donnees.reglages === "object") {
      Object.keys(base.reglages).forEach(function (k) {
        if (donnees.reglages[k] !== undefined) base.reglages[k] = donnees.reglages[k];
      });
    }
    base.version = VERSION;
    return base;
  }

  function notifier() {
    abonnes.forEach(function (fn) { fn(etat); });
  }

  /** Écrit puis prévient les vues. */
  function valider() {
    var ok = ecrire();
    notifier();
    return ok;
  }

  /* ---------- API générique de collection ---------- */

  function collection(nom) {
    return {
      tous: function () { return etat[nom].slice(); },

      trouver: function (id) {
        return etat[nom].filter(function (e) { return e.id === id; })[0] || null;
      },

      ajouter: function (objet) {
        var maintenant = new Date().toISOString();
        var enregistrement = Object.assign({}, objet, {
          id: objet.id || U.uid(),
          creeLe: maintenant,
          majLe: maintenant
        });
        etat[nom].push(enregistrement);
        valider();
        return enregistrement;
      },

      modifier: function (id, champs) {
        var enregistrement = this.trouver(id);
        if (!enregistrement) return null;
        Object.assign(enregistrement, champs, { majLe: new Date().toISOString() });
        valider();
        return enregistrement;
      },

      supprimer: function (id) {
        var avant = etat[nom].length;
        etat[nom] = etat[nom].filter(function (e) { return e.id !== id; });
        var supprime = etat[nom].length < avant;
        if (supprime) valider();
        return supprime;
      },

      remplacer: function (liste) {
        etat[nom] = liste;
        valider();
      },

      compter: function () { return etat[nom].length; }
    };
  }

  /* ---------- Objet public ---------- */

  var Store = {
    CLE: CLE,

    init: function () {
      etat = lire();
      return Store;
    },

    etat: function () { return etat; },

    abonner: function (fn) {
      abonnes.push(fn);
      return function () {
        abonnes = abonnes.filter(function (f) { return f !== fn; });
      };
    },

    /* Collections (créées après init) */
    seances: null,
    evenements: null,
    eleves: null,
    competences: null,
    attendus: null,
    evaluations: null,
    asEleves: null,
    asSeances: null,
    grillesTypes: null,

    /* ---- Réglages ---- */
    reglages: function () { return etat.reglages; },

    majReglages: function (champs) {
      Object.assign(etat.reglages, champs);
      valider();
      return etat.reglages;
    },

    /* ---- Séances : tri et filtres ---- */
    seancesTriees: function () {
      return etat.seances.slice().sort(function (a, b) {
        if (a.date === b.date) return (b.creeLe || "").localeCompare(a.creeLe || "");
        return (b.date || "").localeCompare(a.date || "");
      });
    },

    /* ---- Événements ---- */
    evenementsTries: function () {
      return etat.evenements.slice().sort(function (a, b) {
        var ka = (a.date || "") + " " + (a.heure || "24:00");
        var kb = (b.date || "") + " " + (b.heure || "24:00");
        return ka.localeCompare(kb);
      });
    },

    /* ---- Élèves ---- */
    elevesTries: function () {
      return etat.eleves.slice().sort(function (a, b) {
        var c = U.comparerClasses(a.classe, b.classe);
        return c !== 0 ? c : U.normaliser(a.nom).localeCompare(U.normaliser(b.nom), "fr");
      });
    },

    /** Élèves ayant atteint le seuil d'alerte sur au moins un compteur. */
    alertes: function () {
      var seuil = Number(etat.reglages.seuilAlerte) || 3;
      return etat.eleves.filter(function (e) {
        return Store.totalCompteurs(e, seuil) > 0;
      }).sort(function (a, b) {
        var sa = (a.oublis || 0) + (a.oublisMateriel || 0) + (a.absences || 0);
        var sb = (b.oublis || 0) + (b.oublisMateriel || 0) + (b.absences || 0);
        return sb - sa;
      });
    },

    /** Nombre de compteurs (oublis tenue, oublis matériel, absences) au seuil. */
    totalCompteurs: function (e, seuil) {
      seuil = seuil || Number(etat.reglages.seuilAlerte) || 3;
      return ((e.oublis || 0) >= seuil ? 1 : 0) +
             ((e.oublisMateriel || 0) >= seuil ? 1 : 0) +
             ((e.absences || 0) >= seuil ? 1 : 0);
    },

    /* ---- Dispenses (périodes avec date de début et de fin) ---- */

    /** État d'une dispense : avenir | encours | bientot | terminee. */
    statutDispense: function (d) {
      var auj = U.aujourdhui();
      var fin = d.fin || d.debut;
      var jours = Math.round((U.depuisISO(fin) - U.depuisISO(auj)) / 86400000);
      if ((d.debut || "") > auj) return { etat: "avenir", jours: jours };
      if (fin < auj) return { etat: "terminee", jours: jours };
      if (jours <= 2) return { etat: "bientot", jours: jours };
      return { etat: "encours", jours: jours };
    },

    /** Dispenses qui se terminent (dans 2 jours ou moins) ou terminées non pointées. */
    alertesDispenses: function () {
      var liste = [];
      etat.eleves.forEach(function (e) {
        (e.dispensesListe || []).forEach(function (d) {
          var st = Store.statutDispense(d);
          if (st.etat === "bientot" || (st.etat === "terminee" && !d.vue)) {
            liste.push({ eleve: e, dispense: d, statut: st });
          }
        });
      });
      return liste.sort(function (a, b) {
        return (a.dispense.fin || "").localeCompare(b.dispense.fin || "");
      });
    },

    /** Dispense actuellement en cours pour un élève (ou null). */
    dispenseEnCours: function (e) {
      var auj = U.aujourdhui();
      return (e.dispensesListe || []).filter(function (d) {
        return (d.debut || "") <= auj && (d.fin || d.debut) >= auj;
      }).sort(function (a, b) { return (b.fin || "").localeCompare(a.fin || ""); })[0] || null;
    },

    /** Texte court pour les exports : « jusqu'au 12 déc. » ou « — ». */
    libelleDispense: function (e) {
      var d = Store.dispenseEnCours(e);
      return d ? "jusqu'au " + U.dateLongue(d.fin || d.debut) : "";
    },

    /* ---- Trimestres et notes ---- */

    /** Trimestre scolaire (1 = sept.-déc., 2 = janv.-mars, 3 = avril-août). */
    trimestreDe: function (iso) {
      var d = U.depuisISO(iso || U.aujourdhui());
      var m = d ? d.getMonth() + 1 : 9;
      return m >= 9 ? 1 : m <= 3 ? 2 : 3;
    },

    /** Bornes de points d'un niveau (1 à 4) : valeur fixe si min = max, intervalle sinon. */
    bornesNiveau: function (c, niveau) {
      var i = niveau - 1;
      var P = Number(c.points) || 0;
      var min, max;
      if (c.ptsMin && c.ptsMax && c.ptsMin.length === 4 && c.ptsMax.length === 4) {
        min = Number(c.ptsMin[i]);
        max = c.ptsMax[i] === "" || c.ptsMax[i] === null ? min : Number(c.ptsMax[i]);
      } else {
        // Anciennes grilles : une seule valeur par niveau.
        min = max = c.pts && c.pts.length === 4 ? Number(c.pts[i]) : P * niveau / 4;
      }
      if (isNaN(min)) min = 0;
      if (isNaN(max) || max < min) max = min;
      return { min: min, max: max };
    },

    /** Valeur proposée par défaut dans un intervalle : le milieu, au quart de point près. */
    valeurParDefaut: function (b) {
      if (b.max <= b.min) return b.min;
      var m = Math.round((b.min + b.max) / 2 * 4) / 4;
      return Math.min(b.max, Math.max(b.min, m));
    },

    /** Points attribués à un élève sur une compétence (null si aucun niveau choisi). */
    pointsCompetence: function (ev, idEleve, c) {
      var niveau = ev.resultats && ev.resultats[idEleve] && ev.resultats[idEleve][c.id];
      if (!(niveau >= 1 && niveau <= 4)) return null;
      var b = Store.bornesNiveau(c, niveau);
      if (b.max <= b.min) return b.min;
      var precis = ev.points && ev.points[idEleve] && ev.points[idEleve][c.id];
      if (typeof precis === "number" && !isNaN(precis)) return Math.min(b.max, Math.max(b.min, precis));
      return Store.valeurParDefaut(b);
    },

    /**
     * Note d'un élève pour une évaluation.
     * Chaque compétence rapporte les points du niveau choisi (1 à 4).
     * Le total est ramené sur 20.
     */
    calculNote: function (ev, idEleve) {
      var res = (ev.resultats && ev.resultats[idEleve]) || {};
      var statut = (ev.statuts && ev.statuts[idEleve]) || "";   // "absent" | "dispense" : pas de note
      var total = 0, gagnes = 0, evaluees = 0, nb = 0;
      (ev.afl || []).forEach(function (a) {
        (a.competences || []).forEach(function (c) {
          var pts = Number(c.points) || 0;
          total += pts;
          nb++;
          var obtenus = Store.pointsCompetence(ev, idEleve, c);
          if (obtenus !== null) {
            evaluees++;
            gagnes += obtenus;
          }
        });
      });
      return {
        total: total,
        gagnes: gagnes,
        evaluees: evaluees,
        nbCompetences: nb,
        statut: statut,
        sur20: !statut && evaluees && total > 0 ? gagnes * 20 / total : null
      };
    },

    /** Moyenne (pondérée par les coefficients) d'un élève pour un trimestre ; null si aucune note. */
    moyenneTrimestre: function (eleve, trimestre) {
      var notes = Store.notesEleve(eleve).filter(function (n) { return n.trimestre === trimestre; });
      var poids = notes.reduce(function (t, n) { return t + n.coef; }, 0);
      if (!notes.length || poids <= 0) return null;
      return notes.reduce(function (t, n) { return t + n.sur20 * n.coef; }, 0) / poids;
    },

    /** Moyenne annuelle : moyenne des moyennes de trimestre disponibles. */
    moyenneAnnuelle: function (eleve) {
      var m = [1, 2, 3].map(function (t) { return Store.moyenneTrimestre(eleve, t); })
        .filter(function (n) { return n !== null; });
      return m.length ? m.reduce(function (a, b) { return a + b; }, 0) / m.length : null;
    },

    /** Statistiques d'une évaluation sur une liste d'élèves. */
    statistiquesEvaluation: function (ev, eleves) {
      var notes = [], absents = 0, dispenses = 0;
      eleves.forEach(function (e) {
        var n = Store.calculNote(ev, e.id);
        if (n.statut === "absent") absents++;
        else if (n.statut === "dispense") dispenses++;
        else if (n.sur20 !== null) notes.push(n.sur20);
      });
      notes.sort(function (a, b) { return a - b; });
      var tranches = [0, 0, 0, 0];    // 0-5, 5-10, 10-15, 15-20
      notes.forEach(function (n) { tranches[Math.min(3, Math.floor(n / 5))]++; });
      var milieu = Math.floor(notes.length / 2);
      return {
        nb: notes.length, absents: absents, dispenses: dispenses, tranches: tranches,
        moyenne: notes.length ? notes.reduce(function (a, b) { return a + b; }, 0) / notes.length : null,
        mediane: !notes.length ? null : notes.length % 2 ? notes[milieu] : (notes[milieu - 1] + notes[milieu]) / 2,
        min: notes.length ? notes[0] : null,
        max: notes.length ? notes[notes.length - 1] : null
      };
    },

    /** Toutes les notes /20 d'un élève, issues de ses évaluations. */
    notesEleve: function (eleve) {
      var sortie = [];
      etat.evaluations.forEach(function (ev) {
        if (ev.classe !== eleve.classe) return;
        var n = Store.calculNote(ev, eleve.id);
        if (n.sur20 === null) return;
        var coef = parseFloat(ev.coef);
        if (isNaN(coef) || coef < 0) coef = 1;
        sortie.push({
          evaluation: ev, sur20: n.sur20, gagnes: n.gagnes, total: n.total, coef: coef,
          trimestre: Number(ev.trimestre) || Store.trimestreDe(ev.date)
        });
      });
      return sortie.sort(function (a, b) { return (a.evaluation.date || "").localeCompare(b.evaluation.date || ""); });
    },

    /** 12.5 -> « 12,5 » ; 12 -> « 12 » (deux décimales au plus). */
    formaterNote: function (n) {
      if (n === null || n === undefined || isNaN(n)) return "—";
      return String(Math.round(n * 100) / 100).replace(".", ",");
    },

    /** Incrémente un compteur en le bornant à zéro. */
    compteur: function (idEleve, champ, delta) {
      var eleve = Store.eleves.trouver(idEleve);
      if (!eleve) return null;
      var avant = Number(eleve[champ]) || 0;
      var valeur = Math.max(0, avant + delta);
      var patch = {};
      patch[champ] = valeur;

      // Historique daté : une ligne par oubli ou absence ajouté(e).
      if (["oublis", "oublisMateriel", "absences"].indexOf(champ) !== -1) {
        var histo = (eleve.historique || []).slice();
        if (valeur > avant) {
          histo.push({ id: U.uid(), date: U.aujourdhui(), type: champ });
        } else if (valeur < avant) {
          for (var i = histo.length - 1; i >= 0; i--) {
            if (histo[i].type === champ) { histo.splice(i, 1); break; }
          }
        }
        patch.historique = histo;
      }
      return Store.eleves.modifier(idEleve, patch);
    },

    /* ---- Listes dérivées (pour les menus déroulants) ---- */
    listeClasses: function () {
      var vues = {};
      etat.eleves.forEach(function (e) { if (e.classe) vues[e.classe.trim()] = 1; });
      etat.seances.forEach(function (s) { if (s.classe) vues[s.classe.trim()] = 1; });
      return Object.keys(vues).sort(U.comparerClasses);
    },

    listeActivites: function () {
      var vues = {};
      etat.seances.forEach(function (s) { if (s.activite) vues[s.activite.trim()] = 1; });
      etat.competences.forEach(function (c) { if (c.apsa) vues[c.apsa.trim()] = 1; });
      etat.attendus.forEach(function (a) { if (a.apsa) vues[a.apsa.trim()] = 1; });
      return Object.keys(vues).sort(function (a, b) {
        return U.normaliser(a).localeCompare(U.normaliser(b), "fr");
      });
    },

    /* ---- Sauvegarde / restauration ---- */
    exporterJSON: function (photos) {
      var sortie = {
        application: "Prof EPS+",
        version: VERSION,
        exporteLe: new Date().toISOString(),
        donnees: etat
      };
      if (photos && Object.keys(photos).length) sortie.photos = photos;
      return JSON.stringify(sortie, null, 2);
    },

    /**
     * Restaure une sauvegarde.
     * mode "remplacer" : écrase tout. mode "fusionner" : ajoute ce qui manque.
     */
    importerJSON: function (texte, mode) {
      var lu = JSON.parse(texte);
      var donnees = lu && lu.donnees ? lu.donnees : lu;
      if (!donnees || typeof donnees !== "object") throw new Error("Fichier illisible.");
      var entrant = migrer(donnees);

      if (mode === "fusionner") {
        TABLES.forEach(function (t) {
          var connus = {};
          etat[t].forEach(function (e) { connus[e.id] = 1; });
          entrant[t].forEach(function (e) {
            if (!e.id || !connus[e.id]) etat[t].push(Object.assign({}, e, { id: e.id || U.uid() }));
          });
        });
      } else {
        etat = entrant;
      }
      valider();
      if (lu && lu.photos && global.Photos) Photos.importer(lu.photos, mode);
      return {
        seances: etat.seances.length,
        eleves: etat.eleves.length,
        competences: etat.competences.length,
        attendus: etat.attendus.length
      };
    },

    /** Nouvelle année scolaire : on garde séances, base EPS, agenda, grilles types et réglages. */
    nouvelleAnnee: function () {
      etat.eleves = [];
      etat.evaluations = [];
      etat.asEleves = [];
      etat.asSeances = [];
      etat.reglages.classePP = "";
      valider();
      if (global.Photos) Photos.vider();
    },

    toutEffacer: function () {
      etat = clone(vide);
      valider();
      if (global.Photos) Photos.vider();
    },

    /** Volume approximatif occupé, affiché dans les réglages. */
    poids: function () {
      try {
        var octets = new Blob([JSON.stringify(etat)]).size;
        return octets < 1024 ? octets + " o"
             : octets < 1048576 ? (octets / 1024).toFixed(1) + " Ko"
             : (octets / 1048576).toFixed(1) + " Mo";
      } catch (e) { return "—"; }
    },

    stockageDisponible: function () {
      try {
        localStorage.setItem("__test__", "1");
        localStorage.removeItem("__test__");
        return true;
      } catch (e) { return false; }
    },

    dernierEchec: function () { return dernierEchec; }
  };

  Store.init();
  Store.seances = collection("seances");
  Store.evenements = collection("evenements");
  Store.eleves = collection("eleves");
  Store.competences = collection("competences");
  Store.attendus = collection("attendus");
  Store.evaluations = collection("evaluations");
  Store.asEleves = collection("asEleves");
  Store.asSeances = collection("asSeances");
  Store.grillesTypes = collection("grillesTypes");

  global.Store = Store;
})(window);
