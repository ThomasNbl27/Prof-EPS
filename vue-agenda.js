/* =====================================================================
   views/agenda.js — réunions, conseils, formations, rendez-vous
   Rappels : la veille et 3 h avant. Chaque événement peut être ajouté
   au calendrier du téléphone (les deux alarmes sont dans le fichier).
   ===================================================================== */
(function (global) {
  "use strict";

  var CATEGORIES = {
    reunion:   { libelle: "Réunion",            teinte: "accent" },
    conseil:   { libelle: "Conseil de classe",  teinte: "info" },
    parents:   { libelle: "Rendez-vous parents", teinte: "warn" },
    formation: { libelle: "Formation",          teinte: "danger" },
    autre:     { libelle: "Autre",              teinte: "neutre" }
  };

  var MOIS_LONGS = ["janvier","février","mars","avril","mai","juin",
                    "juillet","août","septembre","octobre","novembre","décembre"];

  var etat = {
    mois: null,          // Date du premier jour du mois affiché
    jourChoisi: ""       // "" = liste des prochains événements
  };

  /* ================= VUE ================= */

  function rendre(conteneur) {
    if (!etat.mois) {
      var m = new Date();
      etat.mois = new Date(m.getFullYear(), m.getMonth(), 1);
    }

    conteneur.innerHTML =
      '<div class="page-head">' +
        "<h1>Agenda</h1>" +
        "<p>Réunions, conseils et rendez-vous · rappels la veille et 3 h avant</p>" +
      "</div>" +

      '<div class="stack">' +
        '<button class="btn btn--primary btn--block" data-nouvel-evenement type="button">' +
          UI.icone("plus") + "Nouvel événement</button>" +
        carteNotifications() +
      "</div>" +

      '<section class="section">' +
        '<div class="card" id="zone-calendrier"></div>' +
      "</section>" +

      '<section class="section" id="zone-liste"></section>' +

      '<section class="section">' +
        '<div class="section__head"><h2>Calendrier du téléphone</h2></div>' +
        '<div class="card card--pad stack">' +
          '<p class="small muted">Pour des notifications même application fermée, ajoutez vos ' +
            "événements au calendrier de l'iPad ou du téléphone : les deux rappels " +
            "(la veille et 3 h avant) sont inclus dans le fichier.</p>" +
          '<div class="btn-row">' +
            '<button class="btn btn--sm" data-exporter-tout type="button">' +
              UI.icone("export") + "Tout exporter (.ics)</button>" +
            '<button class="btn btn--sm" data-importer type="button">' +
              UI.icone("import") + "Importer (.ics)</button>" +
          "</div>" +
          '<input type="file" id="fichier-ics" accept=".ics,text/calendar" hidden>' +
        "</div>" +
      "</section>";

    dessinerCalendrier(conteneur);
    dessinerListe(conteneur);
    brancher(conteneur);
  }

  /* ---------- Carte notifications ---------- */

  function carteNotifications() {
    if (!Rappels.notificationsDisponibles()) {
      return UI.note("Sur iPhone et iPad, le navigateur n'affiche pas de notifications pour " +
        "une application web sans serveur. Les rappels s'affichent <b>dans l'application</b> " +
        "quand elle est ouverte ; pour être prévenu application fermée, utilisez " +
        "<b>« Ajouter au calendrier »</b> sur l'événement : l'iPad notifiera la veille et 3 h avant.");
    }
    var p = Rappels.permission();
    if (p === "granted") {
      return UI.note("<b>Notifications activées.</b> Les rappels s'affichent quand l'application " +
        "ou le navigateur est ouvert. Pour une garantie application fermée, ajoutez aussi " +
        "l'événement au calendrier du téléphone.");
    }
    if (p === "denied") {
      return UI.note("Notifications refusées dans le navigateur. Vous pouvez les réautoriser " +
        "dans ses réglages ; en attendant, les rappels s'affichent dans l'application.", "warn");
    }
    return '<div class="card card--pad row row--between">' +
      '<div class="grow"><div style="font-weight:600">Notifications</div>' +
        '<div class="small muted">Être prévenu la veille et 3 h avant</div></div>' +
      '<button class="btn btn--sm btn--primary" data-activer-notifications type="button">Activer</button>' +
    "</div>";
  }

  /* ---------- Calendrier mensuel ---------- */

  function dessinerCalendrier(conteneur) {
    var zone = conteneur.querySelector("#zone-calendrier");
    var annee = etat.mois.getFullYear();
    var mois = etat.mois.getMonth();
    var aujourdhui = U.aujourdhui();

    // Événements du mois, indexés par jour.
    var parJour = {};
    Store.evenements.tous().forEach(function (evt) {
      if (!evt.date) return;
      (parJour[evt.date] = parJour[evt.date] || []).push(evt);
    });

    // Premier lundi affiché.
    var premier = new Date(annee, mois, 1);
    var depart = new Date(premier);
    depart.setDate(1 - ((premier.getDay() + 6) % 7));

    var cellules = "";
    var curseur = new Date(depart);
    for (var i = 0; i < 42; i++) {
      var iso = U.versISO(curseur);
      var dedans = curseur.getMonth() === mois;
      var evts = parJour[iso] || [];
      var points = evts.slice(0, 3).map(function (e) {
        var cat = CATEGORIES[e.categorie] || CATEGORIES.autre;
        return '<i class="cal__pt cal__pt--' + cat.teinte + '"></i>';
      }).join("");

      cellules +=
        '<button type="button" class="cal__jour' +
          (dedans ? "" : " is-dehors") +
          (iso === aujourdhui ? " is-aujourdhui" : "") +
          (iso === etat.jourChoisi ? " is-choisi" : "") +
        '" data-jour="' + iso + '" aria-label="' + U.echapper(U.dateAvecJour(iso)) + '">' +
          "<span>" + curseur.getDate() + "</span>" +
          '<span class="cal__pts">' + points + (evts.length > 3 ? "+" : "") + "</span>" +
        "</button>";
      curseur.setDate(curseur.getDate() + 1);
      // On s'arrête à la fin de la semaine qui contient le dernier jour du mois.
      if (i >= 27 && (i + 1) % 7 === 0 && curseur.getMonth() !== mois) break;
    }

    zone.innerHTML =
      '<div class="cal__nav">' +
        '<button class="iconbtn" data-mois="-1" type="button" aria-label="Mois précédent">' +
          UI.icone("retour") + "</button>" +
        '<button class="cal__titre" data-aujourdhui type="button" title="Revenir à aujourd\'hui">' +
          U.majuscule(MOIS_LONGS[mois]) + " " + annee + "</button>" +
        '<button class="iconbtn" data-mois="1" type="button" aria-label="Mois suivant">' +
          UI.icone("chevron") + "</button>" +
      "</div>" +
      '<div class="cal__grille">' +
        ["L", "M", "M", "J", "V", "S", "D"].map(function (j) {
          return '<span class="cal__ent">' + j + "</span>";
        }).join("") +
        cellules +
      "</div>";
  }

  /* ---------- Liste ---------- */

  function dessinerListe(conteneur) {
    var zone = conteneur.querySelector("#zone-liste");
    var tries = Store.evenementsTries();

    if (etat.jourChoisi) {
      var duJour = tries.filter(function (e) { return e.date === etat.jourChoisi; });
      zone.innerHTML =
        '<div class="section__head"><h2>' + U.echapper(U.majuscule(U.dateAvecJour(etat.jourChoisi))) + "</h2>" +
          '<button class="link" data-tout-voir type="button">Tout voir</button></div>' +
        (duJour.length
          ? '<div class="list">' + duJour.map(ligne).join("") + "</div>"
          : UI.vide({ icone: "seances", titre: "Rien ce jour-là",
              texte: "Touchez « Nouvel événement » pour en ajouter un.",
              action: '<button class="btn btn--primary" data-nouvel-evenement type="button">' +
                      UI.icone("plus") + "Ajouter ici</button>" }));
      return;
    }

    var jour = U.aujourdhui();
    var futurs = tries.filter(function (e) { return (e.date || "") >= jour; });
    var passes = tries.length - futurs.length;

    if (!tries.length) {
      zone.innerHTML = UI.vide({
        icone: "seances",
        titre: "Aucun événement",
        texte: "Réunions, conseils de classe, formations : ajoutez-les ici pour être prévenu la veille et 3 h avant."
      });
      return;
    }

    zone.innerHTML =
      '<div class="section__head"><h2>À venir</h2>' +
        '<span class="badge">' + U.pluriel(futurs.length, "événement") + "</span></div>" +
      (futurs.length
        ? U.grouper(futurs.slice(0, 30), "date").map(function (groupe) {
            return '<p class="small muted" style="margin:10px 2px 6px">' +
              U.echapper(U.majuscule(U.dateRelative(groupe[0])) + " — " + U.dateAvecJour(groupe[0])) + "</p>" +
              '<div class="list">' + groupe[1].map(ligne).join("") + "</div>";
          }).join("")
        : UI.vide({ icone: "check", titre: "Rien à venir", texte: "Le calendrier est à jour." })) +
      (passes ? '<p class="small muted" style="margin-top:14px;text-align:center">' +
        U.pluriel(passes, "événement passé", "événements passés") +
        " — visibles en touchant leur jour dans le calendrier.</p>" : "");
  }

  function ligne(evt) {
    var cat = CATEGORIES[evt.categorie] || CATEGORIES.autre;
    return '<button class="item" type="button" data-evenement="' + evt.id + '">' +
      '<span class="avatar cal__cat cal__cat--' + cat.teinte + '">' +
        (evt.heure ? Rappels.heureLisible(evt.heure) : "Journée") + "</span>" +
      '<span class="item__main">' +
        '<span class="item__title">' + U.echapper(evt.titre) + "</span>" +
        '<span class="item__meta">' +
          '<span class="badge badge--' + (cat.teinte === "neutre" ? "outline" : cat.teinte) + '">' +
            cat.libelle + "</span>" +
          (evt.lieu ? '<span class="badge badge--outline">' + U.echapper(evt.lieu) + "</span>" : "") +
        "</span>" +
      "</span>" +
      UI.icone("chevron", "item__chev") +
    "</button>";
  }

  /* ---------- Interactions ---------- */

  function brancher(conteneur) {
    U.sur(conteneur, "click", "[data-mois]", function (e, el) {
      etat.mois = new Date(etat.mois.getFullYear(),
                           etat.mois.getMonth() + Number(el.getAttribute("data-mois")), 1);
      dessinerCalendrier(conteneur);
    });
    U.sur(conteneur, "click", "[data-aujourdhui]", function () {
      var m = new Date();
      etat.mois = new Date(m.getFullYear(), m.getMonth(), 1);
      etat.jourChoisi = "";
      dessinerCalendrier(conteneur);
      dessinerListe(conteneur);
    });
    U.sur(conteneur, "click", "[data-jour]", function (e, el) {
      var iso = el.getAttribute("data-jour");
      etat.jourChoisi = etat.jourChoisi === iso ? "" : iso;
      dessinerCalendrier(conteneur);
      dessinerListe(conteneur);
    });
    U.sur(conteneur, "click", "[data-tout-voir]", function () {
      etat.jourChoisi = "";
      dessinerCalendrier(conteneur);
      dessinerListe(conteneur);
    });
    U.sur(conteneur, "click", "[data-nouvel-evenement]", function () { ouvrirFormulaire(null); });
    U.sur(conteneur, "click", "[data-evenement]", function (e, el) {
      ouvrirDetail(el.getAttribute("data-evenement"));
    });

    U.sur(conteneur, "click", "[data-activer-notifications]", function () {
      Rappels.demanderPermission().then(function (p) {
        UI.toast(p === "granted" ? "Notifications activées." : "Notifications refusées.",
                 p === "granted" ? "success" : "error");
        App.rendre();
      });
    });

    U.sur(conteneur, "click", "[data-exporter-tout]", function () {
      var evts = Store.evenementsTries();
      if (!evts.length) { UI.toast("Aucun événement à exporter.", "error"); return; }
      U.telecharger("agenda-prof-eps-" + U.aujourdhui() + ".ics",
                    ICS.exporter(evts, "Prof EPS+"), "text/calendar;charset=utf-8");
      UI.toast("Calendrier exporté (" + U.pluriel(evts.length, "événement") + ").");
    });

    U.sur(conteneur, "click", "[data-importer]", function () {
      conteneur.querySelector("#fichier-ics").click();
    });
    conteneur.querySelector("#fichier-ics").addEventListener("change", function (e) {
      var fichier = e.target.files && e.target.files[0];
      if (!fichier) return;
      var lecteur = new FileReader();
      lecteur.onload = function () { importer(String(lecteur.result)); e.target.value = ""; };
      lecteur.onerror = function () { UI.toast("Lecture du fichier impossible.", "error"); };
      lecteur.readAsText(fichier);
    });
  }

  function importer(texte) {
    var lus;
    try { lus = ICS.analyser(texte); }
    catch (e) { UI.toast("Fichier calendrier illisible.", "error"); return; }
    if (!lus.length) { UI.toast("Aucun événement trouvé dans ce fichier.", "error"); return; }

    var connus = {};
    Store.evenements.tous().forEach(function (e) {
      if (e.uid) connus[e.uid] = 1;
      connus[U.normaliser(e.titre) + "|" + e.date + "|" + (e.heure || "")] = 1;
    });

    var ajoutes = 0, ignores = 0, recurrents = 0;
    lus.forEach(function (evt) {
      var cle = evt.uid && connus[evt.uid]
        ? evt.uid
        : (connus[U.normaliser(evt.titre) + "|" + evt.date + "|" + (evt.heure || "")]
          ? "doublon" : "");
      if (cle) { ignores++; return; }
      if (evt.recurrent) recurrents++;
      Store.evenements.ajouter({
        titre: evt.titre, date: evt.date, heure: evt.heure, duree: evt.duree || 60,
        lieu: evt.lieu, notes: evt.notes, uid: evt.uid,
        categorie: "autre", rappelVeille: true, rappel3h: true, envoye: {}
      });
      ajoutes++;
    });

    UI.toast(U.pluriel(ajoutes, "événement importé", "événements importés") +
      (ignores ? " · " + ignores + " déjà présent" + (ignores > 1 ? "s" : "") : ""));
    if (recurrents) {
      UI.toast("Les événements répétitifs ne sont repris qu'une fois (première date).", "info", 5000);
    }
    App.rafraichir();
    Rappels.passage();
  }

  /* ================= FICHE ================= */

  function ouvrirDetail(id) {
    var evt = Store.evenements.trouver(id);
    if (!evt) { UI.toast("Événement introuvable.", "error"); return; }
    var cat = CATEGORIES[evt.categorie] || CATEGORIES.autre;
    var passe = (evt.date || "") < U.aujourdhui();

    UI.feuille({
      titre: evt.titre,
      sousTitre: U.majuscule(U.dateAvecJour(evt.date)) +
                 (evt.heure ? " · " + Rappels.heureLisible(evt.heure) : "") ,
      corps:
        '<div class="detail">' +
          '<div class="chips">' +
            '<span class="chip is-on">' + cat.libelle + "</span>" +
            (evt.heure && evt.duree ? '<span class="chip">' + evt.duree + " min</span>" : "") +
            (passe ? '<span class="chip">Passé</span>' : "") +
          "</div>" +
          bloc("Lieu", evt.lieu) +
          bloc("Notes", evt.notes) +
          '<div class="detail__block"><span class="detail__label">Rappels</span>' +
            '<p class="detail__text">' +
              (evt.rappelVeille !== false ? "✓ La veille" : "✗ La veille (désactivé)") + "<br>" +
              (evt.rappel3h !== false && evt.heure ? "✓ 3 heures avant" : "✗ 3 heures avant") +
            "</p></div>" +
          (!passe
            ? '<button class="btn btn--block" data-calendrier type="button">' +
                UI.icone("export") + "Ajouter au calendrier du téléphone</button>"
            : "") +
          '<button class="btn btn--sm btn--ghost" data-supprimer type="button" style="color:var(--danger)">' +
            UI.icone("poubelle") + "Supprimer l'événement</button>" +
        "</div>",
      actions:
        '<button class="btn" data-fermer type="button">Fermer</button>' +
        '<button class="btn btn--primary" data-modifier type="button">' + UI.icone("crayon") + "Modifier</button>",
      surMontage: function (corps, fermer, pied) {
        pied.querySelector("[data-modifier]").addEventListener("click", function () {
          fermer();
          ouvrirFormulaire(evt);
        });
        var boutonCal = corps.querySelector("[data-calendrier]");
        if (boutonCal) boutonCal.addEventListener("click", function () {
          var ics = ICS.exporter([evt], "Prof EPS+");
          var nom = "evenement-" + evt.date + ".ics";
          if (navigator.canShare) {
            try {
              var fichier = new File([ics], nom, { type: "text/calendar" });
              if (navigator.canShare({ files: [fichier] })) {
                navigator.share({ files: [fichier], title: evt.titre })
                  .catch(function () {});
                return;
              }
            } catch (e) { /* repli téléchargement */ }
          }
          U.telecharger(nom, ics, "text/calendar;charset=utf-8");
          UI.toast("Fichier créé : ouvrez-le pour l'ajouter au calendrier.", "info", 5000);
        });
        corps.querySelector("[data-supprimer]").addEventListener("click", function () {
          UI.confirmer({
            titre: "Supprimer l'événement",
            message: "« " + evt.titre + " » (" + U.dateLongue(evt.date) + ") sera effacé.",
            valider: "Supprimer",
            danger: true
          }).then(function (ok) {
            if (!ok) return;
            Store.evenements.supprimer(evt.id);
            fermer();
            UI.toast("Événement supprimé.");
            App.rafraichir();
          });
        });
      }
    });
  }

  function bloc(label, valeur) {
    if (!valeur || !String(valeur).trim()) return "";
    return '<div class="detail__block"><span class="detail__label">' + label + "</span>" +
      '<p class="detail__text">' + U.echapper(String(valeur).trim()) + "</p></div>";
  }

  /* ================= FORMULAIRE ================= */

  function ouvrirFormulaire(evenement) {
    var edition = !!evenement;
    var evt = evenement || {
      titre: "", date: etat.jourChoisi || U.aujourdhui(), heure: "17:00", duree: 60,
      lieu: "", notes: "", categorie: "reunion", rappelVeille: true, rappel3h: true
    };

    UI.feuille({
      titre: edition ? "Modifier l'événement" : "Nouvel événement",
      sousTitre: "Rappels : la veille et 3 h avant",
      corps:
        UI.champ({ id: "e-titre", label: "Titre", valeur: evt.titre, autofocus: !edition,
                   placeholder: "Réunion parents-professeurs" }) +
        UI.champ({ id: "e-categorie", label: "Type", type: "select", valeur: evt.categorie,
                   options: Object.keys(CATEGORIES).map(function (c) {
                     return { valeur: c, libelle: CATEGORIES[c].libelle };
                   }) }) +
        '<div class="field__row">' +
          '<div class="grow">' + UI.champ({ id: "e-date", label: "Date", type: "date", valeur: evt.date }) + "</div>" +
          '<div class="grow">' + UI.champ({ id: "e-heure", label: "Heure", type: "time", valeur: evt.heure,
                                            aide: "Vide = journée entière" }) + "</div>" +
        "</div>" +
        UI.champ({ id: "e-duree", label: "Durée", type: "select", valeur: String(evt.duree || 60),
                   options: [
                     { valeur: "30", libelle: "30 minutes" }, { valeur: "45", libelle: "45 minutes" },
                     { valeur: "60", libelle: "1 heure" }, { valeur: "90", libelle: "1 h 30" },
                     { valeur: "120", libelle: "2 heures" }, { valeur: "180", libelle: "3 heures" }
                   ] }) +
        UI.champ({ id: "e-lieu", label: "Lieu", valeur: evt.lieu, placeholder: "Salle B12" }) +
        UI.champ({ id: "e-notes", label: "Notes", type: "textarea", lignes: 3, valeur: evt.notes,
                   placeholder: "Ordre du jour, documents à apporter…" }) +
        '<div class="card card--pad stack stack--sm">' +
          interrupteur("e-rappel-veille", "Rappel la veille", evt.rappelVeille !== false) +
          interrupteur("e-rappel-3h", "Rappel 3 heures avant", evt.rappel3h !== false) +
        "</div>",
      actions:
        '<button class="btn" data-fermer type="button">Annuler</button>' +
        '<button class="btn btn--primary" data-valider type="button">' +
          UI.icone("check") + "Enregistrer</button>",
      surMontage: function (corps, fermer, pied) {
        pied.querySelector("[data-valider]").addEventListener("click", function () {
          var titre = corps.querySelector("#e-titre").value.trim();
          if (!titre) { UI.toast("Le titre est obligatoire.", "error"); corps.querySelector("#e-titre").focus(); return; }
          var date = corps.querySelector("#e-date").value;
          if (!date) { UI.toast("La date est obligatoire.", "error"); return; }

          var donnees = {
            titre: titre,
            date: date,
            heure: corps.querySelector("#e-heure").value,
            duree: Number(corps.querySelector("#e-duree").value) || 60,
            categorie: corps.querySelector("#e-categorie").value,
            lieu: corps.querySelector("#e-lieu").value.trim(),
            notes: corps.querySelector("#e-notes").value.trim(),
            rappelVeille: corps.querySelector("#e-rappel-veille").checked,
            rappel3h: corps.querySelector("#e-rappel-3h").checked
          };
          // Date ou heure changée : les rappels repartent de zéro.
          if (!edition || donnees.date !== evt.date || donnees.heure !== evt.heure) {
            donnees.envoye = {};
          }
          if (edition) Store.evenements.modifier(evt.id, donnees);
          else Store.evenements.ajouter(Object.assign({ envoye: {} }, donnees));
          fermer();
          UI.toast(edition ? "Événement modifié." : "Événement ajouté.");
          U.vibrer(18);
          App.rafraichir();
          Rappels.passage();
        });
      }
    });
  }

  function interrupteur(id, libelle, actif) {
    return '<label class="switch">' +
      '<input type="checkbox" id="' + id + '"' + (actif ? " checked" : "") + ">" +
      '<span class="switch__track"></span>' +
      "<span>" + libelle + "</span></label>";
  }

  global.Vues = global.Vues || {};
  global.Vues.agenda = {
    titre: "Agenda",
    sousTitre: "Réunions et rendez-vous",
    onglet: "Agenda",
    icone: "horloge",
    rendre: rendre,
    ouvrirFormulaire: ouvrirFormulaire,
    ouvrirDetail: ouvrirDetail
  };
})(window);
