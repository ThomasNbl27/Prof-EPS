/* =====================================================================
   views/seances.js — cahier de texte : liste, fiche, formulaire, dictée
   ===================================================================== */
(function (global) {
  "use strict";

  var filtre = { texte: "", classe: "", activite: "" };

  /* ================= LISTE ================= */

  function rendre(conteneur) {
    var toutes = Store.seancesTriees();
    var classes = Store.listeClasses();
    var activites = uniques(toutes.map(function (s) { return s.activite; }));
    var visibles = appliquerFiltre(toutes);

    conteneur.innerHTML =
      '<div class="page-head">' +
        "<h1>Cahier de texte</h1>" +
        "<p>" + (toutes.length
          ? U.pluriel(toutes.length, "séance") + " enregistrée" + (toutes.length > 1 ? "s" : "")
          : "Aucune séance pour l'instant") + "</p>" +
      "</div>" +

      '<div class="stack">' +
        UI.barreRecherche("Rechercher une classe, une activité…", filtre.texte) +
        (classes.length || activites.length ?
        '<div class="chips chips--scroll">' +
          puce("Toutes", "", !filtre.classe && !filtre.activite, "reset") +
          classes.map(function (c) { return puce(c, c, filtre.classe === c, "classe"); }).join("") +
          activites.map(function (a) { return puce(a, a, filtre.activite === a, "activite"); }).join("") +
        "</div>" : "") +
      "</div>" +

      '<section class="section" id="liste-seances">' + listeHTML(visibles, toutes.length) + "</section>";

    brancherListe(conteneur);
  }

  function listeHTML(visibles, total) {
    if (!total) {
      return UI.vide({
        icone: "seances",
        titre: "Votre cahier est vide",
        texte: "Notez votre première séance. La dictée vocale remplit la date, la classe et l'activité toute seule.",
        action: '<button class="btn btn--primary" data-action="nouvelle-seance" type="button">' +
                UI.icone("plus") + "Ajouter une séance</button>"
      });
    }
    if (!visibles.length) {
      return UI.vide({ icone: "recherche", titre: "Aucun résultat", texte: "Modifiez la recherche ou retirez les filtres." });
    }
    return U.grouper(visibles, function (s) { return U.moisAnnee(s.date); })
      .map(function (groupe) {
        return '<div class="section__head"><h2>' + U.echapper(groupe[0]) + "</h2>" +
          '<span class="badge">' + groupe[1].length + "</span></div>" +
          '<div class="list">' + groupe[1].map(ligne).join("") + "</div>";
      }).join('<div class="divider"></div>');
  }

  function ligne(s) {
    var resume = U.tronquer(s.contenu || s.competences || "", 90);
    return '<button class="item" type="button" data-seance="' + s.id + '">' +
      '<span class="avatar avatar--date avatar--accent">' +
        U.jourDuMois(s.date) + "<small>" + U.echapper(U.moisCourt(s.date)) + "</small></span>" +
      '<span class="item__main">' +
        '<span class="item__title">' + U.echapper(s.classe || "Classe non précisée") +
          (s.activite ? " · " + U.echapper(s.activite) : "") + "</span>" +
        (resume ? '<span class="item__sub">' + U.echapper(resume) + "</span>" : "") +
        '<span class="item__meta">' +
          (s.cycle ? '<span class="badge badge--outline">' + U.echapper(s.cycle) + "</span>" : "") +
          (s.competences ? '<span class="badge badge--accent">' + UI.icone("check") + "Compétences</span>" : "") +
          (s.observations ? '<span class="badge badge--warn">Observation</span>' : "") +
        "</span>" +
      "</span>" +
      UI.icone("chevron", "item__chev") +
    "</button>";
  }

  function puce(libelle, valeur, actif, type) {
    return '<button class="chip" type="button" aria-pressed="' + (actif ? "true" : "false") +
      '" data-filtre="' + type + '" data-valeur="' + U.echapper(valeur) + '">' + U.echapper(libelle) + "</button>";
  }

  function appliquerFiltre(liste) {
    var q = U.normaliser(filtre.texte);
    return liste.filter(function (s) {
      if (filtre.classe && s.classe !== filtre.classe) return false;
      if (filtre.activite && s.activite !== filtre.activite) return false;
      if (!q) return true;
      var champs = U.normaliser([s.date, U.dateAvecJour(s.date), s.classe, s.cycle, s.activite,
                                 s.contenu, s.competences, s.observations].join(" "));
      return champs.indexOf(q) !== -1;
    });
  }

  function uniques(liste) {
    var vus = {};
    liste.forEach(function (v) { if (v && String(v).trim()) vus[String(v).trim()] = 1; });
    return Object.keys(vus).sort(function (a, b) { return U.normaliser(a).localeCompare(U.normaliser(b), "fr"); });
  }

  function brancherListe(conteneur) {
    var champRecherche = conteneur.querySelector("[data-recherche]");
    if (champRecherche) {
      champRecherche.addEventListener("input", U.antiRebond(function () {
        filtre.texte = champRecherche.value;
        rafraichirListe(conteneur);
      }, 180));
    }
    U.sur(conteneur, "click", "[data-filtre]", function (e, el) {
      var type = el.getAttribute("data-filtre");
      var valeur = el.getAttribute("data-valeur");
      if (type === "reset") { filtre.classe = ""; filtre.activite = ""; }
      else if (type === "classe") { filtre.classe = filtre.classe === valeur ? "" : valeur; filtre.activite = ""; }
      else { filtre.activite = filtre.activite === valeur ? "" : valeur; filtre.classe = ""; }
      U.$$("[data-filtre]", conteneur).forEach(function (p) {
        var t = p.getAttribute("data-filtre"), v = p.getAttribute("data-valeur");
        var actif = (t === "reset" && !filtre.classe && !filtre.activite) ||
                    (t === "classe" && filtre.classe === v) ||
                    (t === "activite" && filtre.activite === v);
        p.setAttribute("aria-pressed", actif ? "true" : "false");
      });
      rafraichirListe(conteneur);
    });
    U.sur(conteneur, "click", "[data-seance]", function (e, el) {
      ouvrirDetail(el.getAttribute("data-seance"));
    });
  }

  function rafraichirListe(conteneur) {
    var zone = conteneur.querySelector("#liste-seances");
    if (!zone) return;
    var toutes = Store.seancesTriees();
    zone.innerHTML = listeHTML(appliquerFiltre(toutes), toutes.length);
  }

  /* ================= FICHE DÉTAIL ================= */

  function ouvrirDetail(id) {
    var s = Store.seances.trouver(id);
    if (!s) { UI.toast("Séance introuvable.", "error"); return; }

    UI.feuille({
      titre: U.dateAvecJour(s.date),
      sousTitre: [s.classe, s.cycle, s.activite].filter(Boolean).join(" · "),
      corps:
        '<div class="detail">' +
          blocDetail("Contenu de la séance", s.contenu) +
          blocDetail("Compétences travaillées", s.competences) +
          blocDetail("Observations", s.observations) +
          '<div class="btn-row">' +
            '<button class="btn btn--sm" data-imprimer type="button">' + UI.icone("imprimer") + "Imprimer</button>" +
            (Exports.partageDisponible()
              ? '<button class="btn btn--sm" data-partager type="button">' + UI.icone("export") + "Partager</button>" : "") +
          "</div>" +
          '<button class="btn btn--sm btn--ghost" data-supprimer type="button" style="color:var(--danger)">' +
            UI.icone("poubelle") + "Supprimer cette séance</button>" +
        "</div>",
      actions:
        '<button class="btn" data-fermer type="button">Fermer</button>' +
        '<button class="btn btn--primary" data-modifier type="button">' + UI.icone("crayon") + "Modifier</button>",
      surMontage: function (corps, fermer, pied) {
        pied.querySelector("[data-modifier]").addEventListener("click", function () {
          fermer();
          ouvrirFormulaire(s);
        });
        corps.querySelector("[data-imprimer]").addEventListener("click", function () {
          Exports.imprimerSeances({ id: s.id }, "Séance du " + U.dateLongue(s.date));
        });
        var partage = corps.querySelector("[data-partager]");
        if (partage) partage.addEventListener("click", function () { Exports.partagerSeance(s); });
        corps.querySelector("[data-supprimer]").addEventListener("click", function () {
          UI.confirmer({
            titre: "Supprimer la séance",
            message: "La séance du " + U.dateLongue(s.date) + " avec les " + (s.classe || "élèves") + " sera définitivement effacée.",
            valider: "Supprimer",
            danger: true
          }).then(function (ok) {
            if (!ok) return;
            Store.seances.supprimer(s.id);
            fermer();
            UI.toast("Séance supprimée.");
            App.rafraichir();
          });
        });
      }
    });
  }

  function blocDetail(label, valeur) {
    var vide = !valeur || !String(valeur).trim();
    return '<div class="detail__block">' +
      '<span class="detail__label">' + label + "</span>" +
      '<p class="detail__text' + (vide ? " is-empty" : "") + '">' +
        U.echapper(vide ? "Non renseigné" : String(valeur).trim()) + "</p></div>";
  }

  /* ================= FORMULAIRE ================= */

  function ouvrirFormulaire(seance) {
    var edition = !!seance;
    var s = seance || {
      date: U.aujourdhui(), classe: "", cycle: "", activite: "",
      contenu: "", competences: "", observations: ""
    };
    var classesConnues = Store.listeClasses();
    var activitesConnues = uniques(EPS.listeNomsAPSA().concat(Store.listeActivites()));

    UI.feuille({
      titre: edition ? "Modifier la séance" : "Nouvelle séance",
      sousTitre: edition ? U.dateLongue(s.date) : "Les compétences sont proposées automatiquement",
      corps:
        (Voix.disponible() && !edition
          ? '<button class="btn btn--soft btn--block" data-dictee-globale type="button">' +
              UI.icone("micro") + "Dicter toute la séance</button>"
          : "") +
        UI.listeOptions("liste-classes", classesConnues) +
        UI.listeOptions("liste-activites", activitesConnues) +

        UI.champ({ id: "s-date", label: "Date", type: "date", valeur: s.date }) +
        UI.champ({ id: "s-classe", label: "Classe", valeur: s.classe, placeholder: "6B, 4C, 2nde 5…",
                   liste: "liste-classes", aide: '<span id="s-cycle-info" class="muted">Le cycle est déduit automatiquement.</span>' }) +
        UI.champ({ id: "s-activite", label: "Activité (APSA)", valeur: s.activite,
                   placeholder: "Handball, Badminton, Escalade…", liste: "liste-activites" }) +
        UI.champ({ id: "s-contenu", label: "Contenu de la séance", type: "textarea", lignes: 5,
                   valeur: s.contenu, avecMicro: true,
                   placeholder: "Situation proposée, consignes, organisation…" }) +

        '<div class="field" id="zone-suggestions" hidden>' +
          '<span class="field__label">Compétences proposées</span>' +
          '<div class="chips" id="suggestions"></div>' +
          '<p class="field__hint">Touchez une proposition pour l\'ajouter au compte rendu.</p>' +
        "</div>" +

        UI.champ({ id: "s-competences", label: "Compétences travaillées", type: "textarea", lignes: 4,
                   valeur: s.competences, placeholder: "Renseignées automatiquement ou saisies à la main." }) +
        UI.champ({ id: "s-observations", label: "Observations", type: "textarea", lignes: 3,
                   valeur: s.observations, avecMicro: true,
                   placeholder: "Élèves dispensés, incidents, matériel…" }),

      actions:
        '<button class="btn" data-fermer type="button">Annuler</button>' +
        '<button class="btn btn--primary" data-enregistrer type="button">' +
          UI.icone("check") + "Enregistrer</button>",

      surMontage: function (corps, fermer, pied) {
        var champs = {
          date: corps.querySelector("#s-date"),
          classe: corps.querySelector("#s-classe"),
          activite: corps.querySelector("#s-activite"),
          contenu: corps.querySelector("#s-contenu"),
          competences: corps.querySelector("#s-competences"),
          observations: corps.querySelector("#s-observations")
        };
        var infoCycle = corps.querySelector("#s-cycle-info");
        var zoneSuggestions = corps.querySelector("#zone-suggestions");
        var listeSuggestions = corps.querySelector("#suggestions");
        var retenues = [];

        function cycleActuel() { return EPS.trouverCycle(champs.classe.value); }

        function majCycle() {
          var cycle = cycleActuel();
          infoCycle.innerHTML = cycle
            ? 'Cycle déduit : <b class="badge badge--accent">' + U.echapper(cycle) + "</b>"
            : "Le cycle est déduit automatiquement.";
        }

        function majSuggestions() {
          var propositions = EPS.suggererCompetences(champs.contenu.value, cycleActuel(), champs.activite.value).slice(0, 6);
          if (!propositions.length) { zoneSuggestions.hidden = true; listeSuggestions.innerHTML = ""; return; }
          zoneSuggestions.hidden = false;
          listeSuggestions.innerHTML = propositions.map(function (p) {
            var actif = retenues.indexOf(p.fiche.id) !== -1;
            var etiquette = p.fiche.contenuPrioritaire || p.fiche.competence || p.fiche.apsa;
            return '<button class="chip" type="button" aria-pressed="' + (actif ? "true" : "false") +
              '" data-fiche="' + p.fiche.id + '" title="' + U.echapper(p.motsReconnus.join(", ")) + '">' +
              UI.icone(actif ? "check" : "plus") + U.echapper(U.tronquer(etiquette, 42)) + "</button>";
          }).join("");
        }

        /** Ajoute ou retire le bloc de texte d'une fiche dans le champ compétences. */
        function basculerFiche(id) {
          var fiche = Store.competences.trouver(id);
          if (!fiche) return;
          var bloc = EPS.redigerCompetences([fiche]);
          var actuel = champs.competences.value;
          var index = retenues.indexOf(id);
          if (index === -1) {
            retenues.push(id);
            if (actuel.indexOf(bloc) === -1) {
              champs.competences.value = actuel.trim() ? actuel.trim() + "\n\n———\n\n" + bloc : bloc;
            }
          } else {
            retenues.splice(index, 1);
            champs.competences.value = actuel
              .replace(bloc, "")
              .replace(/\n{3,}/g, "\n\n")
              .replace(/^\s*———\s*/, "")
              .replace(/\s*———\s*$/, "")
              .trim();
          }
          majSuggestions();
        }

        champs.classe.addEventListener("input", function () { majCycle(); });
        champs.classe.addEventListener("change", function () { majCycle(); majSuggestions(); });
        champs.activite.addEventListener("change", majSuggestions);
        champs.contenu.addEventListener("input", U.antiRebond(majSuggestions, 400));
        U.sur(corps, "click", "[data-fiche]", function (e, el) { basculerFiche(el.getAttribute("data-fiche")); });

        UI.brancherMicro(corps, { surTexte: majSuggestions });

        var boutonDictee = corps.querySelector("[data-dictee-globale]");
        if (boutonDictee) {
          boutonDictee.addEventListener("click", function () {
            ouvrirDictee(function (infos) {
              if (infos.date) champs.date.value = infos.date;
              if (infos.classe) champs.classe.value = infos.classe;
              if (infos.activite) champs.activite.value = infos.activite;
              if (infos.contenu) champs.contenu.value = infos.contenu;
              if (infos.observations) champs.observations.value = infos.observations;
              majCycle();
              majSuggestions();
              UI.toast("Séance pré-remplie. Vérifiez avant d'enregistrer.", "info", 4000);
            });
          });
        }

        pied.querySelector("[data-enregistrer]").addEventListener("click", function () {
          var donnees = {
            date: champs.date.value || U.aujourdhui(),
            classe: champs.classe.value.trim(),
            cycle: cycleActuel(),
            activite: champs.activite.value.trim(),
            contenu: champs.contenu.value.trim(),
            competences: champs.competences.value.trim(),
            observations: champs.observations.value.trim()
          };
          if (!donnees.classe && !donnees.contenu) {
            UI.toast("Indiquez au moins une classe ou un contenu.", "error");
            champs.classe.focus();
            return;
          }
          if (edition) Store.seances.modifier(s.id, donnees);
          else Store.seances.ajouter(donnees);
          fermer();
          UI.toast(edition ? "Séance modifiée." : "Séance enregistrée.");
          U.vibrer(18);
          App.rafraichir();
        });

        majCycle();
        majSuggestions();
      }
    });
  }

  /* ================= DICTÉE COMPLÈTE ================= */

  function ouvrirDictee(surAnalyse) {
    var transcription = "";

    UI.feuille({
      titre: "Dicter la séance",
      sousTitre: "Parlez normalement, puis vérifiez",
      taille: "sm",
      corps:
        UI.note("Exemple : « <b>Séance d'aujourd'hui avec les 5C en handball, travail sur la passe et le démarquage, pas d'observation</b> ». " +
                "La date, la classe et l'activité sont reconnues automatiquement.") +
        '<div class="field">' +
          '<span class="field__label">Transcription</span>' +
          '<textarea class="textarea" id="d-texte" rows="5" placeholder="Appuyez sur le micro et parlez…"></textarea>' +
        "</div>" +
        '<button class="btn btn--lg btn--block" id="d-micro" type="button">' + UI.icone("micro") + "Démarrer la dictée</button>",
      actions:
        '<button class="btn" data-fermer type="button">Annuler</button>' +
        '<button class="btn btn--primary" data-analyser type="button">' + UI.icone("etincelle") + "Analyser</button>",
      surMontage: function (corps, fermer, pied) {
        var zone = corps.querySelector("#d-texte");
        var bouton = corps.querySelector("#d-micro");

        bouton.addEventListener("click", function () {
          if (Voix.enCours()) { Voix.arreter(); return; }
          bouton.classList.add("is-recording");
          bouton.innerHTML = UI.icone("stop") + "Arrêter";
          U.vibrer(15);
          Voix.demarrer({
            continu: true,
            surApercu: function (t) { zone.value = t; },
            surTexte: function (t) { transcription = t; zone.value = t; },
            surErreur: function (m) { UI.toast(m, "error", 5000); },
            surFin: function () {
              bouton.classList.remove("is-recording");
              bouton.innerHTML = UI.icone("micro") + "Reprendre la dictée";
            }
          });
        });

        pied.querySelector("[data-analyser]").addEventListener("click", function () {
          Voix.arreter();
          var texte = zone.value.trim();
          if (!texte) { UI.toast("Rien à analyser.", "error"); return; }
          fermer();
          surAnalyse(EPS.analyserSeance(texte));
        });
      },
      surFermeture: function () { Voix.arreter(); }
    });
  }

  global.Vues = global.Vues || {};
  global.Vues.seances = {
    titre: "Cahier de texte",
    sousTitre: "Séances EPS",
    onglet: "Séances",
    icone: "seances",
    rendre: rendre,
    ligne: ligne,
    ouvrirDetail: ouvrirDetail,
    ouvrirFormulaire: ouvrirFormulaire,
    ouvrirDictee: ouvrirDictee
  };
})(window);
