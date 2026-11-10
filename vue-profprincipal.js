/* =====================================================================
   views/profprincipal.js — onglet du professeur principal
   Visible seulement si l'option est cochée dans les réglages.
   Appréciation générale et moyenne générale par trimestre, avec
   l'historique des trimestres, et PDF de la classe.
   ===================================================================== */
(function (global) {
  "use strict";

  var trimestre = Store.trimestreDe(U.aujourdhui());
  var choixPDF = {};
  choixPDF[trimestre] = true;

  function actif() {
    var r = Store.reglages();
    return !!(r.profPrincipal && r.classePP);
  }

  function donnee(e, t) {
    var pp = e.pp || {};
    return Object.assign({ moy: "", app: "", coll: "" }, pp["t" + t] || {});
  }

  function enregistrer(id, t, champs) {
    var e = Store.eleves.trouver(id);
    if (!e) return;
    var pp = JSON.parse(JSON.stringify(e.pp || {}));
    pp["t" + t] = Object.assign({ moy: "", app: "", coll: "" }, pp["t" + t] || {}, champs);
    Store.eleves.modifier(id, { pp: pp });
  }

  function moyenneNombre(v) {
    var n = parseFloat(String(v).replace(",", "."));
    return isNaN(n) ? null : n;
  }

  function elevesPP() {
    var classe = Store.reglages().classePP;
    return Store.elevesTries().filter(function (e) { return e.classe === classe; });
  }

  /* ================= LISTE ================= */

  function rendre(conteneur) {
    var r = Store.reglages();
    if (!actif()) {
      conteneur.innerHTML =
        '<div class="page-head"><h1>Prof principal</h1><p>Appréciations générales de la classe</p></div>' +
        UI.vide({
          icone: "etoile", titre: "Classe à choisir",
          texte: "Indiquez la classe dont vous êtes professeur principal dans les réglages.",
          action: '<button class="btn btn--primary" data-reglages type="button">Ouvrir les réglages</button>'
        });
      U.sur(conteneur, "click", "[data-reglages]", function () { App.aller("reglages"); });
      return;
    }

    var eleves = elevesPP();
    conteneur.innerHTML =
      '<div class="page-head"><h1>Prof principal · ' + U.echapper(r.classePP) + "</h1>" +
        "<p>" + U.pluriel(eleves.length, "élève") + " — appréciation générale et moyenne par trimestre</p></div>" +
      '<div class="stack">' +
        '<div class="segmented" role="tablist">' +
          [1, 2, 3].map(function (t) {
            return '<button role="tab" type="button" data-tri="' + t + '" aria-selected="' + (trimestre === t) + '">Trimestre ' + t + "</button>";
          }).join("") +
        "</div>" +
      "</div>" +
      '<section class="section">' +
        (eleves.length
          ? '<div class="list">' + eleves.map(function (e) {
              var d = donnee(e, trimestre);
              var moy = moyenneNombre(d.moy);
              return '<button class="item" type="button" data-eleve="' + e.id + '">' +
                '<span class="avatar">' + U.echapper(U.initiales(e.nom)) + "</span>" +
                '<span class="item__main"><span class="item__title">' + U.echapper(e.nom) + "</span>" +
                  '<span class="item__meta">' +
                    (moy !== null ? '<span class="badge badge--accent">Moy. ' + Store.formaterNote(moy) + "</span>" : '<span class="badge badge--outline">Moyenne à saisir</span>') +
                    (d.app ? '<span class="badge">Appréciation rédigée</span>' : '<span class="badge badge--outline">Appréciation à écrire</span>') +
                  "</span></span>" + UI.icone("chevron", "item__chev") +
              "</button>";
            }).join("") + "</div>"
          : UI.note("Aucun élève dans la classe <b>" + U.echapper(r.classePP) + "</b>. Ajoutez-les dans l'onglet Élèves.", "warn")) +
      "</section>" +

      '<section class="section"><div class="section__head"><h2>PDF des appréciations</h2></div>' +
        '<div class="card card--pad stack">' +
          '<p class="small muted">Cochez le ou les trimestres à inclure. Avec deux trimestres, le PDF montre aussi l\'évolution de la moyenne.</p>' +
          '<div class="chips">' + [1, 2, 3].map(function (t) {
            return '<button class="chip" type="button" data-pdf-tri="' + t + '" aria-pressed="' + (!!choixPDF[t]) + '">Trimestre ' + t + "</button>";
          }).join("") + "</div>" +
          '<button class="btn btn--primary btn--block" data-pdf type="button"' + (eleves.length ? "" : " disabled") + ">" +
            UI.icone("export") + "Créer le PDF de la classe</button>" +
        "</div></section>";

    U.sur(conteneur, "click", "[data-tri]", function (e, el) {
      trimestre = Number(el.getAttribute("data-tri"));
      App.rafraichir();
    });
    U.sur(conteneur, "click", "[data-eleve]", function (e, el) { ouvrirEleve(el.getAttribute("data-eleve")); });
    U.sur(conteneur, "click", "[data-pdf-tri]", function (e, el) {
      var t = Number(el.getAttribute("data-pdf-tri"));
      choixPDF[t] = !choixPDF[t];
      el.setAttribute("aria-pressed", choixPDF[t] ? "true" : "false");
    });
    U.sur(conteneur, "click", "[data-pdf]", function () {
      var tris = [1, 2, 3].filter(function (t) { return choixPDF[t]; });
      if (!tris.length) { UI.toast("Cochez au moins un trimestre.", "error"); return; }
      try {
        var nom = ("appreciations-" + r.classePP + "-T" + tris.join("-T") + "-" + U.aujourdhui()).replace(/\s+/g, "").replace(/[^\w.-]/g, "") + ".pdf";
        Exports.livrerPDF(documentClasse(tris), nom);
      } catch (err) { UI.toast("Création du PDF impossible : " + err.message, "error", 5000); }
    });
  }

  /* ================= FICHE D'UN ÉLÈVE ================= */

  function ouvrirEleve(id) {
    var eleves = elevesPP();
    var index = eleves.map(function (e) { return e.id; }).indexOf(id);
    var eleve = eleves[index];
    if (!eleve) return;

    UI.feuille({
      titre: eleve.nom,
      sousTitre: "Prof principal · " + eleve.classe,
      corps:
        '<div class="stack">' +
          [1, 2, 3].map(function (t) {
            var d = donnee(eleve, t);
            return '<div class="card card--pad stack' + (t === trimestre ? " card--actif" : "") + '">' +
              '<div class="row row--between"><b>Trimestre ' + t + "</b>" +
                '<span class="badge badge--accent" data-evolution="' + t + '"></span></div>' +
              UI.champ({ id: "pp-moy-" + t, label: "Moyenne générale", type: "text", valeur: d.moy === "" ? "" : String(d.moy).replace(".", ","),
                         attributs: ' inputmode="decimal" data-moy="' + t + '"', placeholder: "12,5" }) +
              UI.champ({ id: "pp-coll-" + t, label: "Appréciations des collègues (à coller)", type: "textarea", lignes: 3, valeur: d.coll,
                         attributs: ' data-coll="' + t + '" placeholder="Collez ici les appréciations des autres professeurs pour vous en inspirer"' }) +
              UI.champ({ id: "pp-app-" + t, label: "Appréciation générale", type: "textarea", lignes: 4, valeur: d.app, avecMicro: true,
                         attributs: ' data-app="' + t + '" data-tri="' + t + '" placeholder="Appréciation du trimestre ' + t + '"' }) +
            "</div>";
          }).join("") +
        "</div>",
      actions:
        '<button class="btn" data-prec type="button"' + (index === 0 ? " disabled" : "") + ">" + UI.icone("retour") + "Précédent</button>" +
        '<button class="btn btn--primary" data-suiv type="button"' + (index === eleves.length - 1 ? " disabled" : "") + ">Suivant" + UI.icone("chevron") + "</button>",
      surMontage: function (corps, fermer, pied) {
        function majEvolutions() {
          var e = Store.eleves.trouver(id);
          [1, 2, 3].forEach(function (t) {
            var badge = corps.querySelector('[data-evolution="' + t + '"]');
            var cour = moyenneNombre(donnee(e, t).moy);
            var prec = null;
            for (var k = t - 1; k >= 1 && prec === null; k--) prec = moyenneNombre(donnee(e, k).moy);
            if (cour !== null && prec !== null) {
              var diff = Math.round((cour - prec) * 100) / 100;
              badge.textContent = (diff > 0 ? "+" : "") + Store.formaterNote(diff) + " pt" + (Math.abs(diff) >= 2 ? "s" : "") + " vs précédent";
              badge.hidden = false;
            } else { badge.textContent = ""; badge.hidden = true; }
          });
        }

        corps.addEventListener("input", function (ev) {
          var c = ev.target;
          if (c.getAttribute("data-moy")) {
            var n = moyenneNombre(c.value);
            enregistrer(id, Number(c.getAttribute("data-moy")), { moy: n === null ? "" : n });
            majEvolutions();
          } else if (c.getAttribute("data-coll")) {
            enregistrer(id, Number(c.getAttribute("data-coll")), { coll: c.value });
          } else if (c.getAttribute("data-app")) {
            enregistrer(id, Number(c.getAttribute("data-app")), { app: c.value });
          }
        });
        UI.brancherMicro(corps, { surTexte: function (valeur, champ) {
          enregistrer(id, Number(champ.getAttribute("data-tri")), { app: valeur });
        }});

        pied.querySelector("[data-prec]").addEventListener("click", function () {
          fermer(); if (eleves[index - 1]) ouvrirEleve(eleves[index - 1].id);
        });
        pied.querySelector("[data-suiv]").addEventListener("click", function () {
          fermer(); if (eleves[index + 1]) ouvrirEleve(eleves[index + 1].id);
        });
        majEvolutions();
      },
      surFermeture: function () { App.rafraichir(); }
    });
  }

  /* ================= PDF ================= */

  function documentClasse(tris) {
    var r = Store.reglages();
    var eleves = elevesPP();
    var titre = "Appréciations générales — " + r.classePP;
    var doc = PDF.document({ titre: titre, pied: titre });

    doc.titre(titre);
    doc.meta([
      [r.enseignant, r.etablissement].filter(Boolean).join(" · "),
      "Édité le " + U.dateLongue(U.aujourdhui()),
      tris.length > 1 ? "Trimestres " + tris.join(", ") : "Trimestre " + tris[0],
      U.pluriel(eleves.length, "élève")
    ].filter(Boolean).join("  ·  "));

    // Moyenne de la classe : moyenne des moyennes générales saisies.
    var moyennesClasse = tris.map(function (t) {
      var valeurs = eleves.map(function (e) { return moyenneNombre(donnee(e, t).moy); }).filter(function (n) { return n !== null; });
      return valeurs.length ? "T" + t + " : " + Store.formaterNote(valeurs.reduce(function (a, b) { return a + b; }, 0) / valeurs.length) : "";
    }).filter(Boolean);
    if (moyennesClasse.length) doc.etiquettes("Moyenne de la classe (moyennes saisies)  ·  " + moyennesClasse.join("   ·   "));
    doc.filet(1, 0.55);

    eleves.forEach(function (e) {
      doc.garderEnsemble(40 + tris.length * 60);
      doc.section(e.nom);
      var precedente = null;
      tris.forEach(function (t) {
        var d = donnee(e, t);
        var moy = moyenneNombre(d.moy);
        var entete = "Trimestre " + t + "  ·  Moyenne générale : " + (moy === null ? "-" : Store.formaterNote(moy));
        if (moy !== null && precedente) {
          var diff = Math.round((moy - precedente.moy) * 100) / 100;
          entete += "  (" + (diff > 0 ? "+" : "") + Store.formaterNote(diff) + " depuis le trimestre " + precedente.t + ")";
        }
        doc.etiquettes(entete);
        doc.corps(d.app || "Pas d'appréciation.");
        if (moy !== null) precedente = { t: t, moy: moy };
      });
      doc.filet(0.4);
    });
    return doc.blob();
  }

  global.Vues = global.Vues || {};
  global.Vues.pp = {
    titre: "Prof principal",
    sousTitre: "Appréciations générales",
    onglet: "Prof P.",
    icone: "etoile",
    rendre: rendre,
    actif: actif
  };
})(window);
