/* =====================================================================
   views/eleves.js — suivi des élèves : oublis, absences, dispenses, dispositifs
   ===================================================================== */
(function (global) {
  "use strict";

  var recherche = "";
  var classeActive = "";

  /* ================= LISTE ================= */

  function rendre(conteneur) {
    var tous = Store.elevesTries();
    var classes = uniquesClasses(tous);
    var visibles = filtrer(tous);
    var seuil = Number(Store.reglages().seuilAlerte) || 3;
    var alertes = Store.alertes();

    conteneur.innerHTML =
      '<div class="page-head">' +
        "<h1>Élèves</h1>" +
        "<p>" + (tous.length
          ? U.pluriel(tous.length, "élève") + " · " + U.pluriel(classes.length, "classe")
          : "Aucun élève enregistré") +
          (alertes.length ? " · " + alertes.length + " en alerte" : "") + "</p>" +
      "</div>" +

      '<div class="stack">' +
        '<div class="btn-row">' +
          '<button class="btn btn--primary" data-ajout-eleve type="button">' + UI.icone("plus") + "Un élève</button>" +
          '<button class="btn" data-ajout-classe type="button">' + UI.icone("eleves") + "Importer</button>" +
        "</div>" +
        (tous.length ? UI.barreRecherche("Rechercher un élève…", recherche) : "") +
        (classes.length > 1 ?
        '<div class="chips chips--scroll">' +
          '<button class="chip" type="button" aria-pressed="' + (!classeActive ? "true" : "false") + '" data-classe="">Toutes</button>' +
          classes.map(function (c) {
            return '<button class="chip" type="button" aria-pressed="' + (classeActive === c ? "true" : "false") +
              '" data-classe="' + U.echapper(c) + '">' + U.echapper(c) + "</button>";
          }).join("") +
        "</div>" : "") +
      "</div>" +

      '<section class="section" id="liste-eleves">' + listeHTML(visibles, tous.length, seuil) + "</section>";

    var champRecherche = conteneur.querySelector("[data-recherche]");
    if (champRecherche) {
      champRecherche.addEventListener("input", U.antiRebond(function () {
        recherche = champRecherche.value;
        rafraichirListe(conteneur);
      }, 180));
    }
    U.sur(conteneur, "click", "[data-classe]", function (e, el) {
      classeActive = el.getAttribute("data-classe");
      U.$$("[data-classe]", conteneur).forEach(function (p) {
        p.setAttribute("aria-pressed", p.getAttribute("data-classe") === classeActive ? "true" : "false");
      });
      rafraichirListe(conteneur);
    });
    U.sur(conteneur, "click", "[data-eleve]", function (e, el) { ouvrirFiche(el.getAttribute("data-eleve")); });
    U.sur(conteneur, "click", "[data-ajout-eleve]", function () { ouvrirFormulaire(null); });
    U.sur(conteneur, "click", "[data-ajout-classe]", function () { ouvrirAjoutClasse(); });
  }

  function listeHTML(visibles, total, seuil) {
    if (!total) {
      return UI.vide({
        icone: "eleves",
        titre: "Aucun élève",
        texte: "Ajoutez une classe entière en collant la liste des noms, un par ligne.",
        action: '<button class="btn btn--primary" data-ajout-classe type="button">' +
                UI.icone("plus") + "Ajouter une classe</button>"
      });
    }
    if (!visibles.length) {
      return UI.vide({ icone: "recherche", titre: "Aucun résultat", texte: "Essayez un autre nom ou changez de classe." });
    }
    return U.grouper(visibles, "classe").map(function (groupe) {
      return '<div class="section__head"><h2>' + U.echapper(groupe[0] || "Sans classe") + "</h2>" +
        '<span class="badge">' + U.pluriel(groupe[1].length, "élève") + "</span></div>" +
        '<div class="list">' + groupe[1].map(function (e) { return ligne(e, seuil); }).join("") + "</div>";
    }).join('<div class="divider"></div>');
  }

  var DISPOSITIFS = ["PAP", "PAI", "PPRE", "PPS", "GEVASCO", "Autre"];

  function ligne(eleve, seuil) {
    var enAlerte = Store.totalCompteurs(eleve, seuil) > 0;
    var disp = Store.dispenseEnCours(eleve);
    var dispositifs = eleve.dispositifs || [];
    return '<button class="item" type="button" data-eleve="' + eleve.id + '">' +
      '<span class="avatar' + (enAlerte ? " avatar--danger" : "") + '">' + U.echapper(U.initiales(eleve.nom)) + "</span>" +
      '<span class="item__main">' +
        '<span class="item__title">' + U.echapper(eleve.nom) + "</span>" +
        '<span class="tally">' +
          cellule("O", eleve.oublis, seuil) +
          cellule("M", eleve.oublisMateriel, seuil) +
          cellule("A", eleve.absences, seuil) +
        "</span>" +
        (disp || dispositifs.length
          ? '<span class="item__meta">' +
              (disp ? '<span class="badge badge--warn">Dispensé · fin ' + U.echapper(U.dateLongue(disp.fin || disp.debut, true)) + "</span>" : "") +
              dispositifs.map(function (d) { return '<span class="badge badge--info">' + U.echapper(d) + "</span>"; }).join("") +
            "</span>"
          : "") +
      "</span>" +
      UI.icone("chevron", "item__chev") +
    "</button>";
  }

  function cellule(lettre, valeur, seuil) {
    valeur = valeur || 0;
    return '<span class="tally__cell' + (valeur >= seuil ? " is-alert" : "") + '">' +
      lettre + " <b>" + valeur + "</b></span>";
  }

  function filtrer(liste) {
    var q = U.normaliser(recherche);
    return liste.filter(function (e) {
      if (classeActive && e.classe !== classeActive) return false;
      if (!q) return true;
      return U.normaliser(e.nom + " " + e.classe).indexOf(q) !== -1;
    });
  }

  function uniquesClasses(liste) {
    var vus = {};
    liste.forEach(function (e) { if (e.classe) vus[e.classe] = 1; });
    return Object.keys(vus).sort(U.comparerClasses);
  }

  function rafraichirListe(conteneur) {
    var zone = conteneur.querySelector("#liste-eleves");
    if (!zone) return;
    var seuil = Number(Store.reglages().seuilAlerte) || 3;
    var tous = Store.elevesTries();
    zone.innerHTML = listeHTML(filtrer(tous), tous.length, seuil);
  }

  /* ================= FICHE ÉLÈVE ================= */

  function ouvrirFiche(id) {
    var eleve = Store.eleves.trouver(id);
    if (!eleve) { UI.toast("Élève introuvable.", "error"); return; }
    var seuil = Number(Store.reglages().seuilAlerte) || 3;

    UI.feuille({
      titre: eleve.nom,
      sousTitre: eleve.classe || "Sans classe",
      corps:
        '<div class="stack">' +
          '<div id="zone-dispositifs"></div>' +
          compteur("oublis", "Oublis de tenue", eleve.oublis || 0, seuil) +
          compteur("oublisMateriel", "Oublis de matériel", eleve.oublisMateriel || 0, seuil) +
          compteur("absences", "Absences", eleve.absences || 0, seuil) +
          '<div id="zone-alerte"></div>' +
          '<details class="card card--pad" id="zone-historique-bloc"><summary style="cursor:pointer;font-weight:600">Historique daté <span class="muted" id="histo-compte"></span></summary>' +
            '<div id="zone-historique" class="stack stack--sm" style="margin-top:10px"></div></details>' +
          '<div class="divider"></div>' +
          '<div class="section__head" style="margin:0"><h2>Dispenses</h2>' +
            '<button class="btn btn--sm" data-ajout-dispense type="button">' + UI.icone("plus") + "Ajouter</button></div>" +
          '<div id="zone-dispenses" class="stack stack--sm"></div>' +
          '<div class="divider"></div>' +
          '<div class="section__head" style="margin:0"><h2>Punitions</h2>' +
            '<button class="btn btn--sm" data-ajout-punition type="button">' + UI.icone("plus") + "Ajouter</button></div>" +
          '<div id="zone-punitions" class="stack stack--sm"></div>' +
          '<div class="divider"></div>' +
          '<div class="btn-row">' +
            '<button class="btn btn--sm" data-modifier type="button">' + UI.icone("crayon") + "Modifier</button>" +
            '<button class="btn btn--sm" data-reset type="button">' + UI.icone("horloge") + "Remettre à zéro</button>" +
          "</div>" +
          '<button class="btn btn--sm btn--ghost" data-supprimer type="button" style="color:var(--danger)">' +
            UI.icone("poubelle") + "Supprimer l'élève</button>" +
        "</div>",
      actions: '<button class="btn btn--primary" data-fermer type="button">Terminé</button>',
      surMontage: function (corps, fermer) {

        function majAffichage() {
          var frais = Store.eleves.trouver(id);
          if (!frais) return;
          ["oublis", "oublisMateriel", "absences"].forEach(function (champ) {
            var cellule = corps.querySelector('[data-valeur="' + champ + '"]');
            if (cellule) cellule.textContent = frais[champ] || 0;
          });
          corps.querySelector("#zone-alerte").innerHTML = Store.totalCompteurs(frais, seuil) > 0
            ? UI.note("<b>Seuil d'alerte atteint</b> (" + seuil + "). Pensez à prévenir la famille ou la vie scolaire.", "warn")
            : "";

          var dispositifs = frais.dispositifs || [];
          corps.querySelector("#zone-dispositifs").innerHTML = dispositifs.length || frais.dispositifsNote
            ? '<div class="card card--pad stack stack--sm">' +
                '<div class="small muted" style="font-weight:600">Dispositifs particuliers</div>' +
                (dispositifs.length ? '<div class="chips">' + dispositifs.map(function (d) {
                  return '<span class="badge badge--info">' + U.echapper(d) + "</span>";
                }).join("") + "</div>" : "") +
                (frais.dispositifsNote ? '<p class="small">' + U.echapper(frais.dispositifsNote) + "</p>" : "") +
              "</div>"
            : "";

          majHistorique();
          majDispenses();
          majPunitions();
        }

        function majHistorique() {
          var frais = Store.eleves.trouver(id);
          var libelles = { oublis: "Oubli de tenue", oublisMateriel: "Oubli de matériel", absences: "Absence" };
          var liste = (frais.historique || []).slice().sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); });
          corps.querySelector("#histo-compte").textContent = liste.length ? "(" + liste.length + ")" : "";
          corps.querySelector("#zone-historique").innerHTML = liste.length
            ? liste.map(function (h) {
                return '<div class="row row--between"><span><b>' + U.echapper(U.dateLongue(h.date, true)) + "</b> · " +
                  U.echapper(libelles[h.type] || h.type) + "</span>" +
                  '<button class="iconbtn" type="button" data-suppr-histo="' + h.id + '" aria-label="Retirer cette ligne">' + UI.icone("fermer") + "</button></div>";
              }).join("")
            : '<p class="small muted">Chaque oubli ou absence ajouté(e) avec le + est daté(e) ici.</p>';
        }

        function majDispenses() {
          var frais = Store.eleves.trouver(id);
          var liste = (frais.dispensesListe || []).slice().sort(function (a, b) {
            return (b.debut || "").localeCompare(a.debut || "");
          });
          corps.querySelector("#zone-dispenses").innerHTML = liste.length
            ? liste.map(ligneDispense).join("")
            : '<p class="small muted">Aucune dispense enregistrée.</p>';
        }

        function majPunitions() {
          var frais = Store.eleves.trouver(id);
          var liste = (frais.punitions || []).slice().sort(function (a, b) {
            return (b.date || "").localeCompare(a.date || "");
          });
          corps.querySelector("#zone-punitions").innerHTML = liste.length
            ? liste.map(function (p) {
                return '<div class="card card--pad row row--between">' +
                  '<div><b>' + U.echapper(U.dateLongue(p.date)) + "</b>" +
                    (p.motif ? '<div class="small muted">' + U.echapper(p.motif) + "</div>" : "") + "</div>" +
                  '<button class="iconbtn" type="button" data-suppr-punition="' + p.id + '" aria-label="Supprimer la punition">' +
                    UI.icone("poubelle") + "</button></div>";
              }).join("")
            : '<p class="small muted">Aucune punition enregistrée.</p>';
        }

        U.sur(corps, "click", "[data-compteur]", function (e, el) {
          var champ = el.getAttribute("data-compteur");
          var delta = Number(el.getAttribute("data-delta"));
          Store.compteur(id, champ, delta);
          U.vibrer(12);
          majAffichage();
          App.rafraichir({ silencieux: true });
        });

        U.sur(corps, "click", "[data-suppr-histo]", function (e, el) {
          var frais = Store.eleves.trouver(id);
          var ligne = (frais.historique || []).filter(function (h) { return h.id === el.getAttribute("data-suppr-histo"); })[0];
          if (!ligne) return;
          var patch = { historique: frais.historique.filter(function (h) { return h.id !== ligne.id; }) };
          patch[ligne.type] = Math.max(0, (Number(frais[ligne.type]) || 0) - 1);
          Store.eleves.modifier(id, patch);
          majAffichage();
          App.rafraichir({ silencieux: true });
        });

        /* Dispenses */
        corps.querySelector("[data-ajout-dispense]").addEventListener("click", function () {
          ouvrirFormulaireDispense(id, null, majAffichage);
        });
        U.sur(corps, "click", "[data-modif-dispense]", function (e, el) {
          ouvrirFormulaireDispense(id, el.getAttribute("data-modif-dispense"), majAffichage);
        });
        U.sur(corps, "click", "[data-photo-dispense]", function (e, el) {
          afficherPhoto(el.getAttribute("data-photo-dispense"));
        });
        U.sur(corps, "click", "[data-vue-dispense]", function (e, el) {
          modifierDispense(id, el.getAttribute("data-vue-dispense"), { vue: true });
          UI.toast("Noté : l'élève reprend l'EPS.");
          majAffichage();
          App.rafraichir({ silencieux: true });
        });
        U.sur(corps, "click", "[data-suppr-dispense]", function (e, el) {
          var idDispense = el.getAttribute("data-suppr-dispense");
          UI.confirmer({
            titre: "Supprimer la dispense",
            message: "La dispense et sa photo seront définitivement effacées.",
            valider: "Supprimer",
            danger: true
          }).then(function (ok) {
            if (!ok) return;
            var frais = Store.eleves.trouver(id);
            var cible = (frais.dispensesListe || []).filter(function (d) { return d.id === idDispense; })[0];
            if (cible && cible.photoId) Photos.supprimer(cible.photoId);
            Store.eleves.modifier(id, { dispensesListe: (frais.dispensesListe || []).filter(function (d) { return d.id !== idDispense; }) });
            majAffichage();
            App.rafraichir({ silencieux: true });
          });
        });

        /* Punitions */
        corps.querySelector("[data-ajout-punition]").addEventListener("click", function () {
          ouvrirFormulairePunition(id, majAffichage);
        });
        U.sur(corps, "click", "[data-suppr-punition]", function (e, el) {
          var idPunition = el.getAttribute("data-suppr-punition");
          var frais = Store.eleves.trouver(id);
          Store.eleves.modifier(id, { punitions: (frais.punitions || []).filter(function (p) { return p.id !== idPunition; }) });
          majAffichage();
        });

        corps.querySelector("[data-modifier]").addEventListener("click", function () {
          fermer();
          ouvrirFormulaire(Store.eleves.trouver(id));
        });

        corps.querySelector("[data-reset]").addEventListener("click", function () {
          UI.confirmer({
            titre: "Remettre les compteurs à zéro",
            message: "Les oublis (tenue et matériel) et les absences de " + eleve.nom + " repartiront de zéro.",
            valider: "Remettre à zéro"
          }).then(function (ok) {
            if (!ok) return;
            Store.eleves.modifier(id, { oublis: 0, oublisMateriel: 0, absences: 0, historique: [] });
            majAffichage();
            UI.toast("Compteurs remis à zéro.");
            App.rafraichir({ silencieux: true });
          });
        });

        corps.querySelector("[data-supprimer]").addEventListener("click", function () {
          UI.confirmer({
            titre: "Supprimer l'élève",
            message: eleve.nom + " et ses compteurs seront définitivement effacés.",
            valider: "Supprimer",
            danger: true
          }).then(function (ok) {
            if (!ok) return;
            ((Store.eleves.trouver(id) || {}).dispensesListe || []).forEach(function (d) {
              if (d.photoId) Photos.supprimer(d.photoId);
            });
            Store.eleves.supprimer(id);
            fermer();
            UI.toast("Élève supprimé.");
            App.rafraichir();
          });
        });

        majAffichage();
      },
      surFermeture: function () { App.rafraichir(); }
    });
  }

  function compteur(champ, libelle, valeur, seuil) {
    return '<div class="card card--pad row row--between">' +
      '<div><div style="font-weight:600">' + libelle + "</div>" +
        '<div class="small muted">Alerte à ' + seuil + "</div></div>" +
      '<div class="counter">' +
        '<button class="counter__btn" type="button" data-compteur="' + champ + '" data-delta="-1" aria-label="Retirer un ' + libelle + '">' +
          UI.icone("moins") + "</button>" +
        '<span class="counter__val" data-valeur="' + champ + '">' + valeur + "</span>" +
        '<button class="counter__btn" type="button" data-compteur="' + champ + '" data-delta="1" aria-label="Ajouter un ' + libelle + '">' +
          UI.icone("plus") + "</button>" +
      "</div></div>";
  }

  /* ================= DISPENSES ================= */

  function modifierDispense(idEleve, idDispense, champs) {
    var e = Store.eleves.trouver(idEleve);
    if (!e) return;
    Store.eleves.modifier(idEleve, {
      dispensesListe: (e.dispensesListe || []).map(function (d) {
        return d.id === idDispense ? Object.assign({}, d, champs) : d;
      })
    });
  }

  function libelleStatut(st) {
    if (st.etat === "avenir") return "À venir";
    if (st.etat === "terminee") return "Terminée";
    if (st.etat === "bientot") {
      return st.jours === 0 ? "Se termine aujourd'hui" : st.jours === 1 ? "Se termine demain" : "Se termine dans " + st.jours + " jours";
    }
    return "En cours · fin dans " + st.jours + " j";
  }

  function ligneDispense(d) {
    var st = Store.statutDispense(d);
    var classe = st.etat === "bientot" || (st.etat === "terminee" && !d.vue) ? "badge--danger"
               : st.etat === "terminee" ? "" : st.etat === "avenir" ? "badge--outline" : "badge--warn";
    var periode = (d.fin && d.fin !== d.debut)
      ? U.dateLongue(d.debut, true) + " → " + U.dateLongue(d.fin)
      : U.dateLongue(d.debut);
    return '<div class="card card--pad stack stack--sm">' +
      '<div class="row row--between">' +
        '<div><b>' + U.echapper(periode) + "</b></div>" +
        '<span class="badge ' + classe + '">' + U.echapper(libelleStatut(st)) + "</span>" +
      "</div>" +
      (d.motif ? '<div class="small muted">' + U.echapper(d.motif) + "</div>" : "") +
      '<div class="btn-row">' +
        (d.photoId ? '<button class="btn btn--sm" type="button" data-photo-dispense="' + d.photoId + '">' + UI.icone("camera") + "Voir la photo</button>" : "") +
        (st.etat === "terminee" && !d.vue
          ? '<button class="btn btn--sm btn--primary" type="button" data-vue-dispense="' + d.id + '">' + UI.icone("check") + "Il reprend</button>" : "") +
        '<button class="btn btn--sm btn--ghost" type="button" data-modif-dispense="' + d.id + '">' + UI.icone("crayon") + "Modifier</button>" +
        '<button class="btn btn--sm btn--ghost" type="button" data-suppr-dispense="' + d.id + '" style="color:var(--danger)">' + UI.icone("poubelle") + "</button>" +
      "</div>" +
    "</div>";
  }

  /** Affiche une photo de justificatif en grand. */
  function afficherPhoto(idPhoto) {
    Photos.lire(idPhoto).then(function (blob) {
      if (!blob) { UI.toast("Photo introuvable.", "error"); return; }
      var url = URL.createObjectURL(blob);
      UI.feuille({
        titre: "Photo de la dispense",
        corps: '<img src="' + url + '" alt="Photo de la dispense" style="width:100%;border-radius:var(--r-sm)">',
        actions: '<button class="btn btn--primary" data-fermer type="button">Fermer</button>',
        surFermeture: function () { URL.revokeObjectURL(url); }
      });
    });
  }

  function ouvrirFormulaireDispense(idEleve, idDispense, surFin) {
    var eleve = Store.eleves.trouver(idEleve);
    var existante = idDispense
      ? (eleve.dispensesListe || []).filter(function (d) { return d.id === idDispense; })[0]
      : null;
    var d = existante || { debut: U.aujourdhui(), fin: "", motif: "", photoId: "" };
    var photoId = d.photoId || "";
    var nouvellePhoto = "";      // photo ajoutée dans cette feuille (à effacer si on annule)
    var enregistre = false;

    UI.feuille({
      titre: existante ? "Modifier la dispense" : "Nouvelle dispense",
      sousTitre: eleve.nom,
      taille: "sm",
      corps:
        '<div class="field__row">' +
          '<div class="grow">' + UI.champ({ id: "d-debut", label: "Début", type: "date", valeur: d.debut }) + "</div>" +
          '<div class="grow">' + UI.champ({ id: "d-fin", label: "Fin", type: "date", valeur: d.fin }) + "</div>" +
        "</div>" +
        UI.champ({ id: "d-motif", label: "Motif (facultatif)", valeur: d.motif, placeholder: "Entorse, certificat médical…" }) +
        '<div class="field"><span class="field__label">Photo de la dispense</span>' +
          '<div id="d-apercu" class="photo-apercu"></div>' +
          '<input type="file" id="d-fichier" accept="image/*" hidden>' +
          '<div class="btn-row">' +
            '<button class="btn btn--sm" data-choisir-photo type="button">' + UI.icone("camera") + "Prendre ou choisir une photo</button>" +
            '<button class="btn btn--sm btn--ghost" data-retirer-photo type="button">Retirer</button>' +
          "</div>" +
        "</div>",
      actions:
        '<button class="btn" data-fermer type="button">Annuler</button>' +
        '<button class="btn btn--primary" data-valider type="button">' + UI.icone("check") + "Enregistrer</button>",
      surMontage: function (corps, fermer, pied) {
        var apercu = corps.querySelector("#d-apercu");
        var urlApercu = "";

        function montrerApercu() {
          if (urlApercu) { URL.revokeObjectURL(urlApercu); urlApercu = ""; }
          if (!photoId) { apercu.innerHTML = '<p class="small muted">Aucune photo.</p>'; return; }
          Photos.lire(photoId).then(function (blob) {
            if (!blob) { apercu.innerHTML = '<p class="small muted">Photo introuvable.</p>'; return; }
            urlApercu = URL.createObjectURL(blob);
            apercu.innerHTML = '<img src="' + urlApercu + '" alt="Aperçu de la photo">';
          });
        }

        corps.querySelector("[data-choisir-photo]").addEventListener("click", function () {
          corps.querySelector("#d-fichier").click();
        });
        corps.querySelector("#d-fichier").addEventListener("change", function (ev) {
          var fichier = ev.target.files && ev.target.files[0];
          if (!fichier) return;
          if (!Photos.disponible()) { UI.toast("Les photos ne sont pas disponibles sur ce navigateur.", "error"); return; }
          Photos.ajouter(fichier).then(function (nouvelId) {
            if (nouvellePhoto) Photos.supprimer(nouvellePhoto);
            nouvellePhoto = nouvelId;
            photoId = nouvelId;
            montrerApercu();
          }).catch(function () { UI.toast("Enregistrement de la photo impossible.", "error"); });
          ev.target.value = "";
        });
        corps.querySelector("[data-retirer-photo]").addEventListener("click", function () {
          if (nouvellePhoto) { Photos.supprimer(nouvellePhoto); nouvellePhoto = ""; }
          photoId = "";
          montrerApercu();
        });

        pied.querySelector("[data-valider]").addEventListener("click", function () {
          var debut = corps.querySelector("#d-debut").value;
          var fin = corps.querySelector("#d-fin").value || debut;
          if (!debut) { UI.toast("La date de début est obligatoire.", "error"); return; }
          if (fin < debut) { UI.toast("La fin ne peut pas précéder le début.", "error"); return; }
          var donnees = {
            debut: debut, fin: fin,
            motif: corps.querySelector("#d-motif").value.trim(),
            photoId: photoId,
            vue: false
          };
          var frais = Store.eleves.trouver(idEleve);
          var liste = (frais.dispensesListe || []).slice();
          if (existante) {
            if (existante.photoId && existante.photoId !== photoId) Photos.supprimer(existante.photoId);
            liste = liste.map(function (x) { return x.id === existante.id ? Object.assign({}, x, donnees) : x; });
          } else {
            liste.push(Object.assign({ id: U.uid() }, donnees));
          }
          Store.eleves.modifier(idEleve, { dispensesListe: liste });
          enregistre = true;
          fermer();
          UI.toast("Dispense enregistrée.");
          if (surFin) surFin();
          App.rafraichir({ silencieux: true });
        });

        montrerApercu();
      },
      surFermeture: function () {
        if (!enregistre && nouvellePhoto) Photos.supprimer(nouvellePhoto);
      }
    });
  }

  /* ================= PUNITIONS ================= */

  function ouvrirFormulairePunition(idEleve, surFin) {
    var eleve = Store.eleves.trouver(idEleve);
    UI.feuille({
      titre: "Nouvelle punition",
      sousTitre: eleve.nom,
      taille: "sm",
      corps:
        UI.champ({ id: "p-date", label: "Date", type: "date", valeur: U.aujourdhui() }) +
        UI.champ({ id: "p-motif", label: "Motif", placeholder: "Bavardages, travail non fait…", autofocus: true }),
      actions:
        '<button class="btn" data-fermer type="button">Annuler</button>' +
        '<button class="btn btn--primary" data-valider type="button">' + UI.icone("check") + "Enregistrer</button>",
      surMontage: function (corps, fermer, pied) {
        pied.querySelector("[data-valider]").addEventListener("click", function () {
          var date = corps.querySelector("#p-date").value || U.aujourdhui();
          var frais = Store.eleves.trouver(idEleve);
          var liste = (frais.punitions || []).concat([{ id: U.uid(), date: date, motif: corps.querySelector("#p-motif").value.trim() }]);
          Store.eleves.modifier(idEleve, { punitions: liste });
          fermer();
          UI.toast("Punition enregistrée.");
          if (surFin) surFin();
        });
      }
    });
  }

  /* ================= FORMULAIRES ================= */

  function ouvrirFormulaire(eleve) {
    var edition = !!eleve;
    var e = eleve || { nom: "", classe: classeActive || "" };

    UI.feuille({
      titre: edition ? "Modifier l'élève" : "Nouvel élève",
      taille: "sm",
      corps:
        UI.listeOptions("liste-classes-eleves", Store.listeClasses()) +
        UI.champ({ id: "e-nom", label: "Nom et prénom", valeur: e.nom, autofocus: true,
                   placeholder: "Dupont Léa" }) +
        UI.champ({ id: "e-classe", label: "Classe", valeur: e.classe, liste: "liste-classes-eleves",
                   placeholder: "5C" }) +
        '<div class="field"><span class="field__label">Dispositifs particuliers</span>' +
          '<div class="chips" id="e-dispositifs">' +
            DISPOSITIFS.map(function (d) {
              return '<button class="chip" type="button" data-dispositif="' + d + '" aria-pressed="' +
                ((e.dispositifs || []).indexOf(d) !== -1 ? "true" : "false") + '">' + d + "</button>";
            }).join("") +
          "</div></div>" +
        UI.champ({ id: "e-dispositifs-note", label: "Précisions (facultatif)", valeur: e.dispositifsNote || "",
                   placeholder: "Tiers-temps, aménagements, autre dispositif…" }),
      actions:
        '<button class="btn" data-fermer type="button">Annuler</button>' +
        '<button class="btn btn--primary" data-valider type="button">' + UI.icone("check") + "Enregistrer</button>",
      surMontage: function (corps, fermer, pied) {
        var nom = corps.querySelector("#e-nom");
        var classe = corps.querySelector("#e-classe");

        U.sur(corps, "click", "[data-dispositif]", function (ev, el) {
          el.setAttribute("aria-pressed", el.getAttribute("aria-pressed") === "true" ? "false" : "true");
        });

        function valider() {
          if (!nom.value.trim()) { UI.toast("Le nom est obligatoire.", "error"); nom.focus(); return; }
          var donnees = {
            nom: nom.value.trim(),
            classe: classe.value.trim(),
            dispositifs: U.$$('[data-dispositif][aria-pressed="true"]', corps).map(function (b) {
              return b.getAttribute("data-dispositif");
            }),
            dispositifsNote: corps.querySelector("#e-dispositifs-note").value.trim()
          };
          if (edition) {
            Store.eleves.modifier(e.id, donnees);
          } else {
            Store.eleves.ajouter(Object.assign({ oublis: 0, absences: 0, dispenses: 0 }, donnees));
          }
          fermer();
          UI.toast(edition ? "Élève modifié." : "Élève ajouté.");
          App.rafraichir();
        }

        pied.querySelector("[data-valider]").addEventListener("click", valider);
        classe.addEventListener("keydown", function (ev) { if (ev.key === "Enter") valider(); });
      }
    });
  }

  /** Ajout d'une classe entière : un nom par ligne. */
  /** Une classe ressemble à « 3B », « 5C », « 2nde4 », « 1ère G2 », « Tle A »… */
  function ressembleAClasse(t) {
    return /^(\d{1,2}\s?[a-zA-Z0-9]{0,3}|[3-6]e\s?\d?|2nde\s?\d*|1[eè]re\s?[a-zA-Z0-9]*|tle\s?[a-zA-Z0-9]*|terminale\s?[a-zA-Z0-9]*)$/i.test(String(t).trim());
  }

  /**
   * Lit une ligne collée depuis un tableur ou Pronote.
   * « Dupont Léa » | « Dupont;Léa » | « Dupont<tab>Léa<tab>3B » | « Dupont;Léa;3B ».
   */
  function lireLigne(ligne, classeParDefaut) {
    var morceaux = ligne.split(/[\t;]/).map(function (m) { return m.trim(); }).filter(Boolean);
    if (!morceaux.length) return null;
    var nom, classe = classeParDefaut;
    if (morceaux.length === 1) nom = morceaux[0];
    else if (morceaux.length === 2) {
      if (ressembleAClasse(morceaux[1])) { nom = morceaux[0]; classe = morceaux[1]; }
      else nom = morceaux[0] + " " + morceaux[1];
    } else { nom = morceaux[0] + " " + morceaux[1]; classe = morceaux[2]; }
    nom = nom.replace(/^\s*[-•*\d.)]+\s+/, "").trim();
    return nom ? { nom: nom, classe: classe } : null;
  }

  function ouvrirAjoutClasse() {
    UI.feuille({
      titre: "Importer des élèves",
      sousTitre: "Une classe, ou un tableau complet",
      corps:
        UI.listeOptions("liste-classes-lot", Store.listeClasses()) +
        UI.champ({ id: "c-classe", label: "Classe (si elle n'est pas dans la liste)", liste: "liste-classes-lot",
                   placeholder: "5C", autofocus: true, valeur: classeActive }) +
        UI.champ({ id: "c-noms", label: "Élèves", type: "textarea", lignes: 8,
                   placeholder: "Dupont Léa\nMartin Hugo\nBernard Inès",
                   aide: "Collez depuis Pronote ou un tableur : « Nom », « Nom Prénom » ou des colonnes Nom / Prénom / Classe. " +
                         "Avec une colonne classe, plusieurs classes s'importent d'un coup." }),
      actions:
        '<button class="btn" data-fermer type="button">Annuler</button>' +
        '<button class="btn btn--primary" data-valider type="button">' + UI.icone("check") + "Importer</button>",
      surMontage: function (corps, fermer, pied) {
        pied.querySelector("[data-valider]").addEventListener("click", function () {
          var classeDefaut = corps.querySelector("#c-classe").value.trim();
          var lignes = corps.querySelector("#c-noms").value
            .split(/\r?\n/)
            .map(function (l) { return lireLigne(l, classeDefaut); })
            .filter(Boolean);

          if (!lignes.length) { UI.toast("Aucun nom saisi.", "error"); return; }

          var existants = {};
          Store.eleves.tous().forEach(function (el) {
            existants[U.normaliser(el.nom) + "|" + U.normaliser(el.classe)] = 1;
          });

          var ajoutes = 0, ignores = 0, sansClasse = 0;
          lignes.forEach(function (l) {
            var cle = U.normaliser(l.nom) + "|" + U.normaliser(l.classe);
            if (existants[cle]) { ignores++; return; }
            existants[cle] = 1;
            if (!l.classe) sansClasse++;
            Store.eleves.ajouter({ nom: l.nom, classe: l.classe, oublis: 0, absences: 0, dispenses: 0 });
            ajoutes++;
          });

          fermer();
          UI.toast(U.pluriel(ajoutes, "élève") + " ajouté" + (ajoutes > 1 ? "s" : "") +
                   (ignores ? " · " + ignores + " en double ignoré" + (ignores > 1 ? "s" : "") : "") +
                   (sansClasse ? " · " + sansClasse + " sans classe" : ""));
          App.rafraichir();
        });
      }
    });
  }

  global.Vues = global.Vues || {};
  global.Vues.eleves = {
    titre: "Élèves",
    sousTitre: "Suivi et alertes",
    onglet: "Élèves",
    icone: "eleves",
    rendre: rendre,
    ouvrirFiche: ouvrirFiche,
    ouvrirFormulaire: ouvrirFormulaire,
    afficherPhoto: afficherPhoto,
    DISPOSITIFS: DISPOSITIFS
  };
})(window);
