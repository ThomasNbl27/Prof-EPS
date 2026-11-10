/* =====================================================================
   views/reglages.js — exports, sauvegarde, préférences, aide
   ===================================================================== */
(function (global) {
  "use strict";

  function rendre(conteneur) {
    var r = Store.reglages();
    var classes = Store.listeClasses();

    conteneur.innerHTML =
      '<div class="page-head">' +
        "<h1>Réglages</h1>" +
        "<p>Exports, sauvegarde et préférences</p>" +
      "</div>" +

      /* ---- Exports ---- */
      '<section class="section">' +
        '<div class="section__head"><h2>Exporter le cahier de texte</h2></div>' +
        '<div class="stack">' +
          (classes.length > 1 ?
            UI.champ({ id: "x-classe", label: "Limiter à une classe", type: "select", valeur: "",
                       options: [{ valeur: "", libelle: "Toutes les classes" }].concat(classes) }) : "") +
          '<div class="list">' +
            action("document", "Export PDF", "Onglet dédié : période, classe, options", "aller-pdf") +
            action("document", "Document Word", "Fichier .doc modifiable dans Word, Pages ou Google Docs", "word-seances") +
            action("tableur", "Tableur (CSV)", "S'ouvre dans Excel, Numbers ou LibreOffice", "csv-seances") +
          "</div>" +
        "</div>" +
      "</section>" +

      '<section class="section">' +
        '<div class="section__head"><h2>Exporter le suivi des élèves</h2></div>' +
        '<div class="list">' +
          action("document", "PDF du suivi", "Tableau récapitulatif par classe", "pdf-eleves") +
          action("document", "Document Word", "Tableau des oublis, absences et dispenses", "word-eleves") +
          action("tableur", "Tableur (CSV)", "Pour vos propres calculs", "csv-eleves") +
        "</div>" +
      "</section>" +

      /* ---- Sauvegarde ---- */
      '<section class="section">' +
        '<div class="section__head"><h2>Sauvegarde</h2></div>' +
        '<div class="stack">' +
          UI.note("Les données sont enregistrées <b>dans ce navigateur uniquement</b>. " +
                  "Téléchargez une sauvegarde régulièrement : elle sert à restaurer ou à changer de téléphone.", "warn") +
          '<div class="list">' +
            action("export", "Sauvegarder (Fichiers, iCloud…)", "Sur téléphone, choisissez « Enregistrer dans Fichiers »", "sauvegarder") +
            action("import", "Restaurer une sauvegarde", "Depuis un fichier .json", "restaurer") +
          "</div>" +
          '<input type="file" id="fichier-restauration" accept="application/json,.json" hidden>' +
          '<p class="small' + (Exports.rappelSauvegardeUtile() ? " " : " muted") + '">' +
            (Exports.joursDepuisSauvegarde() === null
              ? "Aucune sauvegarde téléchargée pour l'instant."
              : "Dernière sauvegarde : " + U.dateRelative(r.derniereSauvegarde) + ".") + "</p>" +
          UI.champ({ id: "p-rappel-sauvegarde", label: "Rappel de sauvegarde", type: "select", valeur: String(r.rappelSauvegardeJours || 7),
                     options: [{ valeur: "7", libelle: "Chaque semaine" }, { valeur: "14", libelle: "Toutes les 2 semaines" }, { valeur: "30", libelle: "Chaque mois" }],
                     aide: "Un message apparaît sur l'accueil, avec un bouton pour sauvegarder en un geste." }) +
          '<p class="small muted">Espace utilisé : ' + Store.poids() + " · " +
            Store.seances.compter() + " séances · " + Store.eleves.compter() + " élèves · " +
            Store.competences.compter() + " fiches · " + Store.attendus.compter() + " attendus</p>" +
        "</div>" +
      "</section>" +

      /* ---- Sécurité ---- */
      '<section class="section">' +
        '<div class="section__head"><h2>Sécurité</h2></div>' +
        '<div class="card card--pad stack">' +
          '<label class="switch">' +
            '<input type="checkbox" id="p-verrou"' + (Verrou.estActif() ? " checked" : "") + ">" +
            '<span class="switch__track"></span>' +
            "<span>Code d'accès à l'ouverture</span>" +
          "</label>" +
          (Verrou.estActif()
            ? UI.champ({ id: "p-delai", label: "Reverrouiller après", type: "select",
                         valeur: String(r.delaiVerrou),
                         options: [
                           { valeur: "0", libelle: "Dès que je quitte l'application" },
                           { valeur: "60000", libelle: "1 minute" },
                           { valeur: "300000", libelle: "5 minutes" },
                           { valeur: "3600000", libelle: "1 heure" }
                         ] }) +
              '<div class="btn-row">' +
                '<button class="btn btn--sm" data-changer-code type="button">Changer le code</button>' +
                '<button class="btn btn--sm" data-verrouiller type="button">Verrouiller</button>' +
              "</div>"
            : "") +
          '<p class="small muted">Le code empêche d\'ouvrir l\'application, mais ne chiffre pas ' +
            'les données. La protection principale reste le verrouillage du téléphone lui-même.</p>' +
        "</div>" +
      "</section>" +

      /* ---- Préférences ---- */
      '<section class="section">' +
        '<div class="section__head"><h2>Préférences</h2></div>' +
        '<div class="stack">' +
          UI.champ({ id: "p-enseignant", label: "Enseignant", valeur: r.enseignant,
                     placeholder: "Nom affiché sur les exports" }) +
          UI.champ({ id: "p-etablissement", label: "Établissement", valeur: r.etablissement,
                     placeholder: "Collège Jean Moulin" }) +
          UI.champ({ id: "p-seuil", label: "Seuil d'alerte élève", type: "number", valeur: r.seuilAlerte,
                     attributs: ' min="1" max="20" step="1"',
                     aide: "Nombre d'oublis (tenue ou matériel) ou d'absences déclenchant une alerte." }) +
          UI.champ({ id: "p-theme", label: "Apparence", type: "select", valeur: r.theme,
                     options: [
                       { valeur: "auto", libelle: "Automatique (système)" },
                       { valeur: "clair", libelle: "Clair" },
                       { valeur: "sombre", libelle: "Sombre" }
                     ] }) +
        "</div>" +
      "</section>" +

      /* ---- Confort et année scolaire ---- */
      '<section class="section">' +
        '<div class="section__head"><h2>Confort et année scolaire</h2></div>' +
        '<div class="card card--pad stack">' +
          '<label class="switch">' +
            '<input type="checkbox" id="p-terrain"' + (r.modeTerrain ? " checked" : "") + ">" +
            '<span class="switch__track"></span>' +
            "<span>Mode terrain (gros boutons)</span>" +
          "</label>" +
          '<p class="small muted">Boutons et textes agrandis pour noter vite, debout, au gymnase.</p>' +
          '<div class="divider"></div>' +
          '<button class="btn" id="p-nouvelle-annee" type="button">' + UI.icone("horloge") + "Passer à l'année suivante</button>" +
          '<p class="small muted">Télécharge une archive complète, puis efface élèves, évaluations et présences AS. ' +
            "Vos séances, la base EPS, l'agenda et vos grilles types sont conservés.</p>" +
        "</div>" +
      "</section>" +

      /* ---- Professeur principal ---- */
      '<section class="section">' +
        '<div class="section__head"><h2>Professeur principal</h2></div>' +
        '<div class="card card--pad stack">' +
          '<label class="switch">' +
            '<input type="checkbox" id="p-pp"' + (r.profPrincipal ? " checked" : "") + ">" +
            '<span class="switch__track"></span>' +
            "<span>Je suis professeur principal</span>" +
          "</label>" +
          (r.profPrincipal
            ? UI.champ({ id: "p-classe-pp", label: "Ma classe", type: "select", valeur: r.classePP,
                         options: [{ valeur: "", libelle: "— Choisir une classe —" }].concat(classes),
                         aide: classes.length ? "" : "Ajoutez d'abord vos élèves dans l'onglet Élèves." })
            : "") +
          '<p class="small muted">Coché, un onglet « Prof P. » apparaît pour rédiger les appréciations générales de la classe.</p>' +
        "</div>" +
      "</section>" +

      /* ---- Base d'exemples ---- */
      '<section class="section">' +
        '<div class="section__head"><h2>Base de démarrage</h2></div>' +
        '<div class="list">' +
          action("etincelle", "Réinjecter les fiches d'exemple", "Ajoute les fiches fournies avec l'application", "exemples") +
        "</div>" +
      "</section>" +

      /* ---- Installation ---- */
      '<section class="section">' +
        '<div class="section__head"><h2>Installer sur le téléphone</h2></div>' +
        '<div class="card card--pad stack">' +
          '<p class="small">Ouvrez ce lien dans le navigateur du téléphone, puis :</p>' +
          '<p class="small muted"><b>iPhone (Safari)</b> : bouton Partager → « Sur l\'écran d\'accueil ».<br>' +
          '<b>Android (Chrome)</b> : menu ⋮ → « Installer l\'application ».</p>' +
          '<button class="btn btn--primary" id="btn-installer" type="button" hidden>' +
            UI.icone("telephone") + "Installer maintenant</button>" +
          '<p class="small muted">L\'application fonctionne ensuite <b>hors connexion</b>, même au gymnase.</p>' +
        "</div>" +
      "</section>" +

      /* ---- Zone sensible ---- */
      '<section class="section">' +
        '<div class="section__head"><h2>Zone sensible</h2></div>' +
        '<button class="btn btn--danger btn--block" data-effacer type="button">' +
          UI.icone("poubelle") + "Effacer toutes les données</button>" +
      "</section>" +

      '<p class="small muted" style="margin-top:32px;text-align:center">Prof EPS+ · version ' +
        U.echapper(App.VERSION) + '<br>Données locales, aucun compte, aucun serveur.</p>';

    brancher(conteneur);
  }

  function action(ico, titre, sousTitre, cle) {
    return '<button class="item" type="button" data-do="' + cle + '">' +
      '<span class="avatar avatar--accent">' + UI.icone(ico) + "</span>" +
      '<span class="item__main">' +
        '<span class="item__title">' + U.echapper(titre) + "</span>" +
        '<span class="item__sub">' + U.echapper(sousTitre) + "</span>" +
      "</span>" + UI.icone("chevron", "item__chev") + "</button>";
  }

  function brancher(conteneur) {
    var selecteurClasse = conteneur.querySelector("#x-classe");
    var filtre = function () {
      return selecteurClasse && selecteurClasse.value ? { classe: selecteurClasse.value } : {};
    };
    var titre = function () {
      return selecteurClasse && selecteurClasse.value
        ? "Cahier de texte EPS — " + selecteurClasse.value
        : "Cahier de texte EPS";
    };

    U.sur(conteneur, "click", "[data-do]", function (e, el) {
      switch (el.getAttribute("data-do")) {
        case "aller-pdf":    App.aller("pdf"); break;
        case "word-seances": Exports.exporterWordSeances(filtre(), titre()); break;
        case "csv-seances":  Exports.exporterCSVSeances(filtre()); break;
        case "pdf-eleves":
          try { U.telecharger("suivi-eleves-" + U.aujourdhui() + ".pdf", Vues.pdf.documentEleves()); UI.toast("PDF créé."); }
          catch (err) { UI.toast("Création du PDF impossible.", "error"); }
          break;
        case "word-eleves":  Exports.exporterWordEleves(); break;
        case "csv-eleves":   Exports.exporterCSVEleves(); break;
        case "sauvegarder":  Exports.sauvegarder(); break;
        case "restaurer":    conteneur.querySelector("#fichier-restauration").click(); break;
        case "exemples":     reinjecterExemples(); break;
      }
    });

    /* Restauration */
    conteneur.querySelector("#fichier-restauration").addEventListener("change", function (e) {
      var fichier = e.target.files && e.target.files[0];
      if (!fichier) return;
      var lecteur = new FileReader();
      lecteur.onload = function () {
        choisirModeRestauration(String(lecteur.result));
        e.target.value = "";
      };
      lecteur.onerror = function () { UI.toast("Lecture du fichier impossible.", "error"); };
      lecteur.readAsText(fichier);
    });

    /* Préférences : enregistrement au fil de la saisie */
    var lien = function (id, cle, transformer) {
      var champ = conteneur.querySelector("#" + id);
      if (!champ) return;
      champ.addEventListener("change", function () {
        var valeur = transformer ? transformer(champ.value) : champ.value;
        Store.majReglages((function () { var o = {}; o[cle] = valeur; return o; })());
        if (cle === "theme") App.appliquerTheme();
        UI.toast("Préférence enregistrée.");
        if (cle === "seuilAlerte") App.rafraichir({ silencieux: true });
      });
    };
    lien("p-enseignant", "enseignant");
    lien("p-etablissement", "etablissement");
    lien("p-seuil", "seuilAlerte", function (v) { return Math.max(1, Math.min(20, Number(v) || 3)); });
    lien("p-theme", "theme");

    /* Rappel de sauvegarde, mode terrain, nouvelle année */
    conteneur.querySelector("#p-rappel-sauvegarde").addEventListener("change", function (e) {
      Store.majReglages({ rappelSauvegardeJours: Number(e.target.value) || 7 });
      UI.toast("Rappel enregistré.");
    });
    conteneur.querySelector("#p-terrain").addEventListener("change", function (e) {
      Store.majReglages({ modeTerrain: e.target.checked });
      App.appliquerTheme();
    });
    conteneur.querySelector("#p-nouvelle-annee").addEventListener("click", function () {
      UI.confirmer({
        titre: "Passer à l'année suivante",
        message: "Une archive complète (notes, appréciations, photos) va être téléchargée. Ensuite, les élèves, les évaluations et les présences AS seront effacés. " +
                 "Conservez bien le fichier d'archive.",
        valider: "Archiver et repartir", danger: true
      }).then(function (ok) {
        if (!ok) return;
        Exports.archiverAnnee().then(function () {
          Store.nouvelleAnnee();
          UI.toast("Archive téléchargée. Nouvelle année prête.", "success", 5000);
          App.rafraichir();
        });
      });
    });

    /* Professeur principal */
    var interrupteurPP = conteneur.querySelector("#p-pp");
    interrupteurPP.addEventListener("change", function () {
      Store.majReglages({ profPrincipal: interrupteurPP.checked });
      App.rendre();
    });
    var choixClassePP = conteneur.querySelector("#p-classe-pp");
    if (choixClassePP) {
      choixClassePP.addEventListener("change", function () {
        Store.majReglages({ classePP: choixClassePP.value });
        UI.toast("Classe enregistrée.");
      });
    }

    /* Code d'accès */
    var interrupteurVerrou = conteneur.querySelector("#p-verrou");
    interrupteurVerrou.addEventListener("change", function () {
      if (interrupteurVerrou.checked) {
        demanderCode("Choisir un code", function () { App.rendre(); });
      } else {
        UI.confirmer({
          titre: "Retirer le code",
          message: "L'application s'ouvrira sans demander de code.",
          valider: "Retirer",
          danger: true
        }).then(function (ok) {
          if (!ok) { interrupteurVerrou.checked = true; return; }
          Verrou.retirer();
          UI.toast("Code retiré.");
          App.rendre();
        });
      }
    });

    U.sur(conteneur, "click", "[data-changer-code]", function () {
      demanderCode("Nouveau code", function () { UI.toast("Code modifié."); });
    });
    U.sur(conteneur, "click", "[data-verrouiller]", function () { Verrou.verrouillerMaintenant(); });

    var champDelai = conteneur.querySelector("#p-delai");
    if (champDelai) {
      champDelai.addEventListener("change", function () {
        Store.majReglages({ delaiVerrou: Number(champDelai.value) });
        UI.toast("Préférence enregistrée.");
      });
    }

    /* Installation PWA */
    var boutonInstaller = conteneur.querySelector("#btn-installer");
    if (App.invitationInstallation) {
      boutonInstaller.hidden = false;
      boutonInstaller.addEventListener("click", function () {
        App.invitationInstallation.prompt();
        App.invitationInstallation = null;
        boutonInstaller.hidden = true;
      });
    }

    /* Effacement */
    U.sur(conteneur, "click", "[data-effacer]", function () {
      UI.confirmer({
        titre: "Tout effacer",
        message: "Séances, élèves et base EPS seront définitivement supprimés de ce navigateur. " +
                 "Téléchargez d'abord une sauvegarde si besoin.",
        valider: "Tout effacer",
        danger: true
      }).then(function (ok) {
        if (!ok) return;
        Store.toutEffacer();
        UI.toast("Données effacées.");
        App.aller("accueil");
      });
    });
  }

  function choisirModeRestauration(texte) {
    UI.feuille({
      titre: "Restaurer la sauvegarde",
      taille: "sm",
      corps: '<p class="detail__text">Comment souhaitez-vous intégrer ce fichier ?</p>' +
        UI.note("<b>Fusionner</b> conserve vos données actuelles et ajoute ce qui manque. " +
                "<b>Remplacer</b> écrase tout par le contenu du fichier."),
      actions:
        '<button class="btn" data-fusionner type="button">Fusionner</button>' +
        '<button class="btn btn--danger" data-remplacer type="button">Remplacer</button>',
      surMontage: function (corps, fermer, pied) {
        function restaurer(mode) {
          try {
            var bilan = Store.importerJSON(texte, mode);
            fermer();
            UI.toast(bilan.seances + " séances, " + bilan.eleves + " élèves restaurés.");
            App.aller("accueil");
          } catch (err) {
            fermer();
            UI.toast("Fichier invalide : " + err.message, "error", 5000);
          }
        }
        pied.querySelector("[data-fusionner]").addEventListener("click", function () { restaurer("fusionner"); });
        pied.querySelector("[data-remplacer]").addEventListener("click", function () { restaurer("remplacer"); });
      }
    });
  }

  /** Saisie d'un nouveau code, avec confirmation. */
  function demanderCode(titre, surSucces) {
    var annule = true;
    UI.feuille({
      titre: titre,
      sousTitre: "Quatre chiffres",
      taille: "sm",
      corps:
        UI.champ({ id: "v-code", label: "Code", type: "password", autofocus: true,
                   attributs: ' inputmode="numeric" maxlength="4" autocomplete="new-password" pattern="[0-9]*"' }) +
        UI.champ({ id: "v-code2", label: "Confirmer le code", type: "password",
                   attributs: ' inputmode="numeric" maxlength="4" autocomplete="new-password" pattern="[0-9]*"' }) +
        UI.note("Notez-le quelque part : il ne peut pas être retrouvé. En cas d'oubli, il faudra " +
                "effacer les données et restaurer une sauvegarde.", "warn"),
      actions:
        '<button class="btn" data-fermer type="button">Annuler</button>' +
        '<button class="btn btn--primary" data-valider type="button">Enregistrer</button>',
      surMontage: function (corps, fermer, pied) {
        pied.querySelector("[data-valider]").addEventListener("click", function () {
          var code = corps.querySelector("#v-code").value.trim();
          var confirmation = corps.querySelector("#v-code2").value.trim();
          if (!/^[0-9]{4}$/.test(code)) { UI.toast("Le code doit contenir 4 chiffres.", "error"); return; }
          if (code !== confirmation) { UI.toast("Les deux codes diffèrent.", "error"); return; }
          Verrou.definir(code).then(function () {
            annule = false;
            fermer();
            if (surSucces) surSucces();
          });
        });
      },
      surFermeture: function () {
        // L'interrupteur ne doit pas rester allumé si rien n'a été défini.
        if (annule && !Verrou.estActif()) App.rendre();
      }
    });
  }

  function reinjecterExemples() {
    UI.confirmer({
      titre: "Réinjecter les exemples",
      message: "Les fiches d'exemple seront ajoutées à votre base actuelle (sans rien supprimer).",
      valider: "Ajouter"
    }).then(function (ok) {
      if (!ok) return;
      var n = Seed.reinjecter();
      UI.toast(n + " fiches ajoutées.");
      App.rafraichir();
    });
  }

  global.Vues = global.Vues || {};
  global.Vues.reglages = {
    titre: "Réglages",
    sousTitre: "Exports et sauvegarde",
    onglet: "Réglages",
    icone: "reglages",
    rendre: rendre
  };
})(window);
