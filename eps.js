/* =====================================================================
   eps.js — logique pédagogique
   Portage (et fiabilisation) des fonctions trouver_cycle / analyser_seance
   et de la mise en correspondance contenu <-> compétences par mots-clés.
   ===================================================================== */
(function (global) {
  "use strict";

  /* ---------- Référentiels ---------- */

  var CYCLES = ["Cycle 3", "Cycle 4", "Lycée Général", "Lycée Pro"];

  var CHAMPS = {
    CA1: "CA1 — Produire une performance optimale, mesurable à échéance donnée",
    CA2: "CA2 — Adapter son déplacement à des environnements variés",
    CA3: "CA3 — S'exprimer devant les autres par une prestation artistique ou acrobatique",
    CA4: "CA4 — Conduire et maîtriser un affrontement collectif ou interindividuel"
  };

  /* Chaque APSA : nom affiché, variantes reconnues à l'oral, champ d'apprentissage. */
  var APSA = [
    { nom: "Handball",         champ: "CA4", alias: ["handball", "hand ball", "hand"] },
    { nom: "Football",         champ: "CA4", alias: ["football", "foot"] },
    { nom: "Basket-ball",      champ: "CA4", alias: ["basket-ball", "basketball", "basket"] },
    { nom: "Volley-ball",      champ: "CA4", alias: ["volley-ball", "volleyball", "volley"] },
    { nom: "Rugby",            champ: "CA4", alias: ["rugby"] },
    { nom: "Ultimate",         champ: "CA4", alias: ["ultimate", "frisbee"] },
    { nom: "Badminton",        champ: "CA4", alias: ["badminton", "badmington", "bad"] },
    { nom: "Tennis de table",  champ: "CA4", alias: ["tennis de table", "ping-pong", "ping pong", "tennis-de-table"] },
    { nom: "Tennis",           champ: "CA4", alias: ["tennis"] },
    { nom: "Judo",             champ: "CA4", alias: ["judo"] },
    { nom: "Lutte",            champ: "CA4", alias: ["lutte"] },
    { nom: "Boxe française",   champ: "CA4", alias: ["boxe francaise", "savate", "boxe"] },
    { nom: "Athlétisme",       champ: "CA1", alias: ["athletisme", "athle"] },
    { nom: "Demi-fond",        champ: "CA1", alias: ["demi-fond", "demi fond", "endurance", "course longue"] },
    { nom: "Vitesse-relais",   champ: "CA1", alias: ["vitesse-relais", "relais", "sprint", "vitesse"] },
    { nom: "Saut en longueur", champ: "CA1", alias: ["saut en longueur", "longueur"] },
    { nom: "Saut en hauteur",  champ: "CA1", alias: ["saut en hauteur", "hauteur"] },
    { nom: "Lancer",           champ: "CA1", alias: ["lancer", "javelot", "poids", "disque"] },
    { nom: "Natation",         champ: "CA1", alias: ["natation", "piscine", "nage"] },
    { nom: "Musculation",      champ: "CA1", alias: ["musculation", "muscu", "renforcement musculaire"] },
    { nom: "Escalade",         champ: "CA2", alias: ["escalade", "grimpe", "mur d'escalade"] },
    { nom: "Course d'orientation", champ: "CA2", alias: ["course d'orientation", "orientation", "raid"] },
    { nom: "VTT",              champ: "CA2", alias: ["vtt", "velo", "cyclisme"] },
    { nom: "Sauvetage",        champ: "CA2", alias: ["sauvetage"] },
    { nom: "Gymnastique",      champ: "CA3", alias: ["gymnastique", "gym", "agres"] },
    { nom: "Acrosport",        champ: "CA3", alias: ["acrosport", "acro sport", "acro"] },
    { nom: "Danse",            champ: "CA3", alias: ["danse", "chorégraphie", "choregraphie"] },
    { nom: "Arts du cirque",   champ: "CA3", alias: ["arts du cirque", "cirque", "jonglage"] },
    { nom: "Step",             champ: "CA3", alias: ["step"] }
  ];

  var MOIS_NOMS = {
    janvier: 0, fevrier: 1, mars: 2, avril: 3, mai: 4, juin: 5,
    juillet: 6, aout: 7, septembre: 8, octobre: 9, novembre: 10, decembre: 11
  };
  var JOURS_NOMS = { dimanche: 0, lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6 };

  var NIVEAUX = {
    "six": "6", "sixieme": "6", "6eme": "6", "6e": "6",
    "cinq": "5", "cinquieme": "5", "5eme": "5", "5e": "5",
    "quatre": "4", "quatrieme": "4", "4eme": "4", "4e": "4",
    "trois": "3", "troisieme": "3", "3eme": "3", "3e": "3",
    "seconde": "2", "2nde": "2", "deuxieme": "2",
    "premiere": "1", "1ere": "1"
  };

  /* ---------- Cycle à partir de la classe ---------- */

  /**
   * "6B" -> Cycle 3 · "4C" -> Cycle 4 · "2nde 5" -> Lycée Général
   * "1 CAP MEC" -> Lycée Pro · "Tale STMG" -> Lycée Général
   */
  function trouverCycle(classe) {
    var c = U.normaliser(classe).trim();
    if (!c) return "";

    // Voies professionnelles : prioritaires car elles contiennent aussi des chiffres.
    if (/\b(pro|cap|bac pro|mrc|melec|assp|gatl|mec)\b/.test(c)) return "Lycée Pro";
    if (/\b(terminale|term|tale|tle|t)\b/.test(c) && !/\d/.test(c)) return "Lycée Général";
    if (/\b(gt|general|generale|techno|technologique|stmg|sti2d|st2s)\b/.test(c)) return "Lycée Général";
    if (/\b(cm1|cm2)\b/.test(c)) return "Cycle 3";

    var mot = (c.match(/[a-z]+/) || [""])[0];
    var niveau = NIVEAUX[mot] || (c.match(/\d+/) || [""])[0];

    switch (String(niveau)) {
      case "6": return "Cycle 3";
      case "5":
      case "4":
      case "3": return "Cycle 4";
      case "2":
      case "1":
      case "0": return "Lycée Général";
      default: return "";
    }
  }

  /* ---------- Reconnaissance d'une APSA ---------- */

  function fichesAPSA() { return APSA.slice(); }

  function listeNomsAPSA() {
    return APSA.map(function (a) { return a.nom; });
  }

  function champDeAPSA(nom) {
    var n = U.normaliser(nom);
    var trouve = APSA.filter(function (a) {
      return U.normaliser(a.nom) === n || a.alias.indexOf(n) !== -1;
    })[0];
    return trouve ? CHAMPS[trouve.champ] : "";
  }

  /** Repère l'APSA citée dans une phrase ; renvoie le nom officiel ou "". */
  function detecterAPSA(texte) {
    var t = U.normaliser(texte);
    var meilleur = null, meilleurePos = -1, meilleureLongueur = 0;

    APSA.forEach(function (apsa) {
      apsa.alias.concat([U.normaliser(apsa.nom)]).forEach(function (alias) {
        var motif = new RegExp("(^|[^a-z])" + echapperRegex(U.normaliser(alias)) + "([^a-z]|$)");
        var m = motif.exec(t);
        if (!m) return;
        // À position égale, l'alias le plus long gagne ("tennis de table" > "tennis").
        if (alias.length > meilleureLongueur || (meilleur === null)) {
          if (alias.length >= meilleureLongueur) {
            meilleur = apsa.nom;
            meilleurePos = m.index;
            meilleureLongueur = alias.length;
          }
        }
      });
    });
    return meilleur || "";
  }

  function echapperRegex(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /* ---------- Analyse d'une dictée ---------- */

  /**
   * Transforme une phrase dictée en champs de séance.
   * Ex. : "Ajoute une séance aujourd'hui pour les 5C en handball,
   *        travail sur la passe et le démarquage, pas d'observation."
   */
  function analyserSeance(texte) {
    var resultat = { date: "", classe: "", activite: "", contenu: "", observations: "" };
    if (!texte || !texte.trim()) return resultat;

    var brut = String(texte).trim();
    var t = U.normaliser(brut);
    var restant = brut;

    /* --- 1. Date --- */
    var dateTrouvee = "";
    var mDate;

    if (/aujourd'?hui/.test(t)) {
      dateTrouvee = U.aujourdhui();
      restant = restant.replace(/aujourd'?hui/i, " ");
    } else if (/\bhier\b/.test(t)) {
      dateTrouvee = decalerJours(-1);
      restant = restant.replace(/\bhier\b/i, " ");
    } else if (/\bdemain\b/.test(t)) {
      dateTrouvee = decalerJours(1);
      restant = restant.replace(/\bdemain\b/i, " ");
    } else if ((mDate = t.match(/\b(\d{1,2})\s*[\/.]\s*(\d{1,2})(?:\s*[\/.]\s*(\d{2,4}))?/))) {
      dateTrouvee = composerDate(mDate[1], Number(mDate[2]) - 1, mDate[3]);
      restant = restant.replace(/\b\d{1,2}\s*[\/.]\s*\d{1,2}(\s*[\/.]\s*\d{2,4})?/, " ");
    } else if ((mDate = t.match(/\b(?:le\s+)?(\d{1,2})(?:er)?\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)(?:\s+(\d{4}))?/))) {
      dateTrouvee = composerDate(mDate[1], MOIS_NOMS[mDate[2]], mDate[3]);
      restant = restant.replace(/\b(le\s+)?\d{1,2}(er)?\s+[a-zéûôA-Z]+(\s+\d{4})?/i, " ");
    } else {
      var mJour = t.match(/\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/);
      if (mJour) {
        dateTrouvee = dernierJourSemaine(JOURS_NOMS[mJour[1]]);
        restant = restant.replace(new RegExp("\\b" + mJour[1] + "\\b", "i"), " ");
      }
    }
    resultat.date = dateTrouvee;

    /* --- 2. Classe --- */
    var motifClasse = new RegExp(
      "(?:classe\\s+de\\s+|pour\\s+les\\s+|pour\\s+la\\s+|pour\\s+le\\s+|avec\\s+les\\s+|avec\\s+la\\s+|les\\s+|la\\s+)?" +
      "\\b(sixieme|cinquieme|quatrieme|troisieme|seconde|premiere|terminale|6eme|5eme|4eme|3eme|2nde|1ere|6e|5e|4e|3e|six|cinq|quatre|trois|[1-6])" +
      "\\s*([a-z]|\\d)?\\b", "i");
    // On cherche la classe dans ce qui reste APRÈS le retrait de la date,
    // sinon un « 12 mars » serait lu comme une classe de 1ère.
    var mClasse = motifClasse.exec(U.normaliser(restant));
    if (mClasse) {
      var niveau = NIVEAUX[mClasse[1]] || mClasse[1];
      var suffixe = (mClasse[2] || "").toUpperCase();
      if (/terminale/.test(mClasse[1])) {
        resultat.classe = ("Tale " + suffixe).trim();
      } else if (niveau === "2" || niveau === "1") {
        var libelle = niveau === "2" ? "2nde" : "1ère";
        resultat.classe = (libelle + " " + suffixe).trim();
      } else if (/^\d$/.test(suffixe)) {
        resultat.classe = niveau + "e" + suffixe;
      } else {
        resultat.classe = niveau + suffixe;
      }
      restant = retirer(restant, mClasse[0]);
    }

    /* --- 3. APSA --- */
    resultat.activite = detecterAPSA(brut);
    if (resultat.activite) {
      var fiche = APSA.filter(function (a) { return a.nom === resultat.activite; })[0];
      fiche.alias.concat([fiche.nom]).forEach(function (alias) {
        restant = restant.replace(new RegExp("\\b(en|au|du|de)\\s+" + echapperRegex(alias) + "\\b", "gi"), " ");
        restant = restant.replace(new RegExp("\\b" + echapperRegex(alias) + "\\b", "gi"), " ");
      });
    }

    /* --- 4. Observations --- */
    if (/pas d'?observation/.test(t) || /rien a signaler/.test(t)) {
      resultat.observations = "Aucune";
      restant = restant.replace(/pas d'?observations?( particuliere)?/gi, " ")
                       .replace(/rien à signaler/gi, " ");
    } else {
      var mObs = restant.match(/(?:observations?|à noter|a noter|remarque)\s*[:,]?\s*(.+)$/i);
      if (mObs && mObs[1].trim().length > 2) {
        resultat.observations = U.majuscule(mObs[1].trim());
        restant = restant.replace(mObs[0], " ");
      }
    }

    /* --- 5. Contenu : ce qu'il reste, débarrassé des formules de commande --- */
    [
      /\b(jarvis|dis donc)\b/gi,
      /^\s*(la\s+|une\s+)?s[ée]ance\s*(du|de|d'|des|le|pour)?\b/i,
      /\b(ajoute|ajouter|cr[ée]e|cr[ée]er|note|noter|enregistre|enregistrer)\s+(une\s+)?(nouvelle\s+)?s[ée]ance\b/gi,
      /\bnouvelle s[ée]ance\b/gi,
      /^\s*(et|puis|alors|donc)\b/i
    ].forEach(function (motif) { restant = restant.replace(motif, " "); });

    restant = restant
      .replace(/\s+/g, " ")
      // Prépositions devenues orphelines après le retrait de la date ou de la classe
      .replace(/\b(du|de|d'|le|la|les|en|au|avec|pour)\s*(?=[,;.]|$)/gi, " ")
      .replace(/^\s*(du|de|le|la|les|en|au|avec|pour)\b\s*/i, "")
      .replace(/\s*,\s*,+/g, ", ")
      .replace(/^[\s,;.:'-]+/, "")
      .replace(/[\s,;]+$/, "")
      .replace(/\s+/g, " ")
      .trim();

    resultat.contenu = U.majuscule(restant);
    return resultat;
  }

  function decalerJours(n) {
    var d = new Date();
    d.setDate(d.getDate() + n);
    return U.versISO(d);
  }

  function composerDate(jour, mois, annee) {
    var maintenant = new Date();
    var an = annee ? Number(annee) : maintenant.getFullYear();
    if (an < 100) an += 2000;
    var d = new Date(an, mois, Number(jour));
    return isNaN(d.getTime()) ? "" : U.versISO(d);
  }

  /** Dernière occurrence (aujourd'hui compris) du jour de semaine demandé. */
  function dernierJourSemaine(cible) {
    var d = new Date();
    var recul = (d.getDay() - cible + 7) % 7;
    d.setDate(d.getDate() - recul);
    return U.versISO(d);
  }

  function retirer(texte, extrait) {
    var i = U.normaliser(texte).indexOf(U.normaliser(extrait));
    if (i === -1) return texte;
    return texte.slice(0, i) + " " + texte.slice(i + extrait.length);
  }

  /* ---------- Correspondance contenu <-> compétences ---------- */

  /**
   * Reprend le principe du script d'origine : si l'un des mots-clés d'une
   * fiche apparaît dans le contenu de la séance, la compétence est proposée.
   * On ajoute le filtrage par cycle/APSA et le détail des mots reconnus.
   */
  function suggererCompetences(contenu, cycle, apsa) {
    var texte = U.normaliser(contenu);
    if (!texte.trim()) return [];

    return Store.competences.tous()
      .map(function (fiche) {
        // Une fiche d'un autre cycle n'est jamais proposée.
        if (cycle && fiche.cycle && U.normaliser(fiche.cycle) !== U.normaliser(cycle)) return null;

        var motsReconnus = String(fiche.motsCles || "")
          .split(/[,;]/)
          .map(function (m) { return m.trim(); })
          .filter(function (m) { return m.length >= 3; })
          .filter(function (m) { return texte.indexOf(U.normaliser(m)) !== -1; });

        var memeAPSA = apsa && fiche.apsa && U.normaliser(fiche.apsa) === U.normaliser(apsa);
        if (!motsReconnus.length && !memeAPSA) return null;

        return {
          fiche: fiche,
          motsReconnus: motsReconnus,
          memeAPSA: !!memeAPSA,
          score: motsReconnus.length * 2 + (memeAPSA ? 1 : 0)
        };
      })
      .filter(Boolean)
      .sort(function (a, b) { return b.score - a.score; });
  }

  /** Met en forme les fiches retenues, comme le faisait l'export d'origine. */
  function redigerCompetences(fiches) {
    return fiches.map(function (f) {
      var blocs = [];
      if (f.contenuPrioritaire) blocs.push("Contenu prioritaire : " + f.contenuPrioritaire.trim());
      if (f.competence) blocs.push("Compétence construite :\n" + f.competence.trim());
      if (f.attenduAssocie) blocs.push("Attendu de fin de cycle :\n" + f.attenduAssocie.trim());
      return blocs.join("\n\n");
    }).filter(Boolean).join("\n\n———\n\n");
  }

  /** Fiche APSA la plus pertinente pour un couple activité / cycle. */
  function ficheDeReference(apsa, cycle) {
    var toutes = Store.competences.tous();
    var exacte = toutes.filter(function (f) {
      return U.normaliser(f.apsa) === U.normaliser(apsa) &&
             U.normaliser(f.cycle) === U.normaliser(cycle);
    });
    if (exacte.length) return exacte[0];
    var parAPSA = toutes.filter(function (f) { return U.normaliser(f.apsa) === U.normaliser(apsa); });
    return parAPSA[0] || null;
  }

  /** Attendus de fin de cycle correspondants (base « attendus »). */
  function attendusDe(apsa, cycle) {
    return Store.attendus.tous().filter(function (a) {
      var okApsa = !apsa || !a.apsa || U.normaliser(a.apsa) === U.normaliser(apsa);
      var okCycle = !cycle || !a.cycle || U.normaliser(a.cycle) === U.normaliser(cycle);
      return okApsa && okCycle;
    });
  }

  global.EPS = {
    CYCLES: CYCLES,
    CHAMPS: CHAMPS,
    fichesAPSA: fichesAPSA,
    listeNomsAPSA: listeNomsAPSA,
    champDeAPSA: champDeAPSA,
    detecterAPSA: detecterAPSA,
    trouverCycle: trouverCycle,
    analyserSeance: analyserSeance,
    suggererCompetences: suggererCompetences,
    redigerCompetences: redigerCompetences,
    ficheDeReference: ficheDeReference,
    attendusDe: attendusDe
  };
})(window);
