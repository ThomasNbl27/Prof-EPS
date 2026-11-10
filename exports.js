/* =====================================================================
   exports.js — PDF (impression), Word, CSV, sauvegarde JSON
   Tout est produit dans le navigateur : aucun serveur, aucun envoi.
   ===================================================================== */
(function (global) {
  "use strict";

  function enTete() {
    var r = Store.reglages();
    var lignes = [];
    if (r.enseignant) lignes.push(U.echapper(r.enseignant));
    if (r.etablissement) lignes.push(U.echapper(r.etablissement));
    lignes.push("Édité le " + U.dateLongue(U.aujourdhui()));
    return lignes.join(" · ");
  }

  function nomFichier(base, extension) {
    return base + "-" + U.aujourdhui() + "." + extension;
  }

  /* ---------- Sélection ---------- */

  function seancesFiltrees(filtre) {
    filtre = filtre || {};
    return Store.seancesTriees().filter(function (s) {
      if (filtre.id && s.id !== filtre.id) return false;
      if (filtre.classe && s.classe !== filtre.classe) return false;
      if (filtre.activite && s.activite !== filtre.activite) return false;
      if (filtre.depuis && (s.date || "") < filtre.depuis) return false;
      if (filtre.jusqua && (s.date || "") > filtre.jusqua) return false;
      return true;
    });
  }

  /* ---------- 1. Impression / PDF ---------- */

  function corpsSeances(seances, titre) {
    return '<div class="print">' +
      "<h1>" + U.echapper(titre) + "</h1>" +
      '<div class="print__meta">' + enTete() + " · " + U.pluriel(seances.length, "séance") + "</div>" +
      seances.map(function (s) {
        return '<article class="print__entry">' +
          "<h2>" + U.echapper(U.dateAvecJour(s.date)) + " — " + U.echapper(s.classe || "Classe non précisée") + "</h2>" +
          '<div class="print__tags">' +
            U.echapper([s.activite, s.cycle].filter(Boolean).join(" · ") || "—") +
          "</div>" +
          bloc("Contenu de la séance", s.contenu) +
          bloc("Compétences travaillées", s.competences) +
          bloc("Observations", s.observations) +
        "</article>";
      }).join("") +
    "</div>";

    function bloc(titreBloc, valeur) {
      if (!valeur || !String(valeur).trim()) return "";
      return '<div class="print__field"><b>' + titreBloc + "</b>" + U.echapper(String(valeur).trim()) + "</div>";
    }
  }

  function corpsEleves(eleves) {
    var seuil = Number(Store.reglages().seuilAlerte) || 3;
    return '<div class="print">' +
      "<h1>Suivi des élèves</h1>" +
      '<div class="print__meta">' + enTete() + " · " + U.pluriel(eleves.length, "élève") + "</div>" +
      "<table><thead><tr><th>Classe</th><th>Nom</th><th>Oublis tenue</th><th>Oublis matériel</th><th>Absences</th><th>Dispense en cours</th></tr></thead><tbody>" +
      eleves.map(function (e) {
        var alerte = Store.totalCompteurs(e, seuil) > 0;
        return "<tr><td>" + U.echapper(e.classe || "") + "</td><td>" + U.echapper(e.nom || "") +
          (alerte ? " (!)" : "") + "</td><td>" + (e.oublis || 0) + "</td><td>" + (e.oublisMateriel || 0) +
          "</td><td>" + (e.absences || 0) + "</td><td>" + U.echapper(Store.libelleDispense(e)) + "</td></tr>";
      }).join("") +
      "</tbody></table></div>";
  }

  /** Prépare la zone d'impression puis ouvre la boîte d'impression du système. */
  function imprimer(html) {
    var racine = document.getElementById("print-root");
    racine.innerHTML = html;
    var nettoyer = function () {
      racine.innerHTML = "";
      global.removeEventListener("afterprint", nettoyer);
    };
    global.addEventListener("afterprint", nettoyer);
    setTimeout(function () {
      global.print();
      // Filet de sécurité si l'événement afterprint n'est pas émis (iOS).
      setTimeout(nettoyer, 60000);
    }, 60);
  }

  function imprimerSeances(filtre, titre) {
    var seances = seancesFiltrees(filtre);
    if (!seances.length) { UI.toast("Aucune séance à imprimer.", "error"); return; }
    imprimer(corpsSeances(seances, titre || "Cahier de texte EPS"));
  }

  function imprimerEleves() {
    var eleves = Store.elevesTries();
    if (!eleves.length) { UI.toast("Aucun élève enregistré.", "error"); return; }
    imprimer(corpsEleves(eleves));
  }

  /* ---------- 2. Word (.doc lisible par Word, Pages et Google Docs) ---------- */

  function documentWord(contenuHTML, titre) {
    return "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
      "xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>" +
      "<head><meta charset='utf-8'><title>" + U.echapper(titre) + "</title>" +
      "<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->" +
      "<style>" +
      "@page { size: A4; margin: 2cm; }" +
      "body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #111; }" +
      "h1 { font-size: 18pt; margin: 0 0 4pt; }" +
      "h2 { font-size: 13pt; margin: 16pt 0 2pt; border-bottom: .5pt solid #BBB; padding-bottom: 2pt; }" +
      ".meta { font-size: 9pt; color: #666; margin-bottom: 16pt; }" +
      ".tags { font-size: 9.5pt; color: #444; margin-bottom: 6pt; }" +
      ".lab { font-size: 8.5pt; text-transform: uppercase; letter-spacing: .5pt; color: #666; margin-top: 8pt; }" +
      ".txt { font-size: 11pt; white-space: pre-wrap; }" +
      "table { border-collapse: collapse; width: 100%; font-size: 10pt; }" +
      "td, th { border: .5pt solid #999; padding: 4pt 6pt; text-align: left; }" +
      "th { background: #EEE; }" +
      "</style></head><body>" + contenuHTML + "</body></html>";
  }

  function exporterWordSeances(filtre, titre) {
    var seances = seancesFiltrees(filtre);
    if (!seances.length) { UI.toast("Aucune séance à exporter.", "error"); return; }
    titre = titre || "Cahier de texte EPS";

    var corps = "<h1>" + U.echapper(titre) + "</h1><div class='meta'>" + enTete() + "</div>" +
      seances.map(function (s) {
        return "<h2>" + U.echapper(U.dateAvecJour(s.date)) + " — " + U.echapper(s.classe || "Classe non précisée") + "</h2>" +
          "<div class='tags'>" + U.echapper([s.activite, s.cycle].filter(Boolean).join(" · ")) + "</div>" +
          champWord("Contenu", s.contenu) +
          champWord("Compétences", s.competences) +
          champWord("Observations", s.observations);
      }).join("");

    U.telecharger(nomFichier("cahier-eps", "doc"), documentWord(corps, titre), "application/msword;charset=utf-8");
    UI.toast("Document Word créé.");

    function champWord(label, valeur) {
      if (!valeur || !String(valeur).trim()) return "";
      return "<div class='lab'>" + label + "</div><div class='txt'>" + U.echapper(String(valeur).trim()) + "</div>";
    }
  }

  function exporterWordEleves() {
    var eleves = Store.elevesTries();
    if (!eleves.length) { UI.toast("Aucun élève enregistré.", "error"); return; }
    var corps = "<h1>Suivi des élèves</h1><div class='meta'>" + enTete() + "</div>" +
      "<table><tr><th>Classe</th><th>Nom</th><th>Oublis tenue</th><th>Oublis matériel</th><th>Absences</th><th>Dispense en cours</th></tr>" +
      eleves.map(function (e) {
        return "<tr><td>" + U.echapper(e.classe || "") + "</td><td>" + U.echapper(e.nom || "") + "</td><td>" +
          (e.oublis || 0) + "</td><td>" + (e.oublisMateriel || 0) + "</td><td>" + (e.absences || 0) + "</td><td>" +
          U.echapper(Store.libelleDispense(e)) + "</td></tr>";
      }).join("") + "</table>";
    U.telecharger(nomFichier("suivi-eleves", "doc"), documentWord(corps, "Suivi des élèves"), "application/msword;charset=utf-8");
    UI.toast("Document Word créé.");
  }

  /* ---------- 3. CSV (tableur) ---------- */

  /** Point-virgule + BOM : Excel en français ouvre le fichier sans réglage. */
  function versCSV(entetes, lignes) {
    var cellule = function (v) {
      var s = String(v === null || v === undefined ? "" : v).replace(/"/g, '""').replace(/\r?\n/g, " ");
      return '"' + s + '"';
    };
    return "﻿" + [entetes].concat(lignes)
      .map(function (l) { return l.map(cellule).join(";"); })
      .join("\r\n");
  }

  function exporterCSVSeances(filtre) {
    var seances = seancesFiltrees(filtre);
    if (!seances.length) { UI.toast("Aucune séance à exporter.", "error"); return; }
    var csv = versCSV(
      ["Date", "Classe", "Cycle", "Activité", "Contenu", "Compétences", "Observations"],
      seances.map(function (s) {
        return [s.date, s.classe, s.cycle, s.activite, s.contenu, s.competences, s.observations];
      })
    );
    U.telecharger(nomFichier("seances-eps", "csv"), csv, "text/csv;charset=utf-8");
    UI.toast("Fichier CSV créé.");
  }

  function exporterCSVEleves() {
    var eleves = Store.elevesTries();
    if (!eleves.length) { UI.toast("Aucun élève enregistré.", "error"); return; }
    var csv = versCSV(
      ["Classe", "Nom", "Oublis tenue", "Oublis matériel", "Absences", "Dispense en cours"],
      eleves.map(function (e) {
        return [e.classe, e.nom, e.oublis || 0, e.oublisMateriel || 0, e.absences || 0, Store.libelleDispense(e)];
      })
    );
    U.telecharger(nomFichier("eleves-eps", "csv"), csv, "text/csv;charset=utf-8");
    UI.toast("Fichier CSV créé.");
  }

  /* ---------- 4. Sauvegarde complète ---------- */

  function marquerSauvegarde() {
    Store.majReglages({ derniereSauvegarde: U.aujourdhui(), rappelSauvegardeSuivant: "", rappelReporteAu: "" });
  }

  /**
   * Sauvegarde complète. Sur téléphone, la feuille de partage s'ouvre : on y choisit
   * « Enregistrer dans Fichiers » (iCloud Drive, Drive…). Ailleurs, le fichier se télécharge.
   * Une application web ne peut pas écrire seule dans iCloud : c'est un geste, une fois par semaine.
   */
  function sauvegarder() {
    // Les photos de dispenses vivent à part : on les joint au fichier de sauvegarde.
    Photos.exporter().then(function (photos) {
      var nom = nomFichier("sauvegarde-prof-eps", "json");
      var texte = Store.exporterJSON(photos);
      var mobile = navigator.maxTouchPoints > 0 && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (mobile && navigator.canShare) {
        try {
          var fichier = new File([texte], nom, { type: "application/json" });
          if (navigator.canShare({ files: [fichier] })) {
            navigator.share({ files: [fichier], title: nom }).then(function () {
              marquerSauvegarde();
              UI.toast("Sauvegarde enregistrée.");
              if (global.App) App.rafraichir({ silencieux: true });
            }).catch(function (err) {
              if (err && err.name === "AbortError") return;     // annulé : rien n'est marqué
              U.telecharger(nom, texte, "application/json;charset=utf-8");
              marquerSauvegarde();
              UI.toast("Sauvegarde téléchargée.");
            });
            return;
          }
        } catch (e) { /* retombe sur le téléchargement */ }
      }
      U.telecharger(nom, texte, "application/json;charset=utf-8");
      marquerSauvegarde();
      UI.toast("Sauvegarde téléchargée.");
    });
  }

  /** Archive de fin d'année : téléchargement direct (jamais de partage), puis on repart à zéro. */
  function archiverAnnee() {
    return Photos.exporter().then(function (photos) {
      var d = new Date();
      var debut = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
      U.telecharger("archive-annee-" + debut + "-" + (debut + 1) + ".json", Store.exporterJSON(photos), "application/json;charset=utf-8");
      marquerSauvegarde();
    });
  }

  /** Remet un PDF à l'utilisateur : partage natif si possible, sinon téléchargement. */
  function livrerPDF(blob, nom) {
    try {
      var fichier = new File([blob], nom, { type: "application/pdf" });
      if (navigator.canShare && navigator.canShare({ files: [fichier] })) {
        navigator.share({ files: [fichier], title: nom }).catch(function () { U.telecharger(nom, blob); });
        return;
      }
    } catch (e) { /* retombe sur le téléchargement */ }
    U.telecharger(nom, blob);
    UI.toast("PDF créé : " + nom);
  }

  /** Nombre de jours depuis la dernière sauvegarde (null si aucune). */
  function joursDepuisSauvegarde() {
    var date = Store.reglages().derniereSauvegarde;
    if (!date) return null;
    var d = U.depuisISO(date);
    if (!d) return null;
    return Math.floor((new Date().setHours(0, 0, 0, 0) - d.getTime()) / 86400000);
  }

  /** Faut-il rappeler au professeur de sauvegarder ? */
  function rappelSauvegardeUtile() {
    if (!Store.seances.compter() && !Store.eleves.compter()) return false;
    var reporte = Store.reglages().rappelReporteAu;
    if (reporte && U.aujourdhui() < reporte) return false;
    var jours = joursDepuisSauvegarde();
    var delai = Number(Store.reglages().rappelSauvegardeJours) || 7;
    return jours === null || jours >= delai;
  }

  /* ---------- 5. Partage natif (téléphone) ---------- */

  function partageDisponible() {
    return !!(navigator.share);
  }

  function partagerSeance(seance) {
    if (!navigator.share) return false;
    var texte = [
      U.dateAvecJour(seance.date) + " — " + (seance.classe || ""),
      seance.activite ? "Activité : " + seance.activite : "",
      seance.contenu ? "\nContenu :\n" + seance.contenu : "",
      seance.competences ? "\nCompétences :\n" + seance.competences : "",
      seance.observations ? "\nObservations :\n" + seance.observations : ""
    ].filter(Boolean).join("\n");
    navigator.share({ title: "Séance EPS", text: texte }).catch(function () {});
    return true;
  }

  global.Exports = {
    seancesFiltrees: seancesFiltrees,
    imprimerSeances: imprimerSeances,
    imprimerEleves: imprimerEleves,
    exporterWordSeances: exporterWordSeances,
    exporterWordEleves: exporterWordEleves,
    exporterCSVSeances: exporterCSVSeances,
    exporterCSVEleves: exporterCSVEleves,
    sauvegarder: sauvegarder,
    archiverAnnee: archiverAnnee,
    livrerPDF: livrerPDF,
    joursDepuisSauvegarde: joursDepuisSauvegarde,
    rappelSauvegardeUtile: rappelSauvegardeUtile,
    partageDisponible: partageDisponible,
    partagerSeance: partagerSeance
  };
})(window);
