/* =====================================================================
   ui.js — briques d'interface : icônes, panneaux, notifications, champs
   ===================================================================== */
(function (global) {
  "use strict";

  /* ---------- Icônes (SVG en ligne, aucune dépendance externe) ---------- */
  var TRACES = {
    accueil:   '<path d="M4 10.5L12 4l8 6.5V19a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 19z"/><path d="M9.5 20.5v-6h5v6"/>',
    seances:   '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17M8 14h4"/>',
    eleves:    '<path d="M16.5 20v-1.6a3.4 3.4 0 00-3.4-3.4H6.9a3.4 3.4 0 00-3.4 3.4V20"/><circle cx="10" cy="7.8" r="3.4"/><path d="M20.5 20v-1.6a3.4 3.4 0 00-2.6-3.3M15.6 4.6a3.4 3.4 0 010 6.4"/>',
    base:      '<ellipse cx="12" cy="6" rx="7.5" ry="3"/><path d="M4.5 6v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6"/><path d="M4.5 12v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6"/>',
    reglages:  '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-2.7 1.1v.3a2 2 0 11-4 0v-.2a1.6 1.6 0 00-2.8-1.1l-.1.1a2 2 0 11-2.8-2.8l.1-.1A1.6 1.6 0 003.7 15a2 2 0 01-1.8 1.2H2a2 2 0 010-4h.2A1.6 1.6 0 004 9a1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1A1.6 1.6 0 009 4.7a2 2 0 011.2-1.8V3a2 2 0 014 0v.2a1.6 1.6 0 002.7 1.1l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8 1.6 1.6 0 001.5 1h.3a2 2 0 010 4H21a1.6 1.6 0 00-1.5 1z"/>',
    plus:      '<path d="M12 5v14M5 12h14"/>',
    moins:     '<path d="M5 12h14"/>',
    chevron:   '<path d="M9 5l7 7-7 7"/>',
    retour:    '<path d="M15 5l-7 7 7 7"/>',
    fermer:    '<path d="M6 6l12 12M18 6L6 18"/>',
    recherche: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    micro:     '<rect x="9" y="2.5" width="6" height="11.5" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0013 0M12 18v3.5M8.5 21.5h7"/>',
    stop:      '<rect x="6.5" y="6.5" width="11" height="11" rx="2"/>',
    crayon:    '<path d="M4 20.2l.9-3.6L15.4 6.1a2 2 0 012.8 0l1.7 1.7a2 2 0 010 2.8L9.4 21.1 5.8 22z"/>',
    poubelle:  '<path d="M4 6.5h16M9.5 6.5V4.8A1.3 1.3 0 0110.8 3.5h2.4a1.3 1.3 0 011.3 1.3v1.7M6.5 6.5l.9 13a1.6 1.6 0 001.6 1.5h6a1.6 1.6 0 001.6-1.5l.9-13"/>',
    check:     '<path d="M4.5 12.5l5 5 10-11"/>',
    alerte:    '<path d="M12 3.5L2.5 20h19z"/><path d="M12 10v4.5M12 17.4h.01"/>',
    info:      '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8h.01"/>',
    export:    '<path d="M12 15.5V3.5M8 7l4-3.5L16 7"/><path d="M4.5 15v3.5A2 2 0 006.5 20.5h11a2 2 0 002-2V15"/>',
    import:    '<path d="M12 3.5V15.5M8 12l4 3.5 4-3.5"/><path d="M4.5 15v3.5A2 2 0 006.5 20.5h11a2 2 0 002-2V15"/>',
    imprimer:  '<path d="M6.5 9V3.5h11V9"/><rect x="3.5" y="9" width="17" height="7.5" rx="2"/><path d="M6.5 14h11v6.5h-11z"/>',
    document:  '<path d="M13.5 3.5H7a2 2 0 00-2 2v13a2 2 0 002 2h10a2 2 0 002-2V9z"/><path d="M13.5 3.5V9H19M8.5 13h7M8.5 16.5h5"/>',
    tableur:   '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M9 9.5v10M15 9.5v10"/>',
    chrono:    '<circle cx="12" cy="13.5" r="7.2"/><path d="M9.6 2.6h4.8M12 2.6v2.7M17.6 7.4l1.6-1.7M12 13.5l3.1-3.1"/>',
    etincelle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
    cible:     '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
    telephone: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
    livre:     '<path d="M4 4.5h6a3 3 0 013 3v12a2.2 2.2 0 00-2.2-2.2H4z"/><path d="M20 4.5h-6a3 3 0 00-3 3v12a2.2 2.2 0 012.2-2.2H20z"/>',
    filtre:    '<path d="M3.5 5.5h17l-6.6 7.8v5.4l-3.8 2v-7.4z"/>',
    horloge:   '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5.3l3.3 2"/>',
    camera:    '<path d="M4 8.5A1.5 1.5 0 015.5 7h2.2l1.2-2h6.2l1.2 2h2.2A1.5 1.5 0 0119.5 8.5v9a1.5 1.5 0 01-1.5 1.5H5.5A1.5 1.5 0 014 17.5z"/><circle cx="12" cy="13" r="3.4"/>',
    trophee:   '<path d="M8 4.5h8v5a4 4 0 01-8 0z"/><path d="M8 6.5H5.5a2 2 0 002 3.5M16 6.5h2.5a2 2 0 01-2 3.5M12 13.5v3.5M8.5 20h7M9.5 17h5"/>',
    evaluation:'<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M9 3.5V6h6V3.5M8.5 11l1.6 1.6 2.9-3M8.5 16.5h7"/>',
    dossier:   '<circle cx="12" cy="8" r="3.4"/><path d="M5.5 20v-1.2A4.8 4.8 0 0110.3 14h3.4a4.8 4.8 0 014.8 4.8V20"/><path d="M3.5 3.5h3M3.5 3.5v3"/>',
    etoile:    '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>',
    oeil:      '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>'
  };

  function icone(nom, classe) {
    var trace = TRACES[nom] || "";
    return '<svg viewBox="0 0 24 24" aria-hidden="true"' + (classe ? ' class="' + classe + '"' : "") + ">" + trace + "</svg>";
  }

  /* ---------- Notifications ---------- */

  var racineToasts = null;

  function toast(message, type, duree) {
    racineToasts = racineToasts || document.getElementById("toast-root");
    if (!racineToasts) return;
    var ico = type === "error" ? "alerte" : type === "info" ? "info" : "check";
    var el = U.depuisHTML(
      '<div class="toast toast--' + (type || "success") + '" role="status">' +
        icone(ico) + "<span>" + U.echapper(message) + "</span></div>"
    );
    racineToasts.appendChild(el);
    var partir = setTimeout(function () { retirer(); }, duree || 3200);
    el.addEventListener("click", function () { clearTimeout(partir); retirer(); });

    function retirer() {
      el.classList.add("is-out");
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 200);
    }
  }

  /* ---------- Panneaux (feuilles modales) ---------- */

  var pileFeuilles = [];

  /**
   * Ouvre un panneau.
   * @param {Object} config { titre, sousTitre, corps (HTML), actions (HTML),
   *                          taille: "sm", surMontage(elementCorps, fermer) }
   */
  function feuille(config) {
    var racine = document.getElementById("sheet-root");
    racine.setAttribute("aria-hidden", "false");

    var elementActif = document.activeElement;

    var noeud = U.depuisHTML(
      '<div class="sheet-layer">' +
        '<div class="sheet-backdrop"></div>' +
        '<section class="sheet' + (config.taille === "sm" ? " sheet--sm" : "") + '" role="dialog" aria-modal="true" aria-label="' + U.echapper(config.titre || "") + '">' +
          '<div class="sheet__grip"></div>' +
          '<header class="sheet__head">' +
            '<div class="grow">' +
              "<h2>" + U.echapper(config.titre || "") + "</h2>" +
              (config.sousTitre ? "<p>" + U.echapper(config.sousTitre) + "</p>" : "") +
            "</div>" +
            '<button class="iconbtn" data-fermer type="button" aria-label="Fermer">' + icone("fermer") + "</button>" +
          "</header>" +
          '<div class="sheet__body">' + (config.corps || "") + "</div>" +
          (config.actions ? '<footer class="sheet__foot">' + config.actions + "</footer>" : "") +
        "</section>" +
      "</div>"
    );

    racine.appendChild(noeud);
    document.body.style.overflow = "hidden";

    var corps = noeud.querySelector(".sheet__body");
    var pied = noeud.querySelector(".sheet__foot");

    function fermer(resultat) {
      var i = pileFeuilles.indexOf(fermer);
      if (i !== -1) pileFeuilles.splice(i, 1);
      if (noeud.parentNode) noeud.parentNode.removeChild(noeud);
      if (!racine.children.length) {
        racine.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
      }
      if (elementActif && elementActif.focus) elementActif.focus();
      if (config.surFermeture) config.surFermeture(resultat);
    }

    pileFeuilles.push(fermer);
    noeud.querySelector(".sheet-backdrop").addEventListener("click", function () { fermer(); });
    U.$$("[data-fermer]", noeud).forEach(function (b) {
      b.addEventListener("click", function () { fermer(); });
    });

    if (config.surMontage) config.surMontage(corps, fermer, pied);

    // Focus sur le premier champ, sans déclencher le clavier mobile d'emblée.
    var premier = noeud.querySelector("[data-autofocus]");
    if (premier) setTimeout(function () { premier.focus(); }, 60);

    return { fermer: fermer, corps: corps, noeud: noeud };
  }

  /** Boîte de confirmation (remplace messagebox.askyesno). */
  function confirmer(config) {
    return new Promise(function (resoudre) {
      var decide = false;
      feuille({
        titre: config.titre || "Confirmer",
        taille: "sm",
        corps: '<p class="detail__text">' + U.echapper(config.message || "") + "</p>",
        actions:
          '<button class="btn" data-fermer type="button">Annuler</button>' +
          '<button class="btn ' + (config.danger ? "btn--danger" : "btn--primary") + '" data-ok type="button">' +
            U.echapper(config.valider || "Confirmer") + "</button>",
        surMontage: function (corps, fermer, pied) {
          pied.querySelector("[data-ok]").addEventListener("click", function () {
            decide = true;
            fermer();
            resoudre(true);
          });
        },
        surFermeture: function () { if (!decide) resoudre(false); }
      });
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && pileFeuilles.length) {
      pileFeuilles[pileFeuilles.length - 1]();
    }
  });

  /* ---------- Fabriques de champs ---------- */

  function champ(config) {
    var id = config.id || "f-" + U.uid();
    var commun =
      'id="' + id + '" name="' + (config.nom || id) + '" class="' + (config.type === "textarea" ? "textarea" : config.type === "select" ? "select" : "input") + '"' +
      (config.placeholder ? ' placeholder="' + U.echapper(config.placeholder) + '"' : "") +
      (config.requis ? " required" : "") +
      (config.autofocus ? " data-autofocus" : "") +
      (config.liste ? ' list="' + config.liste + '"' : "") +
      (config.attributs || "");

    var controle;
    if (config.type === "textarea") {
      controle = "<textarea " + commun + (config.lignes ? ' rows="' + config.lignes + '"' : "") + ">" + U.echapper(config.valeur || "") + "</textarea>";
    } else if (config.type === "select") {
      controle = "<select " + commun + ">" +
        (config.options || []).map(function (o) {
          var val = typeof o === "string" ? o : o.valeur;
          var lab = typeof o === "string" ? o : o.libelle;
          return '<option value="' + U.echapper(val) + '"' + (String(val) === String(config.valeur) ? " selected" : "") + ">" + U.echapper(lab) + "</option>";
        }).join("") + "</select>";
    } else {
      controle = "<input type=\"" + (config.type || "text") + "\" " + commun + ' value="' + U.echapper(config.valeur || "") + '">';
    }

    return '<div class="field">' +
      '<label class="field__label" for="' + id + '">' + U.echapper(config.label || "") + "</label>" +
      (config.avecMicro
        ? '<div class="field__row"><div class="grow">' + controle + "</div>" +
          '<button type="button" class="mic" data-micro="' + id + '" aria-label="Dicter" title="Dicter">' + icone("micro") + "</button></div>"
        : controle) +
      (config.aide ? '<p class="field__hint">' + config.aide + "</p>" : "") +
    "</div>";
  }

  function listeOptions(id, valeurs) {
    return '<datalist id="' + id + '">' +
      valeurs.map(function (v) { return '<option value="' + U.echapper(v) + '"></option>'; }).join("") +
      "</datalist>";
  }

  function barreRecherche(placeholder, valeur) {
    return '<div class="search">' +
      icone("recherche", "search__ico") +
      '<input type="search" class="input" data-recherche placeholder="' + U.echapper(placeholder) + '" value="' + U.echapper(valeur || "") + '" autocomplete="off">' +
    "</div>";
  }

  function vide(config) {
    return '<div class="empty">' +
      '<div class="empty__ico">' + icone(config.icone || "info") + "</div>" +
      "<h3>" + U.echapper(config.titre) + "</h3>" +
      "<p>" + U.echapper(config.texte || "") + "</p>" +
      (config.action || "") +
    "</div>";
  }

  function note(texte, variante) {
    return '<div class="note' + (variante ? " note--" + variante : "") + '">' +
      icone(variante === "warn" || variante === "danger" ? "alerte" : "info") +
      "<div>" + texte + "</div></div>";
  }

  /** Branche un bouton micro sur un champ texte. */
  function brancherMicro(racine, options) {
    U.$$("[data-micro]", racine).forEach(function (bouton) {
      var cible = racine.querySelector("#" + bouton.getAttribute("data-micro"));
      if (!cible) return;
      if (!Voix.disponible()) {
        bouton.disabled = true;
        bouton.title = "Dictée non disponible sur ce navigateur — utilisez le micro du clavier.";
        return;
      }
      bouton.addEventListener("click", function () {
        if (bouton.classList.contains("is-recording")) { Voix.arreter(); return; }
        var initial = cible.value;
        bouton.classList.add("is-recording");
        U.vibrer(15);
        Voix.demarrer({
          continu: true,
          surApercu: function (texte) {
            cible.value = (initial ? initial.trim() + " " : "") + texte;
            if (options && options.surApercu) options.surApercu(cible.value, cible);
          },
          surTexte: function (texte) {
            cible.value = (initial ? initial.trim() + " " : "") + texte;
            if (options && options.surTexte) options.surTexte(cible.value, cible);
          },
          surErreur: function (m) { toast(m, "error"); },
          surFin: function () { bouton.classList.remove("is-recording"); }
        });
      });
    });
  }

  global.UI = {
    icone: icone,
    toast: toast,
    feuille: feuille,
    confirmer: confirmer,
    champ: champ,
    listeOptions: listeOptions,
    barreRecherche: barreRecherche,
    vide: vide,
    note: note,
    brancherMicro: brancherMicro
  };
})(window);
