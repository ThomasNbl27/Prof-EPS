/* =====================================================================
   views/evals.js — évaluations
   1. On crée une grille : AFL/AFC (pris dans la base EPS ou saisis),
      compétences qui en découlent, 4 niveaux décrits, points par compétence.
   2. Pour chaque élève, on touche le niveau atteint : les points
      s'attribuent, la note est recalculée et ramenée sur 20.
   ===================================================================== */
(function (global) {
  "use strict";

  var NIVEAUX = [
    { n: 1, nom: "Maîtrise insuffisante" },
    { n: 2, nom: "Maîtrise fragile" },
    { n: 3, nom: "Maîtrise satisfaisante" },
    { n: 4, nom: "Très bonne maîtrise" }
  ];

  var ecran = "liste";        // liste | constructeur | detail | notation
  var brouillon = null;       // grille en cours de création / modification
  var idCourant = null;       // évaluation ouverte
  var idEleveCourant = null;  // élève en cours de notation
  var classeActive = "";

  /* ---------- Outils ---------- */

  function nombre(v) {
    var n = parseFloat(String(v).replace(",", "."));
    return isNaN(n) ? 0 : n;
  }

  function arrondir(n) { return Math.round(n * 100) / 100; }

  function ptsAuto(points) {
    return [1, 2, 3, 4].map(function (k) { return arrondir(points * k / 4); });
  }

  function nouvelleCompetence() {
    return { id: U.uid(), libelle: "", points: 2, pts: ptsAuto(2), manuel: false, niveaux: ["", "", "", ""] };
  }

  function nouvelAFL() {
    return { id: U.uid(), libelle: "", competences: [nouvelleCompetence()] };
  }

  function totalPoints(grille) {
    var t = 0;
    (grille.afl || []).forEach(function (a) {
      (a.competences || []).forEach(function (c) { t += nombre(c.points); });
    });
    return t;
  }

  /** Copie d'une liste d'AFL avec de nouveaux identifiants (grille type, duplication). */
  function copierAFL(liste) {
    return JSON.parse(JSON.stringify(liste || [])).map(function (a) {
      a.id = U.uid();
      (a.competences || []).forEach(function (c) { c.id = U.uid(); });
      return a;
    });
  }

  function coefDe(ev) {
    var c = parseFloat(ev.coef);
    return isNaN(c) || c < 0 ? 1 : c;
  }

  function elevesDe(classe) {
    return Store.elevesTries().filter(function (e) { return e.classe === classe; });
  }

  function evaluation() { return idCourant ? Store.evaluations.trouver(idCourant) : null; }

  /* ================= LISTE ================= */

  function rendre(conteneur) {
    if (ecran === "constructeur" && brouillon) return rendreConstructeur(conteneur);
    if (ecran === "notation" && evaluation()) return rendreNotation(conteneur);
    if (ecran === "detail" && evaluation()) return rendreDetail(conteneur);
    ecran = "liste";
    rendreListe(conteneur);
  }

  /** Redessine sans remonter en haut de page (ajout/suppression dans le constructeur). */
  function rafraichirSurPlace() {
    var y = global.scrollY;
    App.rafraichir();
    global.scrollTo(0, y);
  }

  function aller(nouvelEcran) {
    ecran = nouvelEcran;
    App.rafraichir();
    global.scrollTo(0, 0);
  }

  function rendreListe(conteneur) {
    var toutes = Store.evaluations.tous();
    var classes = {};
    toutes.forEach(function (e) { if (e.classe) classes[e.classe] = 1; });
    var listeClasses = Object.keys(classes).sort(U.comparerClasses);
    if (classeActive && !classes[classeActive]) classeActive = "";
    var visibles = toutes.filter(function (e) { return !classeActive || e.classe === classeActive; })
      .sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); });

    conteneur.innerHTML =
      '<div class="page-head"><h1>Évaluations</h1>' +
        "<p>Grilles par niveaux, note calculée automatiquement</p></div>" +
      '<div class="stack">' +
        '<button class="btn btn--primary btn--block" data-nouvelle type="button">' +
          UI.icone("plus") + "Créer une évaluation</button>" +
        (listeClasses.length > 1
          ? '<div class="chips chips--scroll">' +
              '<button class="chip" type="button" aria-pressed="' + (!classeActive) + '" data-classe="">Toutes</button>' +
              listeClasses.map(function (c) {
                return '<button class="chip" type="button" aria-pressed="' + (classeActive === c) + '" data-classe="' + U.echapper(c) + '">' + U.echapper(c) + "</button>";
              }).join("") + "</div>" : "") +
      "</div>" +
      '<section class="section">' +
        (!toutes.length
          ? UI.vide({
              icone: "evaluation",
              titre: "Aucune évaluation",
              texte: "Créez votre grille : compétences, niveaux, points. Vous noterez ensuite chaque élève en touchant le niveau atteint."
            })
          : U.grouper(visibles, "classe").map(function (g) {
              return '<div class="section__head"><h2>' + U.echapper(g[0] || "Sans classe") + "</h2>" +
                '<span class="badge">' + U.pluriel(g[1].length, "évaluation") + "</span></div>" +
                '<div class="list">' + g[1].map(ligneEval).join("") + "</div>";
            }).join('<div class="divider"></div>')) +
      "</section>";

    U.sur(conteneur, "click", "[data-nouvelle]", function () { ouvrirConstructeur(null); });
    U.sur(conteneur, "click", "[data-classe]", function (e, el) {
      classeActive = el.getAttribute("data-classe");
      App.rafraichir();
    });
    U.sur(conteneur, "click", "[data-eval]", function (e, el) {
      idCourant = el.getAttribute("data-eval");
      aller("detail");
    });
  }

  function ligneEval(ev) {
    var eleves = elevesDe(ev.classe);
    var notes = eleves.map(function (e) { return Store.calculNote(ev, e.id).sur20; }).filter(function (n) { return n !== null; });
    var moyenne = notes.length ? notes.reduce(function (a, b) { return a + b; }, 0) / notes.length : null;
    return '<button class="item" type="button" data-eval="' + ev.id + '">' +
      '<span class="avatar avatar--accent">T' + (Number(ev.trimestre) || Store.trimestreDe(ev.date)) + "</span>" +
      '<span class="item__main">' +
        '<span class="item__title">' + U.echapper(ev.titre || "Évaluation") + "</span>" +
        '<span class="item__meta">' +
          (ev.activite ? '<span class="badge badge--outline">' + U.echapper(ev.activite) + "</span>" : "") +
          (coefDe(ev) !== 1 ? '<span class="badge badge--outline">coef ' + Store.formaterNote(coefDe(ev)) + "</span>" : "") +
          '<span class="badge">' + notes.length + " / " + eleves.length + " notés</span>" +
          (moyenne !== null ? '<span class="badge badge--accent">Moy. ' + Store.formaterNote(moyenne) + "</span>" : "") +
        "</span>" +
      "</span>" + UI.icone("chevron", "item__chev") +
    "</button>";
  }

  /* ================= DÉTAIL D'UNE ÉVALUATION ================= */

  function rendreDetail(conteneur) {
    var ev = evaluation();
    var eleves = elevesDe(ev.classe);

    conteneur.innerHTML =
      '<button class="link" data-retour type="button" style="margin-bottom:8px">‹ Évaluations</button>' +
      '<div class="page-head"><h1>' + U.echapper(ev.titre || "Évaluation") + "</h1>" +
        "<p>" + U.echapper([ev.classe, ev.activite, "T" + (Number(ev.trimestre) || Store.trimestreDe(ev.date)),
          coefDe(ev) !== 1 ? "coef " + Store.formaterNote(coefDe(ev)) : "",
          "sur " + Store.formaterNote(totalPoints(ev)) + " pts → /20"].filter(Boolean).join(" · ")) + "</p></div>" +
      '<div class="btn-row">' +
        '<button class="btn btn--sm" data-modifier type="button">' + UI.icone("crayon") + "Modifier la grille</button>" +
        '<button class="btn btn--sm" data-dupliquer type="button">' + UI.icone("plus") + "Dupliquer</button>" +
        '<button class="btn btn--sm" data-grille-type type="button">' + UI.icone("base") + "Grille type</button>" +
        '<button class="btn btn--sm btn--ghost" data-supprimer type="button" style="color:var(--danger)">' + UI.icone("poubelle") + "Supprimer</button>" +
      "</div>" +
      blocStats(ev, eleves) +
      '<section class="section"><div class="section__head"><h2>Élèves</h2>' +
        '<span class="badge">' + U.pluriel(eleves.length, "élève") + "</span></div>" +
      (eleves.length
        ? '<div class="list">' + eleves.map(function (e) {
            var n = Store.calculNote(ev, e.id);
            return '<button class="item" type="button" data-noter="' + e.id + '">' +
              '<span class="avatar">' + U.echapper(U.initiales(e.nom)) + "</span>" +
              '<span class="item__main"><span class="item__title">' + U.echapper(e.nom) + "</span>" +
                '<span class="item__sub">' + (n.statut === "absent" ? "Absent le jour de l'évaluation" : n.statut === "dispense" ? "Dispensé le jour de l'évaluation" : n.evaluees ? n.evaluees + " / " + n.nbCompetences + " compétences évaluées" : "Pas encore noté") + "</span></span>" +
              '<span class="note-pastille' + (n.sur20 === null ? " is-vide" : "") + '">' +
                (n.statut === "absent" ? "Abs." : n.statut === "dispense" ? "Disp." : n.sur20 === null ? "—" : Store.formaterNote(n.sur20)) + "</span>" +
              UI.icone("chevron", "item__chev") +
            "</button>";
          }).join("") + "</div>"
        : UI.note("Aucun élève dans la classe <b>" + U.echapper(ev.classe || "—") + "</b>. Ajoutez-les dans l'onglet Élèves : ils apparaîtront ici.", "warn")) +
      "</section>";

    U.sur(conteneur, "click", "[data-retour]", function () { aller("liste"); });
    U.sur(conteneur, "click", "[data-noter]", function (e, el) {
      idEleveCourant = el.getAttribute("data-noter");
      aller("notation");
    });
    U.sur(conteneur, "click", "[data-modifier]", function () { ouvrirConstructeur(ev.id); });
    U.sur(conteneur, "click", "[data-dupliquer]", function () { ouvrirDuplication(ev); });
    U.sur(conteneur, "click", "[data-grille-type]", function () {
      Store.grillesTypes.ajouter({ nom: ev.titre || "Grille", activite: ev.activite || "", afl: copierAFL(ev.afl) });
      UI.toast("Grille ajoutée à votre bibliothèque.");
    });
    U.sur(conteneur, "click", "[data-supprimer]", function () {
      UI.confirmer({
        titre: "Supprimer l'évaluation",
        message: "La grille et toutes les notes saisies pour « " + (ev.titre || "cette évaluation") + " » seront effacées.",
        valider: "Supprimer", danger: true
      }).then(function (ok) {
        if (!ok) return;
        Store.evaluations.supprimer(ev.id);
        idCourant = null;
        aller("liste");
      });
    });
  }

  function blocStats(ev, eleves) {
    var st = Store.statistiquesEvaluation(ev, eleves);
    if (!st.nb && !st.absents && !st.dispenses) return "";
    var maxi = Math.max.apply(null, st.tranches.concat([1]));
    var noms = ["0 à 5", "5 à 10", "10 à 15", "15 à 20"];
    return '<section class="section"><div class="section__head"><h2>Statistiques de la classe</h2></div>' +
      '<div class="card card--pad stack">' +
        (st.nb
          ? '<div class="stats">' +
              [["Moyenne", st.moyenne], ["Médiane", st.mediane], ["Plus basse", st.min], ["Plus haute", st.max]].map(function (x) {
                return '<div class="stats__cell"><span>' + x[0] + "</span><b>" + Store.formaterNote(x[1]) + "</b></div>";
              }).join("") + "</div>" +
            '<div class="stack stack--sm">' + st.tranches.map(function (n, i) {
              return '<div class="barre"><span class="barre__nom">' + noms[i] + '</span>' +
                '<span class="barre__piste"><span class="barre__rempli" style="width:' + Math.round(n * 100 / maxi) + '%"></span></span>' +
                '<b class="barre__n">' + n + "</b></div>";
            }).join("") + "</div>"
          : '<p class="small muted">Aucune note pour l\'instant.</p>') +
        '<p class="small muted">' + U.pluriel(st.nb, "élève") + " noté" + (st.nb > 1 ? "s" : "") +
          (st.absents ? " · " + U.pluriel(st.absents, "absent") : "") +
          (st.dispenses ? " · " + U.pluriel(st.dispenses, "dispensé") : "") + "</p>" +
      "</div></section>";
  }

  function ouvrirDuplication(ev) {
    UI.feuille({
      titre: "Dupliquer l'évaluation",
      sousTitre: "Même grille, autre classe, sans les notes",
      taille: "sm",
      corps:
        UI.listeOptions("dup-classes", Store.listeClasses()) +
        UI.champ({ id: "dup-titre", label: "Titre", valeur: ev.titre }) +
        UI.champ({ id: "dup-classe", label: "Classe", liste: "dup-classes", placeholder: "3C", autofocus: true }),
      actions:
        '<button class="btn" data-fermer type="button">Annuler</button>' +
        '<button class="btn btn--primary" data-valider type="button">' + UI.icone("check") + "Dupliquer</button>",
      surMontage: function (corps, fermer, pied) {
        pied.querySelector("[data-valider]").addEventListener("click", function () {
          var classe = corps.querySelector("#dup-classe").value.trim();
          if (!classe) { UI.toast("Indiquez la classe.", "error"); return; }
          var copie = Store.evaluations.ajouter({
            titre: corps.querySelector("#dup-titre").value.trim() || ev.titre, classe: classe,
            activite: ev.activite, trimestre: ev.trimestre, date: U.aujourdhui(), coef: ev.coef,
            afl: copierAFL(ev.afl), resultats: {}, statuts: {}
          });
          fermer();
          idCourant = copie.id;
          UI.toast("Évaluation dupliquée pour " + classe + ".");
          aller("detail");
        });
      }
    });
  }

  /** Bibliothèque de grilles types : on en charge une dans le brouillon. */
  function ouvrirBibliotheque() {
    var types = Store.grillesTypes.tous();
    UI.feuille({
      titre: "Mes grilles types",
      sousTitre: types.length ? "Touchez une grille pour la reprendre" : "",
      corps: types.length
        ? '<div class="list">' + types.map(function (g, i) {
            var nb = (g.afl || []).reduce(function (t, a) { return t + (a.competences || []).length; }, 0);
            return '<div class="row" style="gap:8px">' +
              '<button class="item grow" type="button" data-type="' + i + '">' +
                '<span class="item__main"><span class="item__title">' + U.echapper(g.nom || "Grille") + "</span>" +
                  '<span class="item__meta">' + (g.activite ? '<span class="badge badge--outline">' + U.echapper(g.activite) + "</span>" : "") +
                  '<span class="badge">' + U.pluriel(nb, "compétence") + " · " + Store.formaterNote(totalPoints(g)) + " pts</span></span></span>" +
              "</button>" +
              '<button class="iconbtn" type="button" data-suppr-type="' + g.id + '" aria-label="Supprimer cette grille type">' + UI.icone("poubelle") + "</button></div>";
          }).join("") + "</div>"
        : UI.vide({ icone: "evaluation", titre: "Bibliothèque vide",
                    texte: "Cochez « Enregistrer comme grille type » en créant une grille, ou utilisez le bouton « Grille type » sur une évaluation." }),
      actions: '<button class="btn" data-fermer type="button">Fermer</button>',
      surMontage: function (corps, fermer) {
        U.sur(corps, "click", "[data-type]", function (e, el) {
          var g = types[Number(el.getAttribute("data-type"))];
          if (!g || !brouillon) return;
          brouillon.afl = copierAFL(g.afl);
          if (!String(brouillon.titre).trim()) brouillon.titre = g.nom || "";
          if (!String(brouillon.activite).trim()) brouillon.activite = g.activite || "";
          fermer();
          rafraichirSurPlace();
        });
        U.sur(corps, "click", "[data-suppr-type]", function (e, el) {
          UI.confirmer({ titre: "Supprimer la grille type", message: "Elle ne sera plus proposée. Les évaluations déjà créées ne changent pas.",
                         valider: "Supprimer", danger: true }).then(function (ok) {
            if (!ok) return;
            Store.grillesTypes.supprimer(el.getAttribute("data-suppr-type"));
            fermer();
            ouvrirBibliotheque();
          });
        });
      }
    });
  }

  /** PDF d'un élève : sa grille remplie, niveau par niveau. */
  function documentGrille(ev, eleve) {
    var r = Store.reglages();
    var n = Store.calculNote(ev, eleve.id);
    var res = (ev.resultats && ev.resultats[eleve.id]) || {};
    var doc = PDF.document({ titre: ev.titre || "Évaluation", pied: (ev.titre || "Évaluation") + " — " + eleve.nom });
    doc.titre(ev.titre || "Évaluation");
    doc.meta([eleve.nom, eleve.classe, ev.activite, "Trimestre " + (Number(ev.trimestre) || Store.trimestreDe(ev.date)),
              ev.date ? U.dateLongue(ev.date) : "", r.enseignant].filter(Boolean).join("  ·  "));
    doc.filet(1, 0.55);
    doc.etiquettes(n.statut === "absent" ? "Absent le jour de l'évaluation"
      : n.statut === "dispense" ? "Dispensé le jour de l'évaluation"
      : "Note : " + Store.formaterNote(n.sur20) + " / 20   ·   " + Store.formaterNote(n.gagnes) + " sur " + Store.formaterNote(n.total) + " points" +
        (coefDe(ev) !== 1 ? "   ·   coefficient " + Store.formaterNote(coefDe(ev)) : ""));
    (ev.afl || []).forEach(function (a, i) {
      doc.garderEnsemble(90);
      doc.section(a.libelle || "AFL " + (i + 1));
      (a.competences || []).forEach(function (c) {
        var niveau = res[c.id];
        var pts = c.pts && c.pts.length === 4 ? c.pts : ptsAuto(nombre(c.points));
        var texte = niveau >= 1 && niveau <= 4
          ? NIVEAUX[niveau - 1].nom + " - " + Store.formaterNote(nombre(pts[niveau - 1])) + " sur " + Store.formaterNote(nombre(c.points)) + " points\n" + ((c.niveaux && c.niveaux[niveau - 1]) || "")
          : "Non évalué";
        doc.champ((c.libelle || "Compétence"), texte);
      });
    });
    return doc.blob();
  }

  /* ================= NOTATION D'UN ÉLÈVE ================= */

  function rendreNotation(conteneur) {
    var ev = evaluation();
    var eleves = elevesDe(ev.classe);
    var index = eleves.map(function (e) { return e.id; }).indexOf(idEleveCourant);
    if (index === -1) { aller("detail"); return; }
    var eleve = eleves[index];
    if (!ev.resultats) ev.resultats = {};
    if (!ev.resultats[eleve.id]) ev.resultats[eleve.id] = {};
    if (!ev.statuts) ev.statuts = {};
    var res = ev.resultats[eleve.id];
    var statut = ev.statuts[eleve.id] || "";

    conteneur.innerHTML =
      '<button class="link" data-retour type="button" style="margin-bottom:8px">‹ ' + U.echapper(ev.titre || "Évaluation") + "</button>" +
      '<div class="notebar" id="notebar">' +
        '<div class="notebar__nav">' +
          '<button class="iconbtn" type="button" data-prec aria-label="Élève précédent"' + (index === 0 ? " disabled" : "") + ">" + UI.icone("retour") + "</button>" +
          '<div class="notebar__id"><strong>' + U.echapper(eleve.nom) + "</strong>" +
            "<small>" + (index + 1) + " / " + eleves.length + " · " + U.echapper(ev.classe || "") + "</small></div>" +
          '<button class="iconbtn" type="button" data-suiv aria-label="Élève suivant"' + (index === eleves.length - 1 ? " disabled" : "") + ">" + UI.icone("chevron") + "</button>" +
        "</div>" +
        '<div class="notebar__score"><span class="notebar__note" id="note-sur20">—</span><span class="notebar__max">/20</span>' +
          '<span class="notebar__detail" id="note-detail"></span></div>' +
      "</div>" +
      '<div class="chips" style="margin-bottom:12px">' +
        '<button class="chip" type="button" data-statut="absent" aria-pressed="' + (statut === "absent") + '">Absent</button>' +
        '<button class="chip" type="button" data-statut="dispense" aria-pressed="' + (statut === "dispense") + '">Dispensé</button>' +
        '<span class="small muted" style="align-self:center">Sans note ni zéro</span>' +
      "</div>" +
      '<div class="grille' + (statut ? " is-masque" : "") + '">' +
        '<div class="grille__entete">' +
          NIVEAUX.map(function (n) { return '<div class="niv niv--' + n.n + '">' + n.nom + "</div>"; }).join("") +
        "</div>" +
        (ev.afl || []).map(function (a, i) {
          return '<section class="grille__afl">' +
            '<h3 class="grille__afl-titre">' + U.echapper(a.libelle || "AFL " + (i + 1)) + "</h3>" +
            (a.competences || []).map(function (c) {
              var pts = c.pts && c.pts.length === 4 ? c.pts : ptsAuto(nombre(c.points));
              return '<div class="grille__comp" data-comp="' + c.id + '">' +
                '<div class="grille__comp-titre"><span>' + U.echapper(c.libelle || "Compétence") + "</span>" +
                  '<b class="grille__pts">/' + Store.formaterNote(nombre(c.points)) + "</b></div>" +
                '<div class="grille__niveaux">' +
                  NIVEAUX.map(function (n) {
                    return '<button type="button" class="cellule cellule--' + n.n + (res[c.id] === n.n ? " is-on" : "") +
                      '" data-niveau="' + n.n + '" data-c="' + c.id + '" aria-pressed="' + (res[c.id] === n.n) + '">' +
                      '<span class="cellule__nom">' + n.nom + "</span>" +
                      '<span class="cellule__txt">' + U.echapper((c.niveaux && c.niveaux[n.n - 1]) || "—") + "</span>" +
                      '<span class="cellule__pts">' + Store.formaterNote(nombre(pts[n.n - 1])) + " pt" + (nombre(pts[n.n - 1]) > 1 ? "s" : "") + "</span>" +
                    "</button>";
                  }).join("") +
                "</div></div>";
            }).join("") +
          "</section>";
        }).join("") +
      "</div>" +
      '<div class="btn-row" style="margin-top:16px">' +
        '<button class="btn btn--sm" data-pdf-grille type="button">' + UI.icone("export") + "PDF de la grille remplie</button>" +
        '<button class="btn btn--sm btn--ghost" data-effacer-eleve type="button">Effacer les niveaux</button>' +
      "</div>";

    function majNote() {
      var n = Store.calculNote(ev, eleve.id);
      conteneur.querySelector("#note-sur20").textContent = n.statut === "absent" ? "Abs." : n.statut === "dispense" ? "Disp." : n.sur20 === null ? "—" : Store.formaterNote(n.sur20);
      conteneur.querySelector("#note-detail").textContent = n.statut ? "Pas de note pour cet élève" : n.evaluees
        ? Store.formaterNote(n.gagnes) + " / " + Store.formaterNote(n.total) + " pts · " + n.evaluees + "/" + n.nbCompetences + " évaluées"
        : "Touchez un niveau par compétence";
    }

    U.sur(conteneur, "click", "[data-niveau]", function (e, el) {
      var niveau = Number(el.getAttribute("data-niveau"));
      var cId = el.getAttribute("data-c");
      // Un seul niveau par compétence : en choisir un autre retire le précédent ; retoucher le même l'annule.
      if (res[cId] === niveau) delete res[cId]; else res[cId] = niveau;
      var ligne = el.closest(".grille__comp");
      U.$$("[data-niveau]", ligne).forEach(function (b) {
        var actif = res[cId] === Number(b.getAttribute("data-niveau"));
        b.classList.toggle("is-on", actif);
        b.setAttribute("aria-pressed", actif ? "true" : "false");
      });
      Store.evaluations.modifier(ev.id, { resultats: ev.resultats });
      U.vibrer(10);
      majNote();
    });

    U.sur(conteneur, "click", "[data-statut]", function (e, el) {
      var voulu = el.getAttribute("data-statut");
      if (ev.statuts[eleve.id] === voulu) delete ev.statuts[eleve.id]; else ev.statuts[eleve.id] = voulu;
      Store.evaluations.modifier(ev.id, { statuts: ev.statuts });
      rafraichirSurPlace();
    });
    U.sur(conteneur, "click", "[data-pdf-grille]", function () {
      try {
        var nom = ("grille-" + eleve.nom + "-" + (ev.titre || "eval")).replace(/\s+/g, "").replace(/[^\w.-]/g, "") + ".pdf";
        Exports.livrerPDF(documentGrille(ev, eleve), nom);
      } catch (err) { UI.toast("Création du PDF impossible : " + err.message, "error", 5000); }
    });
    U.sur(conteneur, "click", "[data-effacer-eleve]", function () {
      ev.resultats[eleve.id] = {};
      Store.evaluations.modifier(ev.id, { resultats: ev.resultats });
      App.rafraichir();
    });
    U.sur(conteneur, "click", "[data-retour]", function () { aller("detail"); });
    U.sur(conteneur, "click", "[data-prec]", function () { idEleveCourant = eleves[index - 1].id; aller("notation"); });
    U.sur(conteneur, "click", "[data-suiv]", function () { idEleveCourant = eleves[index + 1].id; aller("notation"); });

    majNote();
  }

  /* ================= CONSTRUCTEUR DE GRILLE ================= */

  function ouvrirConstructeur(id) {
    if (id) {
      var ev = Store.evaluations.trouver(id);
      brouillon = JSON.parse(JSON.stringify(ev));
    } else {
      brouillon = {
        titre: "", classe: classeActive || "", activite: "",
        trimestre: Store.trimestreDe(U.aujourdhui()), date: U.aujourdhui(), coef: 1,
        afl: [nouvelAFL()], resultats: {}, statuts: {}
      };
    }
    aller("constructeur");
  }

  function rendreConstructeur(conteneur) {
    var b = brouillon;
    var edition = !!b.id;
    var classes = Store.listeClasses();

    conteneur.innerHTML =
      '<button class="link" data-annuler type="button" style="margin-bottom:8px">‹ ' + (edition ? "Annuler" : "Évaluations") + "</button>" +
      '<div class="page-head"><h1>' + (edition ? "Modifier la grille" : "Nouvelle évaluation") + "</h1>" +
        "<p>Choisissez l'AFL, les compétences, décrivez les 4 niveaux et répartissez les points</p></div>" +

      '<div class="card card--pad stack">' +
        UI.champ({ id: "g-titre", label: "Titre de l'évaluation", valeur: b.titre, placeholder: "Volley-ball — fin de cycle" }) +
        UI.listeOptions("g-classes", classes) +
        UI.listeOptions("g-activites", Store.listeActivites()) +
        '<div class="field__row">' +
          '<div class="grow">' + UI.champ({ id: "g-classe", label: "Classe", valeur: b.classe, liste: "g-classes", placeholder: "3B" }) + "</div>" +
          '<div class="grow">' + UI.champ({ id: "g-activite", label: "Activité (APSA)", valeur: b.activite, liste: "g-activites", placeholder: "Volley-ball" }) + "</div>" +
        "</div>" +
        '<div class="field__row">' +
          '<div class="grow">' + UI.champ({ id: "g-trimestre", label: "Trimestre", type: "select", valeur: String(b.trimestre),
            options: [{ valeur: "1", libelle: "Trimestre 1" }, { valeur: "2", libelle: "Trimestre 2" }, { valeur: "3", libelle: "Trimestre 3" }] }) + "</div>" +
          '<div class="grow">' + UI.champ({ id: "g-date", label: "Date", type: "date", valeur: b.date }) + "</div>" +
        "</div>" +
        UI.champ({ id: "g-coef", label: "Coefficient", type: "number", valeur: b.coef === undefined ? 1 : b.coef,
                   attributs: ' step="0.5" min="0" inputmode="decimal"', aide: "Pèse dans la moyenne du trimestre (1 par défaut)." }) +
        (edition ? "" : '<button class="btn btn--sm" data-bibliotheque type="button">' + UI.icone("base") + "Partir d'une grille type</button>") +
      "</div>" +

      '<div id="g-blocs" class="stack" style="margin-top:16px">' + blocsHTML() + "</div>" +

      '<button class="btn btn--block" data-ajout-afl type="button" style="margin-top:12px">' + UI.icone("plus") + "Ajouter un AFL / AFC</button>" +

      '<label class="switch" style="margin-top:14px"><input type="checkbox" id="g-type"' + (b.enregistrerType ? " checked" : "") + ">" +
        '<span class="switch__track"></span><span>Enregistrer aussi comme grille type</span></label>' +
      '<div class="notebar notebar--total" id="g-total"></div>' +
      '<div class="btn-row" style="margin-top:12px">' +
        '<button class="btn btn--primary" data-enregistrer type="button">' + UI.icone("check") + "Enregistrer la grille</button>" +
        '<button class="btn" data-annuler type="button">Annuler</button>' +
      "</div>";

    majTotal(conteneur);

    /* --- Champs généraux --- */
    [["#g-titre", "titre"], ["#g-classe", "classe"], ["#g-activite", "activite"], ["#g-date", "date"]].forEach(function (p) {
      var champ = conteneur.querySelector(p[0]);
      champ.addEventListener("input", function () { b[p[1]] = champ.value; });
    });
    conteneur.querySelector("#g-coef").addEventListener("input", function (e) { b.coef = e.target.value; });
    conteneur.querySelector("#g-type").addEventListener("change", function (e) { b.enregistrerType = e.target.checked; });
    conteneur.querySelector("#g-trimestre").addEventListener("change", function (e) { b.trimestre = Number(e.target.value); });

    /* --- Saisie dans les blocs (écriture directe dans le brouillon) --- */
    conteneur.addEventListener("input", function (e) {
      var cible = e.target;
      var champ = cible.getAttribute("data-champ");
      if (!champ) return;
      var a = trouverAFL(cible.getAttribute("data-a"));
      if (!a) return;
      if (champ === "afl") { a.libelle = cible.value; return; }
      var c = trouverCompetence(a, cible.getAttribute("data-c"));
      if (!c) return;
      if (champ === "libelle") c.libelle = cible.value;
      else if (champ === "niveau") c.niveaux[Number(cible.getAttribute("data-n")) - 1] = cible.value;
      else if (champ === "points") {
        c.points = nombre(cible.value);
        if (!c.manuel) {
          c.pts = ptsAuto(c.points);
          [1, 2, 3, 4].forEach(function (k) {
            var champPts = conteneur.querySelector('[data-champ="pts"][data-c="' + c.id + '"][data-n="' + k + '"]');
            if (champPts) champPts.value = c.pts[k - 1];
          });
        }
        majTotal(conteneur);
      } else if (champ === "pts") {
        c.manuel = true;
        c.pts[Number(cible.getAttribute("data-n")) - 1] = nombre(cible.value);
      }
    });

    /* --- Actions structurelles --- */
    U.sur(conteneur, "click", "[data-bibliotheque]", function () { ouvrirBibliotheque(); });
    U.sur(conteneur, "click", "[data-ajout-afl]", function () { b.afl.push(nouvelAFL()); rafraichirSurPlace(); });
    U.sur(conteneur, "click", "[data-suppr-afl]", function (e, el) {
      if (b.afl.length === 1) { UI.toast("Une grille contient au moins un AFL.", "error"); return; }
      b.afl = b.afl.filter(function (a) { return a.id !== el.getAttribute("data-suppr-afl"); });
      rafraichirSurPlace();
    });
    U.sur(conteneur, "click", "[data-ajout-comp]", function (e, el) {
      var a = trouverAFL(el.getAttribute("data-ajout-comp"));
      if (a) { a.competences.push(nouvelleCompetence()); rafraichirSurPlace(); }
    });
    U.sur(conteneur, "click", "[data-suppr-comp]", function (e, el) {
      var a = trouverAFL(el.getAttribute("data-a"));
      if (!a) return;
      a.competences = a.competences.filter(function (c) { return c.id !== el.getAttribute("data-suppr-comp"); });
      rafraichirSurPlace();
    });
    U.sur(conteneur, "click", "[data-base-afl]", function (e, el) {
      choisirDansBase("attendus", el.getAttribute("data-base-afl"), null);
    });
    U.sur(conteneur, "click", "[data-base-comp]", function (e, el) {
      choisirDansBase("competences", el.getAttribute("data-a"), el.getAttribute("data-base-comp"));
    });
    U.sur(conteneur, "click", "[data-annuler]", function () { brouillon = null; aller(edition ? "detail" : "liste"); });
    U.sur(conteneur, "click", "[data-enregistrer]", function () { enregistrer(edition); });
  }

  function trouverAFL(id) { return (brouillon.afl || []).filter(function (a) { return a.id === id; })[0]; }
  function trouverCompetence(a, id) { return (a.competences || []).filter(function (c) { return c.id === id; })[0]; }

  function majTotal(conteneur) {
    var zone = conteneur.querySelector("#g-total");
    if (!zone) return;
    var t = totalPoints(brouillon);
    zone.innerHTML = '<div class="notebar__score"><span class="notebar__max">Total de la grille</span>' +
      '<span class="notebar__note">' + Store.formaterNote(t) + '</span><span class="notebar__max">pts</span>' +
      '<span class="notebar__detail">' + (t && t !== 20 ? "Ramené automatiquement sur 20" : t === 20 ? "Déjà sur 20" : "Ajoutez des points aux compétences") + "</span></div>";
  }

  function blocsHTML() {
    return brouillon.afl.map(function (a, i) {
      return '<section class="card card--pad stack bloc-afl">' +
        '<div class="row row--between"><b>AFL / AFC ' + (i + 1) + "</b>" +
          '<button class="iconbtn" type="button" data-suppr-afl="' + a.id + '" aria-label="Supprimer cet AFL">' + UI.icone("poubelle") + "</button></div>" +
        '<div class="field"><label class="field__label">Attendu de fin de cycle / de lycée</label>' +
          '<textarea class="textarea" rows="2" data-champ="afl" data-a="' + a.id + '" placeholder="Choisissez dans la base EPS ou saisissez-le">' + U.echapper(a.libelle) + "</textarea>" +
          '<button class="btn btn--sm" type="button" data-base-afl="' + a.id + '" style="margin-top:8px">' + UI.icone("base") + "Choisir dans la base EPS</button></div>" +
        a.competences.map(function (c, k) { return competenceHTML(a, c, k); }).join("") +
        '<button class="btn btn--sm" type="button" data-ajout-comp="' + a.id + '">' + UI.icone("plus") + "Ajouter une compétence</button>" +
      "</section>";
    }).join("");
  }

  function competenceHTML(a, c, k) {
    var pts = c.pts && c.pts.length === 4 ? c.pts : ptsAuto(nombre(c.points));
    return '<div class="bloc-comp stack stack--sm">' +
      '<div class="row row--between"><span class="small muted" style="font-weight:650">Compétence ' + (k + 1) + "</span>" +
        '<button class="iconbtn" type="button" data-suppr-comp="' + c.id + '" data-a="' + a.id + '" aria-label="Supprimer cette compétence">' + UI.icone("fermer") + "</button></div>" +
      '<textarea class="textarea" rows="2" data-champ="libelle" data-a="' + a.id + '" data-c="' + c.id + '" placeholder="Compétence (base EPS ou saisie libre)">' + U.echapper(c.libelle) + "</textarea>" +
      '<div class="row row--between row--wrap">' +
        '<button class="btn btn--sm" type="button" data-base-comp="' + c.id + '" data-a="' + a.id + '">' + UI.icone("base") + "Choisir dans la base EPS</button>" +
        '<label class="pointsbox"><span>Points</span><input class="input" type="number" inputmode="decimal" min="0" step="0.5" value="' + U.echapper(c.points) +
          '" data-champ="points" data-a="' + a.id + '" data-c="' + c.id + '"></label>' +
      "</div>" +
      NIVEAUX.map(function (n) {
        return '<div class="niveau-champ niveau-champ--' + n.n + '">' +
          '<div class="niveau-champ__tete"><span>' + n.nom + "</span>" +
            '<label class="pointsbox pointsbox--petit"><input class="input" type="number" inputmode="decimal" min="0" step="0.25" value="' + U.echapper(pts[n.n - 1]) +
              '" data-champ="pts" data-a="' + a.id + '" data-c="' + c.id + '" data-n="' + n.n + '"><span>pts</span></label></div>' +
          '<textarea class="textarea" rows="3" data-champ="niveau" data-n="' + n.n + '" data-a="' + a.id + '" data-c="' + c.id + '" placeholder="Descriptif du niveau ' + n.n + '">' +
            U.echapper((c.niveaux && c.niveaux[n.n - 1]) || "") + "</textarea></div>";
      }).join("") +
    "</div>";
  }

  /** Feuille de choix dans la base EPS (attendus pour l'AFL, fiches pour les compétences). */
  function choisirDansBase(type, idAFL, idComp) {
    var activite = U.normaliser(brouillon.activite || "");
    var toutes = type === "attendus" ? Store.attendus.tous() : Store.competences.tous();
    var propositions = toutes.filter(function (f) { return !activite || U.normaliser(f.apsa || "") === activite; });
    var elargi = false;
    if (!propositions.length) { propositions = toutes; elargi = true; }

    function texte(f) { return type === "attendus" ? f.attendu : (f.competence || f.contenuPrioritaire); }

    UI.feuille({
      titre: type === "attendus" ? "AFL / AFC de la base EPS" : "Compétences de la base EPS",
      sousTitre: activite && !elargi ? "Activité : " + brouillon.activite : "Toute la base",
      corps:
        '<div class="stack">' +
          (elargi && activite ? UI.note("Rien dans la base pour « " + U.echapper(brouillon.activite) + " » : voici toute la base.", "warn") : "") +
          (propositions.length
            ? '<div class="list">' + propositions.map(function (f, i) {
                return '<button class="item" type="button" data-choix="' + i + '">' +
                  '<span class="item__main"><span class="item__title" style="white-space:normal">' + U.echapper(U.tronquer(texte(f) || "", 160)) + "</span>" +
                    '<span class="item__meta">' +
                      (f.apsa ? '<span class="badge badge--outline">' + U.echapper(f.apsa) + "</span>" : "") +
                      (f.cycle ? '<span class="badge badge--accent">' + U.echapper(f.cycle) + "</span>" : "") +
                    "</span></span></button>";
              }).join("") + "</div>"
            : UI.note("La base EPS est vide : saisissez le texte à la main, ou ajoutez des fiches dans l'onglet Base EPS.")) +
        "</div>",
      actions: '<button class="btn" data-fermer type="button">Fermer</button>',
      surMontage: function (corps, fermer) {
        U.sur(corps, "click", "[data-choix]", function (e, el) {
          var f = propositions[Number(el.getAttribute("data-choix"))];
          var a = trouverAFL(idAFL);
          if (!a || !f) return;
          if (type === "attendus") a.libelle = texte(f) || "";
          else {
            var c = trouverCompetence(a, idComp);
            if (c) c.libelle = texte(f) || "";
          }
          fermer();
          rafraichirSurPlace();
        });
      }
    });
  }

  function enregistrer(edition) {
    var b = brouillon;
    if (!String(b.titre).trim()) { UI.toast("Donnez un titre à l'évaluation.", "error"); return; }
    if (!String(b.classe).trim()) { UI.toast("Indiquez la classe.", "error"); return; }
    if (totalPoints(b) <= 0) { UI.toast("Attribuez des points aux compétences.", "error"); return; }

    // Compétences sans texte : on les écarte plutôt que de garder des lignes vides.
    b.afl.forEach(function (a) {
      a.competences = a.competences.filter(function (c) { return String(c.libelle).trim() || nombre(c.points) > 0; });
    });

    var donnees = {
      titre: b.titre.trim(), classe: b.classe.trim(), activite: (b.activite || "").trim(),
      trimestre: Number(b.trimestre) || 1, date: b.date || U.aujourdhui(),
      coef: isNaN(parseFloat(b.coef)) ? 1 : Math.max(0, parseFloat(b.coef)),
      afl: b.afl, resultats: b.resultats || {}, statuts: b.statuts || {}
    };
    if (b.enregistrerType) {
      Store.grillesTypes.ajouter({ nom: donnees.titre, activite: donnees.activite, afl: copierAFL(donnees.afl) });
    }
    var cree;
    if (edition) { Store.evaluations.modifier(b.id, donnees); cree = Store.evaluations.trouver(b.id); }
    else cree = Store.evaluations.ajouter(donnees);

    brouillon = null;
    idCourant = cree.id;
    UI.toast("Grille enregistrée.");
    aller("detail");
  }

  global.Vues = global.Vues || {};
  global.Vues.evals = {
    titre: "Évaluations",
    sousTitre: "Grilles et notes",
    onglet: "Éval",
    icone: "evaluation",
    rendre: rendre,
    /** Retour à la liste quand on revient sur l'onglet depuis ailleurs. */
    reinitialiser: function () { if (ecran !== "constructeur") ecran = "liste"; }
  };
})(window);
