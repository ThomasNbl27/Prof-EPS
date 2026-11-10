/* =====================================================================
   views/resume.js — résumé de chaque élève, trié par classe
   Notes (reliées aux évaluations), appréciations par trimestre,
   suivi (oublis, absences, punitions, dispenses), observations, PDF.
   ===================================================================== */
(function (global) {
  "use strict";

  var classeActive = "";

  function sauvegardeAppreciation(id, trimestre, texte) {
    var e = Store.eleves.trouver(id);
    if (!e) return;
    var app = Object.assign({}, e.appreciations || {});
    app["t" + trimestre] = texte;
    Store.eleves.modifier(id, { appreciations: app });
  }

  function nomFichier(base) {
    return (base + "-" + U.aujourdhui()).replace(/\s+/g, "").replace(/[^\w.-]/g, "") + ".pdf";
  }

  /* ================= LISTE ================= */

  function classesAvecEleves() {
    var vus = {};
    Store.eleves.tous().forEach(function (e) { if (e.classe) vus[e.classe] = 1; });
    return Object.keys(vus).sort(U.comparerClasses);
  }

  function rendre(conteneur) {
    var classes = classesAvecEleves();
    if (!classeActive || classes.indexOf(classeActive) === -1) classeActive = classes[0] || "";
    var eleves = Store.elevesTries().filter(function (e) { return e.classe === classeActive; });
    var tri = Store.trimestreDe(U.aujourdhui());

    conteneur.innerHTML =
      '<div class="page-head"><h1>Résumé élève</h1>' +
        "<p>Notes, appréciations, suivi et observations — exportables en PDF</p></div>" +
      (!classes.length
        ? UI.vide({ icone: "dossier", titre: "Aucun élève", texte: "Ajoutez vos classes dans l'onglet Élèves : leurs résumés apparaîtront ici." })
        :
      '<div class="stack">' +
        '<div class="chips chips--scroll">' +
          classes.map(function (c) {
            return '<button class="chip" type="button" data-classe="' + U.echapper(c) + '" aria-pressed="' + (c === classeActive) + '">' + U.echapper(c) + "</button>";
          }).join("") +
        "</div>" +
        '<button class="btn btn--block" data-pdf-classe type="button">' + UI.icone("export") + "PDF de la classe " + U.echapper(classeActive) + " (un élève par page)</button>" +
      "</div>" +
      '<section class="section"><div class="section__head"><h2>' + U.echapper(classeActive) + "</h2>" +
        '<span class="badge">' + U.pluriel(eleves.length, "élève") + "</span></div>" +
        '<div class="list">' + eleves.map(function (e) {
          var moy = Store.moyenneTrimestre(e, tri);
          var nbApp = ["t1", "t2", "t3"].filter(function (k) { return (e.appreciations || {})[k]; }).length;
          return '<button class="item" type="button" data-eleve="' + e.id + '">' +
            '<span class="avatar">' + U.echapper(U.initiales(e.nom)) + "</span>" +
            '<span class="item__main"><span class="item__title">' + U.echapper(e.nom) + "</span>" +
              '<span class="item__meta">' +
                (moy !== null ? '<span class="badge badge--accent">T' + tri + " : " + Store.formaterNote(moy) + "</span>" : '<span class="badge badge--outline">T' + tri + " : pas de note</span>") +
                (nbApp ? '<span class="badge">' + U.pluriel(nbApp, "appréciation") + "</span>" : "") +
              "</span></span>" + UI.icone("chevron", "item__chev") +
          "</button>";
        }).join("") + "</div></section>");

    U.sur(conteneur, "click", "[data-classe]", function (ev, el) {
      classeActive = el.getAttribute("data-classe");
      App.rafraichir();
    });
    U.sur(conteneur, "click", "[data-eleve]", function (ev, el) { ouvrirResume(el.getAttribute("data-eleve")); });
    U.sur(conteneur, "click", "[data-pdf-classe]", function () {
      try {
        Exports.livrerPDF(documentClasse(classeActive), nomFichier("resumes-" + classeActive));
      } catch (err) { UI.toast("Création du PDF impossible : " + err.message, "error", 5000); }
    });
  }

  /* ================= RÉSUMÉ D'UN ÉLÈVE ================= */

  function ouvrirResume(id) {
    var eleve = Store.eleves.trouver(id);
    if (!eleve) return;
    var triCourant = Store.trimestreDe(U.aujourdhui());

    UI.feuille({
      titre: eleve.nom,
      sousTitre: (eleve.classe || "Sans classe") + " · Résumé",
      corps: '<div class="stack" id="resume-corps"></div>',
      actions:
        '<button class="btn" data-fermer type="button">Fermer</button>' +
        '<button class="btn btn--primary" data-pdf type="button">' + UI.icone("export") + "PDF de l'élève</button>",
      surMontage: function (corps, fermer, pied) {
        var zone = corps.querySelector("#resume-corps");

        function dessiner() {
          var e = Store.eleves.trouver(id);
          zone.innerHTML =
            blocIdentite(e) + blocNotes(e) + blocAppreciations(e, triCourant) + blocSuivi(e) + blocObservations(e);
          UI.brancherMicro(zone, { surTexte: function (valeur, champ) {
            sauvegardeAppreciation(id, Number(champ.getAttribute("data-tri")), valeur);
          }});
        }

        zone.addEventListener("input", function (ev) {
          var cible = ev.target;
          if (cible.getAttribute && cible.getAttribute("data-appreciation")) {
            sauvegardeAppreciation(id, Number(cible.getAttribute("data-appreciation")), cible.value);
          }
        });

        U.sur(zone, "click", "[data-ajout-obs]", function () {
          var texte = zone.querySelector("#obs-texte").value.trim();
          if (!texte) { UI.toast("Écrivez l'observation.", "error"); return; }
          var e = Store.eleves.trouver(id);
          var liste = (e.observations || []).concat([{
            id: U.uid(), date: zone.querySelector("#obs-date").value || U.aujourdhui(), texte: texte
          }]);
          Store.eleves.modifier(id, { observations: liste });
          // On ne redessine que les observations pour ne pas perdre une appréciation en cours de frappe.
          zone.querySelector("#zone-obs").outerHTML = blocObservations(Store.eleves.trouver(id));
          UI.toast("Observation ajoutée.");
        });
        U.sur(zone, "click", "[data-suppr-obs]", function (ev, el) {
          var e = Store.eleves.trouver(id);
          Store.eleves.modifier(id, { observations: (e.observations || []).filter(function (o) { return o.id !== el.getAttribute("data-suppr-obs"); }) });
          zone.querySelector("#zone-obs").outerHTML = blocObservations(Store.eleves.trouver(id));
        });

        pied.querySelector("[data-pdf]").addEventListener("click", function () {
          try {
            var e = Store.eleves.trouver(id);
            Exports.livrerPDF(documentEleve(e), nomFichier("resume-" + e.nom));
          } catch (err) { UI.toast("Création du PDF impossible : " + err.message, "error", 5000); }
        });

        dessiner();
      },
      surFermeture: function () { App.rafraichir(); }
    });
  }

  function titreBloc(t) { return '<div class="section__head" style="margin:8px 0 0"><h2>' + t + "</h2></div>"; }

  function blocIdentite(e) {
    var disp = Store.dispenseEnCours(e);
    var dispositifs = e.dispositifs || [];
    if (!disp && !dispositifs.length && !e.dispositifsNote) return "";
    return '<div class="card card--pad stack stack--sm">' +
      '<div class="chips">' +
        dispositifs.map(function (d) { return '<span class="badge badge--info">' + U.echapper(d) + "</span>"; }).join("") +
        (disp ? '<span class="badge badge--warn">Dispensé jusqu\'au ' + U.echapper(U.dateLongue(disp.fin || disp.debut)) + "</span>" : "") +
      "</div>" +
      (e.dispositifsNote ? '<p class="small">' + U.echapper(e.dispositifsNote) + "</p>" : "") +
    "</div>";
  }

  function blocNotes(e) {
    var notes = Store.notesEleve(e);
    var html = titreBloc("Notes");
    if (!notes.length) {
      return html + '<p class="small muted">Aucune note pour l\'instant : elles apparaissent dès qu\'une évaluation est notée.</p>';
    }
    [1, 2, 3].forEach(function (t) {
      var liste = notes.filter(function (n) { return n.trimestre === t; });
      if (!liste.length) return;
      html += '<div class="card card--pad stack stack--sm">' +
        '<div class="row row--between"><b>Trimestre ' + t + "</b>" +
          '<span class="badge badge--accent">Moyenne ' + Store.formaterNote(Store.moyenneTrimestre(e, t)) + " / 20</span></div>" +
        liste.map(function (n) {
          return '<div class="row row--between small"><span>' + U.echapper(n.evaluation.titre || "Évaluation") +
            (n.evaluation.activite ? ' <span class="muted">· ' + U.echapper(n.evaluation.activite) + "</span>" : "") +
            (n.coef !== 1 ? ' <span class="muted">· coef ' + Store.formaterNote(n.coef) + "</span>" : "") + "</span>" +
            "<b>" + Store.formaterNote(n.sur20) + " / 20</b></div>";
        }).join("") +
      "</div>";
    });
    var annuelle = Store.moyenneAnnuelle(e);
    if (annuelle !== null) {
      html += '<div class="card card--pad row row--between"><b>Moyenne annuelle</b>' +
        '<span class="badge badge--accent">' + Store.formaterNote(annuelle) + " / 20</span></div>" +
        '<p class="small muted">Moyenne des moyennes de trimestre.</p>';
    }
    return html;
  }

  function blocAppreciations(e, triCourant) {
    var app = e.appreciations || {};
    return titreBloc("Appréciations") + [1, 2, 3].map(function (t) {
      return UI.champ({
        id: "app-" + t, label: "Trimestre " + t + (t === triCourant ? " (en cours)" : ""),
        type: "textarea", lignes: 3, valeur: app["t" + t] || "", avecMicro: true,
        attributs: ' data-appreciation="' + t + '" data-tri="' + t + '" placeholder="Appréciation du trimestre ' + t + '"'
      });
    }).join("");
  }

  function blocSuivi(e) {
    var punitions = (e.punitions || []).slice().sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); });
    var dispenses = (e.dispensesListe || []).slice().sort(function (a, b) { return (b.debut || "").localeCompare(a.debut || ""); });
    return titreBloc("Suivi") +
      '<div class="card card--pad stack stack--sm">' +
        '<div class="tally">' +
          '<span class="tally__cell">Tenue <b>' + (e.oublis || 0) + "</b></span>" +
          '<span class="tally__cell">Matériel <b>' + (e.oublisMateriel || 0) + "</b></span>" +
          '<span class="tally__cell">Absences <b>' + (e.absences || 0) + "</b></span>" +
          '<span class="tally__cell">Punitions <b>' + punitions.length + "</b></span>" +
        "</div>" +
        (dispenses.length ? '<div class="small"><b>Dispenses</b><br>' + dispenses.map(function (d) {
          return U.echapper(U.dateLongue(d.debut, true) + (d.fin && d.fin !== d.debut ? " au " + U.dateLongue(d.fin) : "") + (d.motif ? " — " + d.motif : ""));
        }).join("<br>") + "</div>" : "") +
        (punitions.length ? '<div class="small"><b>Punitions</b><br>' + punitions.map(function (p) {
          return U.echapper(U.dateLongue(p.date, true) + (p.motif ? " — " + p.motif : ""));
        }).join("<br>") + "</div>" : "") +
        '<p class="small muted">Se modifie depuis la fiche de l\'élève (onglet Élèves).</p>' +
      "</div>";
  }

  function blocObservations(e) {
    var liste = (e.observations || []).slice().sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); });
    return '<div id="zone-obs" class="stack">' +
      titreBloc("Observations") +
      (liste.length ? liste.map(function (o) {
        return '<div class="card card--pad row row--between" style="align-items:flex-start">' +
          '<div><b>' + U.echapper(U.dateLongue(o.date)) + '</b><div class="small" style="white-space:pre-wrap">' + U.echapper(o.texte) + "</div></div>" +
          '<button class="iconbtn" type="button" data-suppr-obs="' + o.id + '" aria-label="Supprimer l\'observation">' + UI.icone("poubelle") + "</button></div>";
      }).join("") : '<p class="small muted">Aucune observation. Notez ici ce qui est important : rendez-vous avec les parents, échange avec la vie scolaire…</p>') +
      '<div class="card card--pad stack stack--sm">' +
        UI.champ({ id: "obs-date", label: "Date", type: "date", valeur: U.aujourdhui() }) +
        UI.champ({ id: "obs-texte", label: "Nouvelle observation", type: "textarea", lignes: 3, placeholder: "Réunion avec les parents, point sur le comportement…" }) +
        '<button class="btn btn--sm btn--primary" type="button" data-ajout-obs>' + UI.icone("plus") + "Ajouter l'observation</button>" +
      "</div>" +
    "</div>";
  }

  /* ================= PDF ================= */

  function ecrireEleve(doc, e) {
    var r = Store.reglages();
    doc.titre(e.nom);
    doc.meta([e.classe, [r.enseignant, r.etablissement].filter(Boolean).join(" · "), "Édité le " + U.dateLongue(U.aujourdhui())]
      .filter(Boolean).join("  ·  "));
    doc.filet(1, 0.55);

    var dispositifs = (e.dispositifs || []).join(", ");
    if (dispositifs || e.dispositifsNote) {
      doc.champ("Dispositifs particuliers", [dispositifs, e.dispositifsNote].filter(Boolean).join(" — "));
    }

    doc.section("Notes");
    var notes = Store.notesEleve(e);
    if (!notes.length) doc.corps("Aucune note enregistrée.");
    [1, 2, 3].forEach(function (t) {
      var liste = notes.filter(function (n) { return n.trimestre === t; });
      if (!liste.length) return;
      doc.garderEnsemble(70);
      doc.etiquettes("Trimestre " + t + "  ·  moyenne " + Store.formaterNote(Store.moyenneTrimestre(e, t)) + " / 20");
      doc.tableau(["Évaluation", "Activité", "Date", "Note /20"],
        liste.map(function (n) {
          return [n.evaluation.titre || "Évaluation", n.evaluation.activite || "", n.evaluation.date ? U.dateLongue(n.evaluation.date, true) : "", Store.formaterNote(n.sur20)];
        }), [0.42, 0.24, 0.18, 0.16]);
    });

    var annuelle = Store.moyenneAnnuelle(e);
    if (annuelle !== null) doc.etiquettes("Moyenne annuelle (moyenne des trimestres) : " + Store.formaterNote(annuelle) + " / 20");

    var app = e.appreciations || {};
    if (app.t1 || app.t2 || app.t3) {
      doc.garderEnsemble(60);
      doc.section("Appréciations");
      [1, 2, 3].forEach(function (t) { doc.champ("Trimestre " + t, app["t" + t]); });
    }

    doc.garderEnsemble(60);
    doc.section("Suivi");
    doc.corps("Oublis de tenue : " + (e.oublis || 0) + "   ·   Oublis de matériel : " + (e.oublisMateriel || 0) +
      "   ·   Absences : " + (e.absences || 0) + "   ·   Punitions : " + (e.punitions || []).length);
    var libellesHisto = { oublis: "Oubli de tenue", oublisMateriel: "Oubli de matériel", absences: "Absence" };
    doc.champ("Détail daté des oublis et absences", (e.historique || []).slice().sort(function (a, b) {
      return (a.date || "").localeCompare(b.date || "");
    }).map(function (h) { return U.dateLongue(h.date, true) + " - " + (libellesHisto[h.type] || h.type); }).join("\n"));
    var dispenses = (e.dispensesListe || []).slice().sort(function (a, b) { return (a.debut || "").localeCompare(b.debut || ""); });
    doc.champ("Dispenses", dispenses.map(function (d) {
      return U.dateLongue(d.debut, true) + (d.fin && d.fin !== d.debut ? " au " + U.dateLongue(d.fin) : "") + (d.motif ? " - " + d.motif : "");
    }).join("\n"));
    var punitions = (e.punitions || []).slice().sort(function (a, b) { return (a.date || "").localeCompare(b.date || ""); });
    doc.champ("Punitions", punitions.map(function (p) {
      return U.dateLongue(p.date, true) + (p.motif ? " - " + p.motif : "");
    }).join("\n"));

    var obs = (e.observations || []).slice().sort(function (a, b) { return (a.date || "").localeCompare(b.date || ""); });
    if (obs.length) {
      doc.garderEnsemble(60);
      doc.section("Observations");
      obs.forEach(function (o) { doc.champ(U.dateLongue(o.date), o.texte); });
    }
  }

  function documentEleve(e) {
    var doc = PDF.document({ titre: "Résumé — " + e.nom, pied: "Résumé — " + e.nom });
    ecrireEleve(doc, e);
    return doc.blob();
  }

  function documentClasse(classe) {
    var eleves = Store.elevesTries().filter(function (e) { return e.classe === classe; });
    var doc = PDF.document({ titre: "Résumés — " + classe, pied: "Résumés — " + classe });
    eleves.forEach(function (e, i) {
      if (i > 0) doc.sautDePage();
      ecrireEleve(doc, e);
    });
    return doc.blob();
  }

  global.Vues = global.Vues || {};
  global.Vues.resume = {
    titre: "Résumé élève",
    sousTitre: "Notes, appréciations, suivi",
    onglet: "Résumé",
    icone: "dossier",
    rendre: rendre
  };
})(window);
