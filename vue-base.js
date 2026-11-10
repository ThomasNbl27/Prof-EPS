/* =====================================================================
   views/base.js — base EPS : fiches de compétences et attendus
   ===================================================================== */
(function (global) {
  "use strict";

  var onglet = "competences";   // competences | attendus
  var recherche = "";

  /* ================= LISTE ================= */

  function rendre(conteneur) {
    conteneur.innerHTML =
      '<div class="page-head">' +
        "<h1>Base EPS</h1>" +
        "<p>Vos contenus prioritaires, compétences et attendus de fin de cycle</p>" +
      "</div>" +

      '<div class="stack">' +
        '<div class="segmented" role="tablist">' +
          '<button role="tab" type="button" data-onglet="competences" aria-selected="' + (onglet === "competences") + '">' +
            "Compétences <span class=\"muted\">" + Store.competences.compter() + "</span></button>" +
          '<button role="tab" type="button" data-onglet="attendus" aria-selected="' + (onglet === "attendus") + '">' +
            "Attendus <span class=\"muted\">" + Store.attendus.compter() + "</span></button>" +
        "</div>" +
        UI.barreRecherche("Rechercher une APSA, un mot-clé…", recherche) +
        '<button class="btn btn--primary btn--block" data-ajouter type="button">' +
          UI.icone("plus") + "Ajouter une fiche</button>" +
      "</div>" +

      '<section class="section" id="liste-base"></section>';

    var champRecherche = conteneur.querySelector("[data-recherche]");
    champRecherche.addEventListener("input", U.antiRebond(function () {
      recherche = champRecherche.value;
      rafraichirListe(conteneur);
    }, 180));

    U.sur(conteneur, "click", "[data-onglet]", function (e, el) {
      onglet = el.getAttribute("data-onglet");
      U.$$("[data-onglet]", conteneur).forEach(function (b) {
        b.setAttribute("aria-selected", b.getAttribute("data-onglet") === onglet ? "true" : "false");
      });
      rafraichirListe(conteneur);
    });

    U.sur(conteneur, "click", "[data-ajouter]", function () {
      onglet === "competences" ? ouvrirFormulaireCompetence(null) : ouvrirFormulaireAttendu(null);
    });
    U.sur(conteneur, "click", "[data-fiche]", function (e, el) { ouvrirFicheCompetence(el.getAttribute("data-fiche")); });
    U.sur(conteneur, "click", "[data-attendu]", function (e, el) { ouvrirFicheAttendu(el.getAttribute("data-attendu")); });

    rafraichirListe(conteneur);
  }

  function rafraichirListe(conteneur) {
    var zone = conteneur.querySelector("#liste-base");
    zone.innerHTML = onglet === "competences" ? listeCompetences() : listeAttendus();
  }

  function correspond(objet, champs) {
    var q = U.normaliser(recherche);
    if (!q) return true;
    return U.normaliser(champs.map(function (c) { return objet[c] || ""; }).join(" ")).indexOf(q) !== -1;
  }

  function listeCompetences() {
    var toutes = Store.competences.tous();
    if (!toutes.length) {
      return UI.vide({
        icone: "base",
        titre: "Aucune fiche",
        texte: "Créez vos fiches : contenu prioritaire, mots-clés, compétence et attendu associé.",
        action: '<button class="btn btn--primary" data-ajouter type="button">' + UI.icone("plus") + "Créer une fiche</button>"
      });
    }
    var visibles = toutes.filter(function (f) {
      return correspond(f, ["apsa", "cycle", "contenuPrioritaire", "motsCles", "competence", "attenduAssocie"]);
    });
    if (!visibles.length) return UI.vide({ icone: "recherche", titre: "Aucun résultat", texte: "Essayez un autre mot-clé." });

    return U.grouper(trierParAPSA(visibles), "apsa").map(function (groupe) {
      return '<div class="section__head"><h2>' + U.echapper(groupe[0] || "Sans APSA") + "</h2>" +
        '<span class="badge">' + groupe[1].length + "</span></div>" +
        '<div class="list">' + groupe[1].map(ligneCompetence).join("") + "</div>";
    }).join('<div class="divider"></div>');
  }

  function ligneCompetence(f) {
    var mots = String(f.motsCles || "").split(/[,;]/).map(function (m) { return m.trim(); }).filter(Boolean);
    return '<button class="item" type="button" data-fiche="' + f.id + '">' +
      '<span class="item__main">' +
        '<span class="item__title">' + U.echapper(f.contenuPrioritaire || f.competence || "Fiche") + "</span>" +
        '<span class="item__meta">' +
          (f.cycle ? '<span class="badge badge--accent">' + U.echapper(f.cycle) + "</span>" : "") +
          (mots.length ? '<span class="badge badge--outline">' + U.pluriel(mots.length, "mot-clé", "mots-clés") + "</span>" : "") +
          (f.exemple ? '<span class="badge">Exemple</span>' : "") +
        "</span>" +
        (f.competence ? '<span class="item__sub">' + U.echapper(U.tronquer(f.competence, 100)) + "</span>" : "") +
      "</span>" +
      UI.icone("chevron", "item__chev") +
    "</button>";
  }

  function listeAttendus() {
    var tous = Store.attendus.tous();
    if (!tous.length) {
      return UI.vide({
        icone: "cible",
        titre: "Aucun attendu",
        texte: "Enregistrez les attendus de fin de cycle par APSA pour les retrouver en séance.",
        action: '<button class="btn btn--primary" data-ajouter type="button">' + UI.icone("plus") + "Ajouter un attendu</button>"
      });
    }
    var visibles = tous.filter(function (a) { return correspond(a, ["apsa", "cycle", "attendu"]); });
    if (!visibles.length) return UI.vide({ icone: "recherche", titre: "Aucun résultat", texte: "Essayez un autre mot-clé." });

    return U.grouper(trierParAPSA(visibles), "apsa").map(function (groupe) {
      return '<div class="section__head"><h2>' + U.echapper(groupe[0] || "Sans APSA") + "</h2>" +
        '<span class="badge">' + groupe[1].length + "</span></div>" +
        '<div class="list">' + groupe[1].map(function (a) {
          return '<button class="item" type="button" data-attendu="' + a.id + '">' +
            '<span class="item__main">' +
              '<span class="item__title">' + U.echapper(a.cycle || "Cycle non précisé") + "</span>" +
              '<span class="item__sub">' + U.echapper(U.tronquer(a.attendu, 120)) + "</span>" +
            "</span>" +
            UI.icone("chevron", "item__chev") + "</button>";
        }).join("") + "</div>";
    }).join('<div class="divider"></div>');
  }

  function trierParAPSA(liste) {
    return liste.slice().sort(function (a, b) {
      var c = U.normaliser(a.apsa || "").localeCompare(U.normaliser(b.apsa || ""), "fr");
      return c !== 0 ? c : U.normaliser(a.cycle || "").localeCompare(U.normaliser(b.cycle || ""), "fr");
    });
  }

  /* ================= FICHES ================= */

  function ouvrirFicheCompetence(id) {
    var f = Store.competences.trouver(id);
    if (!f) return;
    var mots = String(f.motsCles || "").split(/[,;]/).map(function (m) { return m.trim(); }).filter(Boolean);

    UI.feuille({
      titre: f.apsa || "Fiche compétence",
      sousTitre: [f.cycle, EPS.champDeAPSA(f.apsa).split(" —")[0]].filter(Boolean).join(" · "),
      corps:
        '<div class="detail">' +
          bloc("Contenu prioritaire", f.contenuPrioritaire) +
          (mots.length
            ? '<div class="detail__block"><span class="detail__label">Mots-clés reconnus à la dictée</span>' +
              '<div class="chips">' + mots.map(function (m) {
                return '<span class="chip is-on">' + U.echapper(m) + "</span>";
              }).join("") + "</div></div>"
            : "") +
          bloc("Compétence construite", f.competence) +
          bloc("Attendu associé", f.attenduAssocie) +
          '<button class="btn btn--sm btn--ghost" data-supprimer type="button" style="color:var(--danger)">' +
            UI.icone("poubelle") + "Supprimer la fiche</button>" +
        "</div>",
      actions:
        '<button class="btn" data-fermer type="button">Fermer</button>' +
        '<button class="btn btn--primary" data-modifier type="button">' + UI.icone("crayon") + "Modifier</button>",
      surMontage: function (corps, fermer, pied) {
        pied.querySelector("[data-modifier]").addEventListener("click", function () {
          fermer(); ouvrirFormulaireCompetence(f);
        });
        corps.querySelector("[data-supprimer]").addEventListener("click", function () {
          UI.confirmer({ titre: "Supprimer la fiche", message: "Cette fiche de compétence sera effacée.",
                         valider: "Supprimer", danger: true }).then(function (ok) {
            if (!ok) return;
            Store.competences.supprimer(f.id);
            fermer(); UI.toast("Fiche supprimée."); App.rafraichir();
          });
        });
      }
    });
  }

  function ouvrirFicheAttendu(id) {
    var a = Store.attendus.trouver(id);
    if (!a) return;
    UI.feuille({
      titre: a.apsa || "Attendu",
      sousTitre: a.cycle || "",
      taille: "sm",
      corps: '<div class="detail">' + bloc("Attendu de fin de cycle", a.attendu) +
        '<button class="btn btn--sm btn--ghost" data-supprimer type="button" style="color:var(--danger)">' +
          UI.icone("poubelle") + "Supprimer</button></div>",
      actions:
        '<button class="btn" data-fermer type="button">Fermer</button>' +
        '<button class="btn btn--primary" data-modifier type="button">' + UI.icone("crayon") + "Modifier</button>",
      surMontage: function (corps, fermer, pied) {
        pied.querySelector("[data-modifier]").addEventListener("click", function () { fermer(); ouvrirFormulaireAttendu(a); });
        corps.querySelector("[data-supprimer]").addEventListener("click", function () {
          UI.confirmer({ titre: "Supprimer l'attendu", message: "Cet attendu sera effacé.",
                         valider: "Supprimer", danger: true }).then(function (ok) {
            if (!ok) return;
            Store.attendus.supprimer(a.id);
            fermer(); UI.toast("Attendu supprimé."); App.rafraichir();
          });
        });
      }
    });
  }

  function bloc(label, valeur) {
    var estVide = !valeur || !String(valeur).trim();
    return '<div class="detail__block"><span class="detail__label">' + label + "</span>" +
      '<p class="detail__text' + (estVide ? " is-empty" : "") + '">' +
      U.echapper(estVide ? "Non renseigné" : String(valeur).trim()) + "</p></div>";
  }

  /* ================= FORMULAIRES ================= */

  function ouvrirFormulaireCompetence(fiche) {
    var edition = !!fiche;
    var f = fiche || { apsa: "", cycle: "", contenuPrioritaire: "", motsCles: "", competence: "", attenduAssocie: "" };

    UI.feuille({
      titre: edition ? "Modifier la fiche" : "Nouvelle fiche de compétence",
      sousTitre: "Les mots-clés déclenchent la proposition automatique en séance",
      corps:
        UI.listeOptions("liste-apsa", EPS.listeNomsAPSA().concat(Store.listeActivites())) +
        UI.champ({ id: "f-apsa", label: "APSA", valeur: f.apsa, liste: "liste-apsa",
                   placeholder: "Handball", autofocus: true }) +
        UI.champ({ id: "f-cycle", label: "Cycle", type: "select", valeur: f.cycle,
                   options: [{ valeur: "", libelle: "— Choisir —" }].concat(EPS.CYCLES) }) +
        UI.champ({ id: "f-contenu", label: "Contenu prioritaire", valeur: f.contenuPrioritaire,
                   placeholder: "Créer le déséquilibre pour progresser vers la cible" }) +
        UI.champ({ id: "f-mots", label: "Mots-clés", valeur: f.motsCles,
                   placeholder: "passe, démarquage, contre-attaque",
                   aide: "Séparés par des virgules. Si l'un d'eux apparaît dans le contenu d'une séance, la fiche est proposée." }) +
        UI.champ({ id: "f-competence", label: "Compétence construite", type: "textarea", lignes: 3, valeur: f.competence }) +
        UI.champ({ id: "f-attendu", label: "Attendu associé", type: "textarea", lignes: 3, valeur: f.attenduAssocie }),
      actions:
        '<button class="btn" data-fermer type="button">Annuler</button>' +
        '<button class="btn btn--primary" data-valider type="button">' + UI.icone("check") + "Enregistrer</button>",
      surMontage: function (corps, fermer, pied) {
        pied.querySelector("[data-valider]").addEventListener("click", function () {
          var donnees = {
            apsa: corps.querySelector("#f-apsa").value.trim(),
            cycle: corps.querySelector("#f-cycle").value,
            contenuPrioritaire: corps.querySelector("#f-contenu").value.trim(),
            motsCles: corps.querySelector("#f-mots").value.trim(),
            competence: corps.querySelector("#f-competence").value.trim(),
            attenduAssocie: corps.querySelector("#f-attendu").value.trim(),
            exemple: false
          };
          if (!donnees.apsa) { UI.toast("Indiquez l'APSA.", "error"); return; }
          if (!donnees.competence && !donnees.contenuPrioritaire) {
            UI.toast("Renseignez au moins le contenu prioritaire ou la compétence.", "error"); return;
          }
          if (edition) Store.competences.modifier(f.id, donnees);
          else Store.competences.ajouter(donnees);
          fermer();
          UI.toast(edition ? "Fiche modifiée." : "Fiche enregistrée.");
          App.rafraichir();
        });
      }
    });
  }

  function ouvrirFormulaireAttendu(attendu) {
    var edition = !!attendu;
    var a = attendu || { apsa: "", cycle: "", attendu: "" };

    UI.feuille({
      titre: edition ? "Modifier l'attendu" : "Nouvel attendu de fin de cycle",
      taille: "sm",
      corps:
        UI.listeOptions("liste-apsa-att", EPS.listeNomsAPSA().concat(Store.listeActivites())) +
        UI.champ({ id: "a-apsa", label: "APSA", valeur: a.apsa, liste: "liste-apsa-att", autofocus: true }) +
        UI.champ({ id: "a-cycle", label: "Cycle", type: "select", valeur: a.cycle,
                   options: [{ valeur: "", libelle: "— Choisir —" }].concat(EPS.CYCLES) }) +
        UI.champ({ id: "a-texte", label: "Attendu de fin de cycle", type: "textarea", lignes: 5, valeur: a.attendu }),
      actions:
        '<button class="btn" data-fermer type="button">Annuler</button>' +
        '<button class="btn btn--primary" data-valider type="button">' + UI.icone("check") + "Enregistrer</button>",
      surMontage: function (corps, fermer, pied) {
        pied.querySelector("[data-valider]").addEventListener("click", function () {
          var donnees = {
            apsa: corps.querySelector("#a-apsa").value.trim(),
            cycle: corps.querySelector("#a-cycle").value,
            attendu: corps.querySelector("#a-texte").value.trim(),
            exemple: false
          };
          if (!donnees.attendu) { UI.toast("Le texte de l'attendu est vide.", "error"); return; }
          if (edition) Store.attendus.modifier(a.id, donnees);
          else Store.attendus.ajouter(donnees);
          fermer();
          UI.toast(edition ? "Attendu modifié." : "Attendu enregistré.");
          App.rafraichir();
        });
      }
    });
  }

  global.Vues = global.Vues || {};
  global.Vues.base = {
    titre: "Base EPS",
    sousTitre: "Compétences et attendus",
    onglet: "Base EPS",
    icone: "base",
    rendre: rendre
  };
})(window);
