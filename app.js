/* =====================================================================
   app.js — assemblage : navigation, thème, installation, hors-ligne
   ===================================================================== */
(function (global) {
  "use strict";

  var VERSION = "1.5.0";
  var vueCourante = "accueil";

  /** Onglets affichés. « Prof principal » n'apparaît que si l'option est cochée. */
  function ordre() {
    var liste = ["accueil", "agenda", "seances", "eleves", "as", "evals", "resume"];
    if (Store.reglages().profPrincipal) liste.push("pp");
    return liste.concat(["base", "pdf", "reglages"]);
  }

  var App = {
    VERSION: VERSION,
    invitationInstallation: null,

    /* ---------- Navigation ---------- */

    aller: function (nom, options) {
      if (!Vues[nom] || (nom === "pp" && !Store.reglages().profPrincipal)) nom = "accueil";
      // Retoucher l'onglet déjà ouvert ramène à son écran d'accueil (ex. liste des évaluations).
      if (nom === vueCourante && Vues[nom].reinitialiser && !(options && options.sansHistorique)) Vues[nom].reinitialiser();
      vueCourante = nom;
      if (!options || !options.sansHistorique) {
        try { history.replaceState({ vue: nom }, "", "#" + nom); } catch (e) {}
      }
      App.rendre();
      var zone = document.getElementById("view");
      zone.scrollTop = 0;
      global.scrollTo(0, 0);
    },

    rendre: function () {
      var vue = Vues[vueCourante];
      var zone = document.getElementById("view");
      // Chaque rendu se fait dans un nœud neuf : les écouteurs délégués posés
      // par la vue disparaissent avec lui, au lieu de s'accumuler.
      zone.innerHTML = "";
      var page = document.createElement("div");
      page.className = "page";
      zone.appendChild(page);
      vue.rendre(page);

      document.getElementById("topbar-title").textContent = vue.titre;
      document.getElementById("topbar-sub").textContent = vue.sousTitre || "";
      document.title = (vueCourante === "accueil" ? "" : vue.titre + " · ") + "Prof EPS+";

      // Le bouton flottant n'a de sens que sur les vues liées aux séances.
      document.getElementById("fab").hidden = (vueCourante !== "accueil" && vueCourante !== "seances");

      App.majNavigation();
    },

    /** Redessine la vue courante après une modification des données. */
    rafraichir: function (options) {
      if (options && options.silencieux) { App.majNavigation(); return; }
      App.rendre();
    },

    majNavigation: function () {
      var pastilles = {
        eleves: Store.alertes().length + Store.alertesDispenses().length,
        agenda: Rappels.aujourdhui()
      };

      var ORDRE = ordre();
      var onglets = ORDRE.map(function (nom) {
        var vue = Vues[nom];
        var pastille = pastilles[nom]
          ? '<span class="tab__badge' + (nom === "agenda" ? " tab__badge--calme" : "") + '">' +
            pastilles[nom] + "</span>" : "";
        return '<button class="tab" type="button" data-vue="' + nom + '"' +
          (nom === vueCourante ? ' aria-current="page"' : "") + ">" +
          UI.icone(vue.icone) + pastille + "<span>" + U.echapper(vue.onglet) + "</span></button>";
      }).join("");
      var barre = document.getElementById("tabbar");
      barre.innerHTML = onglets;
      // La barre défile : l'onglet actif doit rester visible.
      var actif = barre.querySelector('[aria-current="page"]');
      if (actif) barre.scrollLeft = actif.offsetLeft - (barre.clientWidth - actif.offsetWidth) / 2;

      var liens = ORDRE.map(function (nom) {
        var vue = Vues[nom];
        var pastille = pastilles[nom]
          ? '<span class="navlink__badge' + (nom === "agenda" ? " navlink__badge--calme" : "") + '">' +
            pastilles[nom] + "</span>" : "";
        return '<button class="navlink" type="button" data-vue="' + nom + '"' +
          (nom === vueCourante ? ' aria-current="page"' : "") + ">" +
          UI.icone(vue.icone) + "<span>" + U.echapper(vue.onglet) + "</span>" + pastille + "</button>";
      }).join("");
      document.getElementById("sidenav-links").innerHTML = liens;
    },

    /* ---------- Thème ---------- */

    appliquerTheme: function () {
      var theme = Store.reglages().theme || "auto";
      if (theme === "auto") document.documentElement.removeAttribute("data-theme");
      else document.documentElement.setAttribute("data-theme", theme);
      document.documentElement.classList.toggle("terrain", !!Store.reglages().modeTerrain);
    },

    basculerTheme: function () {
      var actuel = Store.reglages().theme || "auto";
      var sombreSysteme = global.matchMedia && global.matchMedia("(prefers-color-scheme: dark)").matches;
      var suivant;
      if (actuel === "auto") suivant = sombreSysteme ? "clair" : "sombre";
      else if (actuel === "clair") suivant = "sombre";
      else suivant = "clair";
      Store.majReglages({ theme: suivant });
      App.appliquerTheme();
      UI.toast("Thème " + suivant + ".", "info", 1600);
      if (vueCourante === "reglages") App.rendre();
    },

    /* ---------- Démarrage ---------- */

    demarrer: function () {
      App.appliquerTheme();
      Seed.initialiser();
      Verrou.surveiller();

      if (!Store.stockageDisponible()) {
        UI.toast("Stockage bloqué : quittez la navigation privée pour conserver vos données.", "error", 8000);
      }

      /* Navigation */
      document.addEventListener("click", function (e) {
        var onglet = e.target.closest("[data-vue]");
        if (onglet) { App.aller(onglet.getAttribute("data-vue")); return; }
        var ajout = e.target.closest('[data-action="nouvelle-seance"]');
        if (ajout) { Vues.seances.ouvrirFormulaire(null); return; }
        var dictee = e.target.closest('[data-action="dicter-seance"]');
        if (dictee) {
          Vues.seances.ouvrirDictee(function (infos) {
            Vues.seances.ouvrirFormulaire(null);
            setTimeout(function () { remplirFormulaire(infos); }, 80);
          });
        }
      });

      document.getElementById("btn-theme").addEventListener("click", App.basculerTheme);

      /* Ombre de l'en-tête au défilement */
      var topbar = document.getElementById("topbar");
      global.addEventListener("scroll", function () {
        topbar.classList.toggle("is-stuck", global.scrollY > 4);
      }, { passive: true });

      /* Retour navigateur */
      global.addEventListener("popstate", function () {
        var nom = (location.hash || "#accueil").slice(1);
        App.aller(Vues[nom] ? nom : "accueil", { sansHistorique: true });
      });

      /* Invitation à installer (Android/Chrome) */
      global.addEventListener("beforeinstallprompt", function (e) {
        e.preventDefault();
        App.invitationInstallation = e;
        if (vueCourante === "reglages") App.rendre();
      });

      /* Mode hors connexion */
      if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
        global.addEventListener("load", function () {
          navigator.serviceWorker.register("sw.js").catch(function () { /* sans conséquence */ });
        });
      }

      // Le contenu n'est dessiné qu'une fois le code saisi : rien ne
      // s'affiche derrière l'écran de verrouillage. L'amorçage du code
      // livré est asynchrone, d'où l'attente avant de décider.
      Verrou.initialiser().then(function () {
        if (Verrou.estActif()) Verrou.afficher(App.lancerInterface);
        else App.lancerInterface();
      });
    },

    lancerInterface: function () {
      Rappels.demarrer();
      var depart = (location.hash || "#accueil").slice(1);
      App.aller(Vues[depart] ? depart : "accueil");
    }
  };

  /** Remplit le formulaire ouvert avec le résultat d'une dictée. */
  function remplirFormulaire(infos) {
    var paires = {
      "#s-date": infos.date, "#s-classe": infos.classe, "#s-activite": infos.activite,
      "#s-contenu": infos.contenu, "#s-observations": infos.observations
    };
    Object.keys(paires).forEach(function (selecteur) {
      var champ = document.querySelector(selecteur);
      if (champ && paires[selecteur]) champ.value = paires[selecteur];
    });
    var classe = document.querySelector("#s-classe");
    if (classe) {
      classe.dispatchEvent(new Event("change", { bubbles: true }));
      var contenu = document.querySelector("#s-contenu");
      if (contenu) contenu.dispatchEvent(new Event("input", { bubbles: true }));
    }
    UI.toast("Séance pré-remplie. Vérifiez avant d'enregistrer.", "info", 4000);
  }

  global.App = App;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", App.demarrer);
  } else {
    App.demarrer();
  }
})(window);
