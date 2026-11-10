/* =====================================================================
   pdf.js — générateur de PDF
   Produit un vrai fichier PDF dans le navigateur, sans bibliothèque.
   Indispensable : window.print() ne fonctionne pas quand l'application
   est installée sur l'écran d'accueil d'un iPhone.
   ===================================================================== */
(function (global) {
  "use strict";

  /* ---------- Métriques Helvetica (unités /1000) ---------- */

  var ASCII_NORMAL = [
    278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,
    556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,
    1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,
    667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,
    333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,
    556,556,333,500,278,556,500,722,500,500,500,334,260,334,584
  ];
  var ASCII_GRAS = [
    278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,
    556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,
    975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,
    667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,
    333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,
    611,611,389,556,333,611,556,778,556,556,500,389,280,389,584
  ];

  /* Caractères accentués : même largeur que la lettre de base. */
  var EQUIVALENTS = {
    "À":"A","Á":"A","Â":"A","Ã":"A","Ä":"A","Å":"A","Ç":"C","È":"E","É":"E","Ê":"E","Ë":"E",
    "Ì":"I","Í":"I","Î":"I","Ï":"I","Ñ":"N","Ò":"O","Ó":"O","Ô":"O","Õ":"O","Ö":"O","Ø":"O",
    "Ù":"U","Ú":"U","Û":"U","Ü":"U","Ý":"Y","à":"a","á":"a","â":"a","ã":"a","ä":"a","å":"a",
    "ç":"c","è":"e","é":"e","ê":"e","ë":"e","ì":"i","í":"i","î":"i","ï":"i","ñ":"n",
    "ò":"o","ó":"o","ô":"o","õ":"o","ö":"o","ø":"o","ù":"u","ú":"u","û":"u","ü":"u",
    "ý":"y","ÿ":"y","ß":"s","«":"o","»":"o","·":" ","°":"t","–":"n","—":"m","…":"m",
    "’":"'","‘":"'","“":'"',"”":'"',"€":"E","œ":"m","Œ":"M","æ":"m","Æ":"M"
  };

  function largeur(caractere, gras) {
    var c = EQUIVALENTS[caractere] || caractere;
    var code = c.charCodeAt(0);
    if (code < 32 || code > 126) return gras ? 611 : 556;
    return (gras ? ASCII_GRAS : ASCII_NORMAL)[code - 32];
  }

  function mesurer(texte, taille, gras) {
    var total = 0;
    for (var i = 0; i < texte.length; i++) total += largeur(texte[i], gras);
    return total * taille / 1000;
  }

  /* ---------- Encodage WinAnsi ---------- */

  var WINANSI = {
    "€":128,"‚":130,"ƒ":131,"„":132,"…":133,"†":134,"‡":135,"ˆ":136,"‰":137,"Š":138,
    "‹":139,"Œ":140,"Ž":142,"‘":145,"’":146,"“":147,"”":148,"•":149,"–":150,"—":151,
    "˜":152,"™":153,"š":154,"›":155,"œ":156,"ž":158,"Ÿ":159
  };

  function encoder(texte) {
    var sortie = "";
    for (var i = 0; i < texte.length; i++) {
      var ch = texte[i];
      var code = WINANSI[ch];
      if (code === undefined) {
        code = ch.charCodeAt(0);
        if (code > 255) {
          // Dernier recours : on retire l'accent, sinon point d'interrogation.
          var simple = ch.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          code = simple.charCodeAt(0);
          if (isNaN(code) || code > 255) code = 63;
        }
      }
      if (code === 40 || code === 41 || code === 92) sortie += "\\" + String.fromCharCode(code);
      else if (code < 32 || code > 126) sortie += "\\" + ("00" + code.toString(8)).slice(-3);
      else sortie += String.fromCharCode(code);
    }
    return sortie;
  }

  /* ---------- Document ---------- */

  var A4 = { largeur: 595.28, hauteur: 841.89 };
  var MARGE = { gauche: 56, droite: 56, haut: 56, bas: 62 };

  var STYLES = {
    titre:    { taille: 19,   gras: true,  interligne: 1.25, espaceApres: 4 },
    meta:     { taille: 8.5,  gras: false, interligne: 1.35, espaceApres: 14, gris: 0.45 },
    section:  { taille: 12,   gras: true,  interligne: 1.3,  espaceApres: 3 },
    etiquette:{ taille: 8.6,  gras: false, interligne: 1.3,  espaceApres: 6, gris: 0.42 },
    label:    { taille: 7.6,  gras: true,  interligne: 1.3,  espaceApres: 2, gris: 0.42 },
    corps:    { taille: 10,   gras: false, interligne: 1.42, espaceApres: 7 },
    tableau:  { taille: 9,    gras: false, interligne: 1.35, espaceApres: 0 }
  };

  function document_(options) {
    options = options || {};
    var pages = [];        // flux de contenu, une chaîne par page
    var courante = null;
    var y = 0;
    var largeurUtile = A4.largeur - MARGE.gauche - MARGE.droite;

    function nouvellePage() {
      courante = [];
      pages.push(courante);
      y = A4.hauteur - MARGE.haut;
    }

    function ecrire(commande) { courante.push(commande); }

    function place(hauteurNecessaire) {
      if (!courante) nouvellePage();
      if (y - hauteurNecessaire < MARGE.bas) nouvellePage();
    }

    /** Découpe un texte pour qu'il tienne dans la largeur donnée. */
    function decouper(texte, taille, gras, largeurMax) {
      var lignes = [];
      String(texte).split(/\r?\n/).forEach(function (paragraphe) {
        if (!paragraphe.trim()) { lignes.push(""); return; }
        var mots = paragraphe.split(/\s+/).filter(Boolean);
        var ligne = "";
        mots.forEach(function (mot) {
          var essai = ligne ? ligne + " " + mot : mot;
          if (mesurer(essai, taille, gras) <= largeurMax) { ligne = essai; return; }
          if (ligne) lignes.push(ligne);
          // Mot plus long que la ligne : on le coupe.
          while (mesurer(mot, taille, gras) > largeurMax && mot.length > 1) {
            var coupe = mot.length;
            while (coupe > 1 && mesurer(mot.slice(0, coupe), taille, gras) > largeurMax) coupe--;
            lignes.push(mot.slice(0, coupe));
            mot = mot.slice(coupe);
          }
          ligne = mot;
        });
        if (ligne) lignes.push(ligne);
      });
      return lignes;
    }

    function texte(contenu, style, decalage) {
      if (contenu === null || contenu === undefined || contenu === "") return;
      var s = STYLES[style] || STYLES.corps;
      var x = MARGE.gauche + (decalage || 0);
      var largeurMax = largeurUtile - (decalage || 0);
      var hauteurLigne = s.taille * s.interligne;
      var lignes = decouper(contenu, s.taille, s.gras, largeurMax);
      var gris = s.gris === undefined ? 0.12 : s.gris;

      lignes.forEach(function (ligne) {
        place(hauteurLigne);
        y -= hauteurLigne;
        if (ligne) {
          ecrire(gris.toFixed(2) + " g");
          ecrire("BT /" + (s.gras ? "F2" : "F1") + " " + s.taille + " Tf " +
                 "1 0 0 1 " + x.toFixed(2) + " " + y.toFixed(2) + " Tm (" + encoder(ligne) + ") Tj ET");
        }
      });
      y -= s.espaceApres;
    }

    var api = {

      /** Réserve la place d'un bloc pour ne pas couper un titre de sa suite. */
      garderEnsemble: function (hauteurEstimee) {
        if (!courante) nouvellePage();
        if (y - hauteurEstimee < MARGE.bas) nouvellePage();
        return api;
      },

      titre: function (t) { texte(t, "titre"); return api; },
      meta: function (t) { texte(t, "meta"); return api; },
      section: function (t) { texte(t, "section"); return api; },
      etiquettes: function (t) { texte(t, "etiquette"); return api; },
      corps: function (t) { texte(t, "corps"); return api; },

      /** Bloc « intitulé + contenu » d'une séance. */
      champ: function (label, valeur) {
        if (!valeur || !String(valeur).trim()) return api;
        texte(String(label).toUpperCase(), "label");
        texte(String(valeur).trim(), "corps");
        return api;
      },

      /** Filet horizontal. */
      filet: function (epaisseur, gris) {
        place(10);
        y -= 6;
        ecrire((gris === undefined ? 0.78 : gris).toFixed(2) + " G");
        ecrire((epaisseur || 0.5) + " w");
        ecrire(MARGE.gauche + " " + y.toFixed(2) + " m " +
               (A4.largeur - MARGE.droite).toFixed(2) + " " + y.toFixed(2) + " l S");
        y -= 8;
        return api;
      },

      espace: function (hauteur) { y -= (hauteur || 8); return api; },

      sautDePage: function () { nouvellePage(); return api; },

      /**
       * Tableau simple.
       * @param {Array} entetes  libellés
       * @param {Array} lignes   tableau de tableaux
       * @param {Array} parts    répartition des colonnes (somme = 1)
       */
      tableau: function (entetes, lignes, parts) {
        var s = STYLES.tableau;
        var hauteurLigne = s.taille * 1.9;
        var colonnes = parts.map(function (p) { return p * largeurUtile; });

        function enTete() {
          place(hauteurLigne * 2);
          y -= hauteurLigne;
          ecrire("0.93 g");
          ecrire(MARGE.gauche + " " + y.toFixed(2) + " " + largeurUtile.toFixed(2) + " " +
                 hauteurLigne.toFixed(2) + " re f");
          var x = MARGE.gauche;
          entetes.forEach(function (titre, i) {
            ecrire("0.25 g");
            ecrire("BT /F2 " + s.taille + " Tf 1 0 0 1 " + (x + 4).toFixed(2) + " " +
                   (y + hauteurLigne * 0.32).toFixed(2) + " Tm (" + encoder(String(titre)) + ") Tj ET");
            x += colonnes[i];
          });
        }

        enTete();
        lignes.forEach(function (ligne, index) {
          if (y - hauteurLigne < MARGE.bas) { nouvellePage(); enTete(); }
          y -= hauteurLigne;
          if (index % 2 === 1) {
            ecrire("0.975 g");
            ecrire(MARGE.gauche + " " + y.toFixed(2) + " " + largeurUtile.toFixed(2) + " " +
                   hauteurLigne.toFixed(2) + " re f");
          }
          var x = MARGE.gauche;
          ligne.forEach(function (cellule, i) {
            var valeur = String(cellule === null || cellule === undefined ? "" : cellule);
            var largeurCol = colonnes[i] - 8;
            while (mesurer(valeur, s.taille, false) > largeurCol && valeur.length > 1) {
              valeur = valeur.slice(0, -2) + "…";
            }
            ecrire("0.15 g");
            ecrire("BT /F1 " + s.taille + " Tf 1 0 0 1 " + (x + 4).toFixed(2) + " " +
                   (y + hauteurLigne * 0.32).toFixed(2) + " Tm (" + encoder(valeur) + ") Tj ET");
            x += colonnes[i];
          });
        });
        y -= 10;
        return api;
      },

      /** Assemble le fichier et renvoie un Blob. */
      blob: function () {
        if (!pages.length) nouvellePage();

        // Pied de page : numérotation, une fois le nombre de pages connu.
        var total = pages.length;
        pages.forEach(function (flux, index) {
          var libelle = (options.pied ? options.pied + "  ·  " : "") + "Page " + (index + 1) + " sur " + total;
          var l = mesurer(libelle, 8, false);
          flux.push("0.55 g");
          flux.push("BT /F1 8 Tf 1 0 0 1 " + ((A4.largeur - l) / 2).toFixed(2) + " " +
                    (MARGE.bas - 26).toFixed(2) + " Tm (" + encoder(libelle) + ") Tj ET");
        });

        var objets = [];
        function ajouter(contenu) { objets.push(contenu); return objets.length; }

        var idPages = 1;                       // réservé, rempli plus bas
        objets.push("");                       // objet 1 : arbre des pages
        var idPolice = ajouter("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
        var idPoliceGrasse = ajouter("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

        var idsPages = [];
        pages.forEach(function (flux) {
          var contenu = flux.join("\n");
          var idFlux = ajouter("<< /Length " + contenu.length + " >>\nstream\n" + contenu + "\nendstream");
          var idPage = ajouter(
            "<< /Type /Page /Parent " + idPages + " 0 R " +
            "/MediaBox [0 0 " + A4.largeur.toFixed(2) + " " + A4.hauteur.toFixed(2) + "] " +
            "/Resources << /Font << /F1 " + idPolice + " 0 R /F2 " + idPoliceGrasse + " 0 R >> >> " +
            "/Contents " + idFlux + " 0 R >>");
          idsPages.push(idPage);
        });

        objets[idPages - 1] = "<< /Type /Pages /Count " + idsPages.length + " /Kids [" +
          idsPages.map(function (i) { return i + " 0 R"; }).join(" ") + "] >>";

        var idInfo = ajouter("<< /Title (" + encoder(options.titre || "Document") + ") " +
                             "/Creator (Prof EPS+) /Producer (Prof EPS+) >>");
        var idCatalogue = ajouter("<< /Type /Catalog /Pages " + idPages + " 0 R >>");

        var sortie = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
        var positions = [];
        objets.forEach(function (contenu, i) {
          positions.push(sortie.length);
          sortie += (i + 1) + " 0 obj\n" + contenu + "\nendobj\n";
        });

        var positionXref = sortie.length;
        sortie += "xref\n0 " + (objets.length + 1) + "\n0000000000 65535 f \n";
        positions.forEach(function (p) {
          sortie += ("0000000000" + p).slice(-10) + " 00000 n \n";
        });
        sortie += "trailer\n<< /Size " + (objets.length + 1) + " /Root " + idCatalogue +
                  " 0 R /Info " + idInfo + " 0 R >>\nstartxref\n" + positionXref + "\n%%EOF";

        var octets = new Uint8Array(sortie.length);
        for (var i = 0; i < sortie.length; i++) octets[i] = sortie.charCodeAt(i) & 0xFF;
        return new Blob([octets], { type: "application/pdf" });
      }
    };

    return api;
  }

  global.PDF = { document: document_, mesurer: mesurer };
})(window);
