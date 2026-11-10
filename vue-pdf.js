/* =====================================================================
   views/pdf.js — onglet PDF : choisir, vérifier, exporter
   ===================================================================== */
(function (global) {
  "use strict";

  var choix = {
    periode: "tout",      // tout | mois | trimestre | personnalise
    depuis: "",
    jusqua: "",
    classe: "",
    activite: "",
    competences: true,
    observations: true,
    parClasse: false      // une classe par page
  };

  /* ---------- Sélection des séances ---------- */

  function bornes() {
    var maintenant = new Date();
    if (choix.periode === "mois") {
      return {
        depuis: U.versISO(new Date(maintenant.getFullYear(), maintenant.getMonth(), 1)),
        jusqua: U.versISO(new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 0))
      };
    }
    if (choix.periode === "trimestre") {
      var debut = new Date(maintenant);
      debut.setMonth(debut.getMonth() - 3);
      return { depuis: U.versISO(debut), jusqua: U.versISO(maintenant) };
    }
    if (choix.periode === "personnalise") {
      return { depuis: choix.depuis, jusqua: choix.jusqua };
    }
    return { depuis: "", jusqua: "" };
  }

  function selection() {
    var b = bornes();
    return Store.seancesTriees().filter(function (s) {
      if (choix.classe && s.classe !== choix.classe) return false;
      if (choix.activite && s.activite !== choix.activite) return false;
      if (b.depuis && (s.date || "") < b.depuis) return false;
      if (b.jusqua && (s.date || "") > b.jusqua) return false;
      return true;
    });
  }

  function intitule() {
    var morceaux = ["Cahier de texte EPS"];
    if (choix.classe) morceaux.push(choix.classe);
    if (choix.activite) morceaux.push(choix.activite);
    return morceaux.join(" — ");
  }

  function nomFichier(base) {
    var bouts = [base];
    if (choix.classe) bouts.push(choix.classe.replace(/\s+/g, ""));
    bouts.push(U.aujourdhui());
    return bouts.join("-").replace(/[^\w.-]/g, "") + ".pdf";
  }

  /* ---------- Construction du document ---------- */

  function documentSeances(seances) {
    var r = Store.reglages();
    var entete = [r.enseignant, r.etablissement].filter(Boolean).join(" · ");
    var doc = PDF.document({ titre: intitule(), pied: intitule() });

    doc.titre(intitule());
    doc.meta([
      entete,
      "Édité le " + U.dateLongue(U.aujourdhui()),
      U.pluriel(seances.length, "séance"),
      periodeLisible(seances)
    ].filter(Boolean).join("  ·  "));
    doc.filet(1, 0.55);

    var groupes = choix.parClasse
      ? U.grouper(seances, function (s) { return s.classe || "Sans classe"; })
      : [[null, seances]];

    groupes.forEach(function (groupe, index) {
      if (choix.parClasse) {
        if (index > 0) doc.sautDePage();
        doc.section("Classe " + groupe[0]);
        doc.espace(4);
      }
      groupe[1].forEach(function (s) {
        doc.garderEnsemble(76);
        doc.section(U.dateAvecJour(s.date) + " — " + (s.classe || "Classe non précisée"));
        doc.etiquettes([s.activite, s.cycle].filter(Boolean).join("  ·  ") || "—");
        doc.champ("Contenu de la séance", s.contenu);
        if (choix.competences) doc.champ("Compétences travaillées", s.competences);
        if (choix.observations) doc.champ("Observations", s.observations);
        doc.filet(0.4);
      });
    });

    return doc.blob();
  }

  function documentEleves() {
    var r = Store.reglages();
    var eleves = Store.elevesTries();
    var seuil = Number(r.seuilAlerte) || 3;
    var doc = PDF.document({ titre: "Suivi des élèves", pied: "Suivi des élèves" });

    doc.titre("Suivi des élèves");
    doc.meta([
      [r.enseignant, r.etablissement].filter(Boolean).join(" · "),
      "Édité le " + U.dateLongue(U.aujourdhui()),
      U.pluriel(eleves.length, "élève"),
      "Seuil d'alerte : " + seuil
    ].filter(Boolean).join("  ·  "));
    doc.filet(1, 0.55);

    U.grouper(eleves, "classe").forEach(function (groupe) {
      doc.garderEnsemble(80);
      doc.section(groupe[0] || "Sans classe");
      doc.tableau(
        ["Nom", "Oubli tenue", "Oubli matér.", "Absences", "Dispense", "Alerte"],
        groupe[1].map(function (e) {
          var alerte = Store.totalCompteurs(e, seuil) > 0;
          return [e.nom, e.oublis || 0, e.oublisMateriel || 0, e.absences || 0, Store.libelleDispense(e), alerte ? "Oui" : ""];
        }),
        [0.30, 0.12, 0.12, 0.12, 0.24, 0.10]
      );
    });

    return doc.blob();
  }

  function periodeLisible(seances) {
    if (!seances.length) return "";
    var dates = seances.map(function (s) { return s.date; }).filter(Boolean).sort();
    if (!dates.length) return "";
    if (dates[0] === dates[dates.length - 1]) return U.dateLongue(dates[0]);
    return "du " + U.dateLongue(dates[0]) + " au " + U.dateLongue(dates[dates.length - 1]);
  }

  /* ---------- Livraison du fichier ---------- */

  function partageFichierPossible() {
    try {
      return !!(navigator.canShare && navigator.canShare({
        files: [new File([new Blob(["x"])], "t.pdf", { type: "application/pdf" })]
      }));
    } catch (e) { return false; }
  }

  function livrer(blob, nom, partager) {
    if (partager && partageFichierPossible()) {
      var fichier = new File([blob], nom, { type: "application/pdf" });
      navigator.share({ files: [fichier], title: nom })
        .catch(function () { U.telecharger(nom, blob); });
      return;
    }
    U.telecharger(nom, blob);
    UI.toast("PDF créé : " + nom);
  }

  /* ---------- Vue ---------- */

  function rendre(conteneur) {
    var toutes = Store.seancesTriees();
    var classes = Store.listeClasses();
    var activites = Store.listeActivites().filter(function (a) {
      return toutes.some(function (s) { return s.activite === a; });
    });

    conteneur.innerHTML =
      '<div class="page-head">' +
        "<h1>Export PDF</h1>" +
        "<p>Choisissez ce que vous voulez sortir, vérifiez, exportez</p>" +
      "</div>" +

      (!toutes.length
        ? UI.vide({
            icone: "seances",
            titre: "Rien à exporter",
            texte: "Ajoutez ou dictez une première séance : elle apparaîtra ici aussitôt.",
            action: '<button class="btn btn--primary" data-action="nouvelle-seance" type="button">' +
                    UI.icone("plus") + "Ajouter une séance</button>"
          })
        :
      /* ---- Filtres ---- */
      '<section class="section">' +
        '<div class="section__head"><h2>Période</h2></div>' +
        '<div class="chips chips--scroll">' +
          bouton("tout", "Toutes") +
          bouton("mois", "Ce mois-ci") +
          bouton("trimestre", "3 derniers mois") +
          bouton("personnalise", "Dates précises") +
        "</div>" +
        '<div id="zone-dates" class="stack" style="margin-top:12px"' + (choix.periode === "personnalise" ? "" : " hidden") + ">" +
          '<div class="field__row">' +
            '<div class="grow">' + UI.champ({ id: "d-depuis", label: "Du", type: "date", valeur: choix.depuis }) + "</div>" +
            '<div class="grow">' + UI.champ({ id: "d-jusqua", label: "Au", type: "date", valeur: choix.jusqua }) + "</div>" +
          "</div>" +
        "</div>" +
      "</section>" +

      '<section class="section">' +
        '<div class="section__head"><h2>Filtres</h2></div>' +
        '<div class="stack">' +
          UI.champ({ id: "d-classe", label: "Classe", type: "select", valeur: choix.classe,
                     options: [{ valeur: "", libelle: "Toutes les classes" }].concat(classes) }) +
          UI.champ({ id: "d-activite", label: "Activité", type: "select", valeur: choix.activite,
                     options: [{ valeur: "", libelle: "Toutes les activités" }].concat(activites) }) +
        "</div>" +
      "</section>" +

      '<section class="section">' +
        '<div class="section__head"><h2>Contenu du document</h2></div>' +
        '<div class="card card--pad stack">' +
          interrupteur("competences", "Inclure les compétences", choix.competences) +
          interrupteur("observations", "Inclure les observations", choix.observations) +
          interrupteur("parClasse", "Une classe par page", choix.parClasse) +
        "</div>" +
      "</section>" +

      /* ---- Récapitulatif et actions ---- */
      '<section class="section">' +
        '<div class="section__head"><h2>À exporter</h2></div>' +
        '<div id="zone-recap"></div>' +
      "</section>" +

      /* ---- Suivi des élèves ---- */
      '<section class="section">' +
        '<div class="section__head"><h2>Suivi des élèves</h2></div>' +
        '<div class="card card--pad stack">' +
          '<p class="small muted">Tableau des oublis, absences et dispenses, classe par classe.</p>' +
          '<button class="btn' + (Store.eleves.compter() ? "" : " btn--soft") + '" data-pdf-eleves type="button"' +
            (Store.eleves.compter() ? "" : " disabled") + ">" +
            UI.icone("document") + "PDF du suivi élèves</button>" +
        "</div>" +
      "</section>" +

      '<section class="section">' +
        '<div class="section__head"><h2>Autres formats</h2></div>' +
        '<div class="btn-row">' +
          '<button class="btn btn--sm" data-word type="button">' + UI.icone("document") + "Word</button>" +
          '<button class="btn btn--sm" data-csv type="button">' + UI.icone("tableur") + "CSV</button>" +
          '<button class="btn btn--sm" data-imprimer type="button">' + UI.icone("imprimer") + "Imprimer</button>" +
        "</div>" +
      "</section>");

    if (toutes.length) {
      majRecap(conteneur);
      brancher(conteneur);
    }
  }

  function bouton(valeur, libelle) {
    return '<button class="chip" type="button" data-periode="' + valeur + '" aria-pressed="' +
      (choix.periode === valeur ? "true" : "false") + '">' + U.echapper(libelle) + "</button>";
  }

  function interrupteur(cle, libelle, actif) {
    return '<label class="switch">' +
      '<input type="checkbox" data-option="' + cle + '"' + (actif ? " checked" : "") + ">" +
      '<span class="switch__track"></span>' +
      "<span>" + U.echapper(libelle) + "</span></label>";
  }

  function majRecap(conteneur) {
    var seances = selection();
    var zone = conteneur.querySelector("#zone-recap");
    if (!zone) return;

    if (!seances.length) {
      zone.innerHTML = UI.note("Aucune séance ne correspond à ces critères. Élargissez la période ou retirez un filtre.", "warn");
      return;
    }

    var classes = {};
    seances.forEach(function (s) { if (s.classe) classes[s.classe] = 1; });

    zone.innerHTML =
      '<div class="card card--pad stack">' +
        '<div class="row row--between">' +
          "<div>" +
            '<div style="font-size:22px;font-weight:700;font-family:var(--font-num)">' +
              U.pluriel(seances.length, "séance") + "</div>" +
            '<div class="small muted">' + U.echapper(periodeLisible(seances)) + "</div>" +
          "</div>" +
          '<span class="badge badge--accent">' + U.pluriel(Object.keys(classes).length, "classe") + "</span>" +
        "</div>" +
        '<div class="chips">' +
          Object.keys(classes).sort(U.comparerClasses).slice(0, 8).map(function (c) {
            return '<span class="chip is-on">' + U.echapper(c) + "</span>";
          }).join("") +
        "</div>" +
        '<button class="btn btn--primary btn--lg btn--block" data-pdf type="button">' +
          UI.icone("export") + "Télécharger le PDF</button>" +
        (partageFichierPossible()
          ? '<button class="btn btn--block" data-pdf-partage type="button">' +
            UI.icone("export") + "Envoyer le PDF…</button>"
          : "") +
        '<p class="small muted">Fichier : ' + U.echapper(nomFichier("cahier-eps")) + "</p>" +
      "</div>";
  }

  function brancher(conteneur) {
    U.sur(conteneur, "click", "[data-periode]", function (e, el) {
      choix.periode = el.getAttribute("data-periode");
      U.$$("[data-periode]", conteneur).forEach(function (b) {
        b.setAttribute("aria-pressed", b.getAttribute("data-periode") === choix.periode ? "true" : "false");
      });
      conteneur.querySelector("#zone-dates").hidden = choix.periode !== "personnalise";
      majRecap(conteneur);
    });

    ["d-depuis", "d-jusqua"].forEach(function (id) {
      var champ = conteneur.querySelector("#" + id);
      if (!champ) return;
      champ.addEventListener("change", function () {
        choix[id === "d-depuis" ? "depuis" : "jusqua"] = champ.value;
        majRecap(conteneur);
      });
    });

    ["d-classe", "d-activite"].forEach(function (id) {
      var champ = conteneur.querySelector("#" + id);
      champ.addEventListener("change", function () {
        choix[id === "d-classe" ? "classe" : "activite"] = champ.value;
        majRecap(conteneur);
      });
    });

    U.sur(conteneur, "change", "[data-option]", function (e, el) {
      choix[el.getAttribute("data-option")] = el.checked;
      majRecap(conteneur);
    });

    U.sur(conteneur, "click", "[data-pdf]", function () { exporter(false); });
    U.sur(conteneur, "click", "[data-pdf-partage]", function () { exporter(true); });

    U.sur(conteneur, "click", "[data-pdf-eleves]", function () {
      try {
        livrer(documentEleves(), nomFichier("suivi-eleves"), partageFichierPossible());
      } catch (err) {
        UI.toast("Création du PDF impossible : " + err.message, "error", 5000);
      }
    });

    U.sur(conteneur, "click", "[data-word]", function () {
      Exports.exporterWordSeances(filtreExports(), intitule());
    });
    U.sur(conteneur, "click", "[data-csv]", function () {
      Exports.exporterCSVSeances(filtreExports());
    });
    U.sur(conteneur, "click", "[data-imprimer]", function () {
      Exports.imprimerSeances(filtreExports(), intitule());
    });
  }

  function filtreExports() {
    var b = bornes();
    return { classe: choix.classe, activite: choix.activite, depuis: b.depuis, jusqua: b.jusqua };
  }

  function exporter(partager) {
    var seances = selection();
    if (!seances.length) { UI.toast("Aucune séance à exporter.", "error"); return; }
    try {
      livrer(documentSeances(seances), nomFichier("cahier-eps"), partager);
      U.vibrer(18);
    } catch (err) {
      UI.toast("Création du PDF impossible : " + err.message, "error", 5000);
    }
  }

  global.Vues = global.Vues || {};
  global.Vues.pdf = {
    titre: "Export PDF",
    sousTitre: "Cahier de texte",
    onglet: "PDF",
    icone: "document",
    rendre: rendre,
    documentSeances: documentSeances,
    documentEleves: documentEleves
  };
})(window);
