/* =====================================================================
   views/as.js — Association sportive
   Séparée des cours : sa propre liste d'élèves, et on note les PRÉSENTS
   (la venue est facultative, il n'y a donc pas d'absents).
   ===================================================================== */
(function (global) {
  "use strict";

  var onglet = "seances";     // seances | eleves
  var recherche = "";

  /* ---------- Statistiques ---------- */

  function presencesDe(idEleve) {
    return Store.asSeances.tous().filter(function (s) {
      return (s.presents || []).indexOf(idEleve) !== -1;
    }).sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); });
  }

  function elevesTries() {
    return Store.asEleves.tous().sort(function (a, b) {
      return U.normaliser(a.nom).localeCompare(U.normaliser(b.nom), "fr");
    });
  }

  function seancesTriees() {
    return Store.asSeances.tous().sort(function (a, b) {
      return (b.date || "").localeCompare(a.date || "");
    });
  }

  /* ================= VUE ================= */

  function rendre(conteneur) {
    var nbEleves = Store.asEleves.compter();
    var nbSeances = Store.asSeances.compter();

    conteneur.innerHTML =
      '<div class="page-head">' +
        "<h1>Association sportive</h1>" +
        "<p>" + U.pluriel(nbEleves, "élève") + " inscrit" + (nbEleves > 1 ? "s" : "") + " · " +
          U.pluriel(nbSeances, "séance") + "</p>" +
      "</div>" +
      '<div class="stack">' +
        '<div class="segmented" role="tablist">' +
          '<button role="tab" type="button" data-onglet="seances" aria-selected="' + (onglet === "seances") + '">Séances</button>' +
          '<button role="tab" type="button" data-onglet="eleves" aria-selected="' + (onglet === "eleves") + '">Élèves</button>' +
        "</div>" +
        '<div id="as-actions"></div>' +
      "</div>" +
      '<section class="section" id="as-liste"></section>';

    U.sur(conteneur, "click", "[data-onglet]", function (e, el) {
      onglet = el.getAttribute("data-onglet");
      U.$$("[data-onglet]", conteneur).forEach(function (b) {
        b.setAttribute("aria-selected", b.getAttribute("data-onglet") === onglet ? "true" : "false");
      });
      dessiner(conteneur);
    });
    U.sur(conteneur, "click", "[data-nouvelle-seance]", function () { ouvrirSeance(null); });
    U.sur(conteneur, "click", "[data-seance-as]", function (e, el) { ouvrirSeance(el.getAttribute("data-seance-as")); });
    U.sur(conteneur, "click", "[data-pdf-as]", function () {
      try {
        Exports.livrerPDF(documentPresences(), "presences-AS-" + U.aujourdhui() + ".pdf");
      } catch (err) { UI.toast("Création du PDF impossible : " + err.message, "error", 5000); }
    });
    U.sur(conteneur, "click", "[data-ajout-liste]", function () { ouvrirAjoutListe(); });
    U.sur(conteneur, "click", "[data-ajout-classes]", function () { ouvrirImportClasses(); });
    U.sur(conteneur, "click", "[data-eleve-as]", function (e, el) { ouvrirEleve(el.getAttribute("data-eleve-as")); });

    dessiner(conteneur);
  }

  function dessiner(conteneur) {
    var actions = conteneur.querySelector("#as-actions");
    var zone = conteneur.querySelector("#as-liste");

    if (onglet === "seances") {
      actions.innerHTML =
        '<button class="btn btn--primary btn--block" data-nouvelle-seance type="button">' +
          UI.icone("plus") + "Nouvelle séance d'AS</button>" + boutonPDF();
      zone.innerHTML = listeSeances();
    } else {
      actions.innerHTML =
        '<div class="btn-row">' +
          '<button class="btn btn--primary" data-ajout-liste type="button">' + UI.icone("plus") + "Ajouter des élèves</button>" +
          '<button class="btn" data-ajout-classes type="button">' + UI.icone("eleves") + "Depuis mes classes</button>" +
        "</div>" + boutonPDF() +
        (Store.asEleves.compter() ? UI.barreRecherche("Rechercher un élève…", recherche) : "");
      zone.innerHTML = listeEleves();
      var champ = actions.querySelector("[data-recherche]");
      if (champ) {
        champ.addEventListener("input", U.antiRebond(function () {
          recherche = champ.value;
          zone.innerHTML = listeEleves();
        }, 180));
      }
    }
  }

  function boutonPDF() {
    return Store.asSeances.compter() && Store.asEleves.compter()
      ? '<button class="btn btn--sm" data-pdf-as type="button" style="margin-top:8px">' + UI.icone("export") + "PDF des présences et taux de venue</button>"
      : "";
  }

  function taux(n, total) { return total ? Math.round(n * 100 / total) : 0; }

  function documentPresences() {
    var r = Store.reglages();
    var seances = seancesTriees().slice().reverse();      // du plus ancien au plus récent
    var total = seances.length;
    var eleves = elevesTries().map(function (e) {
      var venues = presencesDe(e.id);
      return { e: e, n: venues.length, derniere: venues[0] ? venues[0].date : "" };
    }).sort(function (a, b) { return b.n - a.n || U.normaliser(a.e.nom).localeCompare(U.normaliser(b.e.nom), "fr"); });
    var presentsParSeance = seances.map(function (s) {
      return (s.presents || []).filter(function (id) { return Store.asEleves.trouver(id); }).length;
    });
    var moyenne = total ? presentsParSeance.reduce(function (a, b) { return a + b; }, 0) / total : 0;

    var doc = PDF.document({ titre: "Association sportive — présences", pied: "Association sportive — présences" });
    doc.titre("Association sportive — présences");
    doc.meta([[r.enseignant, r.etablissement].filter(Boolean).join(" · "), "Édité le " + U.dateLongue(U.aujourdhui()),
              U.pluriel(total, "séance"), U.pluriel(eleves.length, "élève") + " inscrit" + (eleves.length > 1 ? "s" : "")].filter(Boolean).join("  ·  "));
    doc.etiquettes("Moyenne de " + Store.formaterNote(Math.round(moyenne * 10) / 10) + " présents par séance");
    doc.filet(1, 0.55);

    doc.section("Taux de venue par élève");
    doc.tableau(["Élève", "Classe", "Présences", "Taux de venue", "Dernière venue"],
      eleves.map(function (x) {
        return [x.e.nom, x.e.classe || "", x.n + " / " + total, taux(x.n, total) + " %", x.derniere ? U.dateLongue(x.derniere, true) : "-"];
      }), [0.32, 0.12, 0.16, 0.18, 0.22]);

    doc.garderEnsemble(80);
    doc.section("Séances");
    doc.tableau(["Date", "Activité", "Présents"],
      seances.map(function (s, i) {
        return [U.dateLongue(s.date), s.activite || "", presentsParSeance[i] + " / " + eleves.length];
      }), [0.40, 0.40, 0.20]);
    return doc.blob();
  }

  /* ---------- Séances ---------- */

  function listeSeances() {
    var seances = seancesTriees();
    if (!seances.length) {
      return UI.vide({
        icone: "trophee",
        titre: "Aucune séance d'AS",
        texte: Store.asEleves.compter()
          ? "Créez une séance et cochez les élèves présents."
          : "Commencez par ajouter vos élèves dans l'onglet Élèves, puis créez une séance."
      });
    }
    return U.grouper(seances, function (s) { return U.moisAnnee(s.date); }).map(function (groupe) {
      return '<div class="section__head"><h2>' + U.echapper(groupe[0]) + "</h2>" +
        '<span class="badge">' + U.pluriel(groupe[1].length, "séance") + "</span></div>" +
        '<div class="list">' + groupe[1].map(ligneSeance).join("") + "</div>";
    }).join('<div class="divider"></div>');
  }

  function ligneSeance(s) {
    var presents = (s.presents || []).filter(function (id) { return Store.asEleves.trouver(id); }).length;
    return '<button class="item" type="button" data-seance-as="' + s.id + '">' +
      '<span class="avatar avatar--date avatar--accent">' + U.jourDuMois(s.date) +
        "<small>" + U.echapper(U.moisCourt(s.date)) + "</small></span>" +
      '<span class="item__main">' +
        '<span class="item__title">' + U.echapper(s.activite || "Séance d'AS") + "</span>" +
        '<span class="item__sub">' + U.pluriel(presents, "présent") + " sur " + Store.asEleves.compter() + " inscrits</span>" +
      "</span>" +
      UI.icone("chevron", "item__chev") +
    "</button>";
  }

  /** Feuille de présence : on coche ceux qui sont venus. */
  function ouvrirSeance(id) {
    var existante = id ? Store.asSeances.trouver(id) : null;
    var eleves = elevesTries();
    if (!eleves.length) {
      UI.toast("Ajoutez d'abord des élèves à l'AS.", "info");
      onglet = "eleves";
      App.rafraichir();
      return;
    }
    var presents = {};
    (existante ? existante.presents || [] : []).forEach(function (i) { presents[i] = true; });

    UI.feuille({
      titre: existante ? "Séance d'AS" : "Nouvelle séance d'AS",
      sousTitre: "Cochez les élèves présents",
      corps:
        '<div class="stack">' +
          '<div class="field__row">' +
            '<div class="grow">' + UI.champ({ id: "as-date", label: "Date", type: "date", valeur: existante ? existante.date : U.aujourdhui() }) + "</div>" +
            '<div class="grow">' + UI.champ({ id: "as-activite", label: "Activité (facultatif)", valeur: existante ? existante.activite : "", placeholder: "Badminton" }) + "</div>" +
          "</div>" +
          '<div class="row row--between">' +
            '<span class="badge badge--accent" id="as-compte"></span>' +
            '<span class="btn-row">' +
              '<button class="btn btn--sm" data-tout type="button">Tout cocher</button>' +
              '<button class="btn btn--sm btn--ghost" data-rien type="button">Décocher</button>' +
            "</span>" +
          "</div>" +
          '<div class="list" id="as-presences">' +
            eleves.map(function (e) {
              return '<button class="item pres" type="button" data-pres="' + e.id + '" aria-pressed="' + (!!presents[e.id]) + '">' +
                '<span class="pres__box">' + UI.icone("check") + "</span>" +
                '<span class="item__main"><span class="item__title">' + U.echapper(e.nom) + "</span>" +
                  (e.classe ? '<span class="item__sub">' + U.echapper(e.classe) + "</span>" : "") + "</span>" +
              "</button>";
            }).join("") +
          "</div>" +
          UI.champ({ id: "as-note", label: "Note (facultatif)", type: "textarea", lignes: 2, valeur: existante ? existante.note : "" }) +
          (existante
            ? '<button class="btn btn--sm btn--ghost" data-supprimer type="button" style="color:var(--danger)">' +
                UI.icone("poubelle") + "Supprimer la séance</button>" : "") +
        "</div>",
      actions:
        '<button class="btn" data-fermer type="button">Annuler</button>' +
        '<button class="btn btn--primary" data-valider type="button">' + UI.icone("check") + "Enregistrer</button>",
      surMontage: function (corps, fermer, pied) {
        function compter() {
          var n = U.$$('[data-pres][aria-pressed="true"]', corps).length;
          corps.querySelector("#as-compte").textContent = U.pluriel(n, "présent") + " / " + eleves.length;
        }
        U.sur(corps, "click", "[data-pres]", function (e, el) {
          el.setAttribute("aria-pressed", el.getAttribute("aria-pressed") === "true" ? "false" : "true");
          U.vibrer(8);
          compter();
        });
        corps.querySelector("[data-tout]").addEventListener("click", function () {
          U.$$("[data-pres]", corps).forEach(function (b) { b.setAttribute("aria-pressed", "true"); });
          compter();
        });
        corps.querySelector("[data-rien]").addEventListener("click", function () {
          U.$$("[data-pres]", corps).forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
          compter();
        });

        pied.querySelector("[data-valider]").addEventListener("click", function () {
          var donnees = {
            date: corps.querySelector("#as-date").value || U.aujourdhui(),
            activite: corps.querySelector("#as-activite").value.trim(),
            note: corps.querySelector("#as-note").value.trim(),
            presents: U.$$('[data-pres][aria-pressed="true"]', corps).map(function (b) { return b.getAttribute("data-pres"); })
          };
          if (existante) Store.asSeances.modifier(existante.id, donnees);
          else Store.asSeances.ajouter(donnees);
          fermer();
          UI.toast("Séance d'AS enregistrée.");
          App.rafraichir();
        });

        var suppr = corps.querySelector("[data-supprimer]");
        if (suppr) {
          suppr.addEventListener("click", function () {
            UI.confirmer({
              titre: "Supprimer la séance",
              message: "La feuille de présence de cette séance sera effacée.",
              valider: "Supprimer", danger: true
            }).then(function (ok) {
              if (!ok) return;
              Store.asSeances.supprimer(existante.id);
              fermer();
              App.rafraichir();
            });
          });
        }
        compter();
      }
    });
  }

  /* ---------- Élèves de l'AS ---------- */

  function listeEleves() {
    var tous = elevesTries();
    if (!tous.length) {
      return UI.vide({
        icone: "eleves",
        titre: "Aucun élève à l'AS",
        texte: "Collez la liste des inscrits, ou reprenez des élèves de vos classes."
      });
    }
    var q = U.normaliser(recherche);
    var visibles = tous.filter(function (e) {
      return !q || U.normaliser(e.nom + " " + (e.classe || "")).indexOf(q) !== -1;
    });
    if (!visibles.length) return UI.vide({ icone: "recherche", titre: "Aucun résultat", texte: "Essayez un autre nom." });

    var total = Store.asSeances.compter();
    return '<div class="list">' + visibles.map(function (e) {
      var n = presencesDe(e.id).length;
      return '<button class="item" type="button" data-eleve-as="' + e.id + '">' +
        '<span class="avatar">' + U.echapper(U.initiales(e.nom)) + "</span>" +
        '<span class="item__main">' +
          '<span class="item__title">' + U.echapper(e.nom) + "</span>" +
          '<span class="item__meta">' +
            (e.classe ? '<span class="badge badge--outline">' + U.echapper(e.classe) + "</span>" : "") +
            '<span class="badge badge--accent">' + n + " / " + total + " séance" + (total > 1 ? "s" : "") + (total ? " · " + taux(n, total) + " %" : "") + "</span>" +
          "</span>" +
        "</span>" +
        UI.icone("chevron", "item__chev") +
      "</button>";
    }).join("") + "</div>";
  }

  function dejaInscrit(nom, classe) {
    var cle = U.normaliser(nom) + "|" + U.normaliser(classe || "");
    return Store.asEleves.tous().some(function (e) {
      return U.normaliser(e.nom) + "|" + U.normaliser(e.classe || "") === cle;
    });
  }

  function ouvrirAjoutListe() {
    UI.feuille({
      titre: "Ajouter des élèves à l'AS",
      sousTitre: "Un élève par ligne",
      corps:
        UI.listeOptions("as-liste-classes", Store.listeClasses()) +
        UI.champ({ id: "as-classe", label: "Classe (facultatif)", liste: "as-liste-classes", placeholder: "5C",
                   aide: "S'applique à tous les noms de la liste." }) +
        UI.champ({ id: "as-noms", label: "Élèves", type: "textarea", lignes: 8, autofocus: true,
                   placeholder: "Dupont Léa\nMartin Hugo\nBernard Inès" }),
      actions:
        '<button class="btn" data-fermer type="button">Annuler</button>' +
        '<button class="btn btn--primary" data-valider type="button">' + UI.icone("check") + "Ajouter</button>",
      surMontage: function (corps, fermer, pied) {
        pied.querySelector("[data-valider]").addEventListener("click", function () {
          var classe = corps.querySelector("#as-classe").value.trim();
          var noms = corps.querySelector("#as-noms").value.split(/\r?\n/)
            .map(function (n) { return n.replace(/^\s*[-•*\d.)\t]+\s*/, "").trim(); })
            .filter(Boolean);
          if (!noms.length) { UI.toast("Aucun nom saisi.", "error"); return; }
          var ajoutes = 0;
          noms.forEach(function (nom) {
            if (dejaInscrit(nom, classe)) return;
            Store.asEleves.ajouter({ nom: nom, classe: classe });
            ajoutes++;
          });
          fermer();
          UI.toast(U.pluriel(ajoutes, "élève") + " ajouté" + (ajoutes > 1 ? "s" : "") + " à l'AS.");
          App.rafraichir();
        });
      }
    });
  }

  /** Reprend des élèves déjà enregistrés dans les classes. */
  function ouvrirImportClasses() {
    var tous = Store.elevesTries();
    if (!tous.length) { UI.toast("Aucun élève dans vos classes pour l'instant.", "info"); return; }
    UI.feuille({
      titre: "Depuis mes classes",
      sousTitre: "Touchez les élèves à inscrire à l'AS",
      corps:
        '<div class="stack">' +
          U.grouper(tous, "classe").map(function (g) {
            return '<div class="section__head" style="margin:0"><h2>' + U.echapper(g[0] || "Sans classe") + "</h2></div>" +
              '<div class="list">' + g[1].map(function (e) {
                var deja = dejaInscrit(e.nom, e.classe);
                return '<button class="item pres" type="button" data-imp="' + e.id + '" aria-pressed="false"' + (deja ? " disabled" : "") + ">" +
                  '<span class="pres__box">' + UI.icone("check") + "</span>" +
                  '<span class="item__main"><span class="item__title">' + U.echapper(e.nom) + "</span>" +
                    (deja ? '<span class="item__sub">Déjà à l\'AS</span>' : "") + "</span></button>";
              }).join("") + "</div>";
          }).join("") +
        "</div>",
      actions:
        '<button class="btn" data-fermer type="button">Annuler</button>' +
        '<button class="btn btn--primary" data-valider type="button">' + UI.icone("check") + "Inscrire</button>",
      surMontage: function (corps, fermer, pied) {
        U.sur(corps, "click", "[data-imp]", function (e, el) {
          if (el.disabled) return;
          el.setAttribute("aria-pressed", el.getAttribute("aria-pressed") === "true" ? "false" : "true");
        });
        pied.querySelector("[data-valider]").addEventListener("click", function () {
          var choisis = U.$$('[data-imp][aria-pressed="true"]', corps).map(function (b) { return b.getAttribute("data-imp"); });
          if (!choisis.length) { UI.toast("Aucun élève choisi.", "error"); return; }
          choisis.forEach(function (idEleve) {
            var e = Store.eleves.trouver(idEleve);
            if (e && !dejaInscrit(e.nom, e.classe)) Store.asEleves.ajouter({ nom: e.nom, classe: e.classe || "" });
          });
          fermer();
          UI.toast(U.pluriel(choisis.length, "élève") + " inscrit" + (choisis.length > 1 ? "s" : "") + " à l'AS.");
          App.rafraichir();
        });
      }
    });
  }

  function ouvrirEleve(id) {
    var e = Store.asEleves.trouver(id);
    if (!e) return;
    var venues = presencesDe(id);
    UI.feuille({
      titre: e.nom,
      sousTitre: (e.classe ? e.classe + " · " : "") + U.pluriel(venues.length, "présence"),
      corps:
        '<div class="stack">' +
          UI.champ({ id: "ae-nom", label: "Nom et prénom", valeur: e.nom }) +
          UI.champ({ id: "ae-classe", label: "Classe", valeur: e.classe || "" }) +
          '<div class="section__head" style="margin:0"><h2>Présences</h2></div>' +
          (venues.length
            ? '<div class="chips">' + venues.map(function (s) {
                return '<span class="chip is-on">' + U.echapper(U.dateLongue(s.date, true)) + "</span>";
              }).join("") + "</div>"
            : '<p class="small muted">Aucune présence notée pour l\'instant.</p>') +
          '<button class="btn btn--sm btn--ghost" data-supprimer type="button" style="color:var(--danger)">' +
            UI.icone("poubelle") + "Retirer de l'AS</button>" +
        "</div>",
      actions:
        '<button class="btn" data-fermer type="button">Fermer</button>' +
        '<button class="btn btn--primary" data-valider type="button">' + UI.icone("check") + "Enregistrer</button>",
      surMontage: function (corps, fermer, pied) {
        pied.querySelector("[data-valider]").addEventListener("click", function () {
          var nom = corps.querySelector("#ae-nom").value.trim();
          if (!nom) { UI.toast("Le nom est obligatoire.", "error"); return; }
          Store.asEleves.modifier(id, { nom: nom, classe: corps.querySelector("#ae-classe").value.trim() });
          fermer();
          App.rafraichir();
        });
        corps.querySelector("[data-supprimer]").addEventListener("click", function () {
          UI.confirmer({
            titre: "Retirer de l'AS",
            message: e.nom + " sera retiré de la liste et de toutes les feuilles de présence.",
            valider: "Retirer", danger: true
          }).then(function (ok) {
            if (!ok) return;
            Store.asSeances.tous().forEach(function (s) {
              if ((s.presents || []).indexOf(id) !== -1) {
                Store.asSeances.modifier(s.id, { presents: s.presents.filter(function (x) { return x !== id; }) });
              }
            });
            Store.asEleves.supprimer(id);
            fermer();
            App.rafraichir();
          });
        });
      }
    });
  }

  global.Vues = global.Vues || {};
  global.Vues.as = {
    titre: "Association sportive",
    sousTitre: "Présences",
    onglet: "AS",
    icone: "trophee",
    rendre: rendre
  };
})(window);
