/* =====================================================================
   seed.js — base de démarrage
   Fiches d'EXEMPLE, à personnaliser : elles servent à montrer le
   fonctionnement de la reconnaissance par mots-clés dès la première
   ouverture. Elles ne remplacent pas les textes officiels du programme.
   ===================================================================== */
(function (global) {
  "use strict";

  var COMPETENCES = [
    {
      apsa: "Handball", cycle: "Cycle 4",
      contenuPrioritaire: "Créer et exploiter le déséquilibre pour progresser vers la cible",
      motsCles: "passe, démarquage, contre-attaque, montée de balle, tir, appui, soutien",
      competence: "Se rendre disponible pour recevoir le ballon dans un espace libre, puis enchaîner une prise de décision (passer, dribbler, tirer) adaptée au rapport de force.",
      attenduAssocie: "Réaliser des choix pertinents en attaque pour faire progresser le ballon vers la cible et marquer, dans le respect des règles."
    },
    {
      apsa: "Basket-ball", cycle: "Cycle 4",
      contenuPrioritaire: "Passer d'un jeu direct à un jeu construit",
      motsCles: "dribble, tir en course, passe, écran, rebond, contre-attaque",
      competence: "Utiliser le dribble et la passe à bon escient pour conserver le ballon et créer une situation de tir favorable.",
      attenduAssocie: "S'organiser collectivement pour progresser vers la cible et marquer, en tenant son rôle de joueur et d'arbitre."
    },
    {
      apsa: "Badminton", cycle: "Cycle 4",
      contenuPrioritaire: "Rompre l'échange par la variation des trajectoires",
      motsCles: "service, dégagement, amorti, smash, replacement, volant, montante-descendante",
      competence: "Construire le point en faisant varier la longueur et la hauteur des trajectoires pour déplacer l'adversaire.",
      attenduAssocie: "Réaliser des choix tactiques pour rompre l'échange à son avantage, en assumant les rôles de joueur, d'arbitre et d'observateur."
    },
    {
      apsa: "Demi-fond", cycle: "Cycle 4",
      contenuPrioritaire: "Gérer son allure pour produire la meilleure performance",
      motsCles: "vma, allure, régularité, endurance, récupération, foulée, projet de course",
      competence: "Établir puis tenir un projet de course en régulant son allure sur la durée de l'effort.",
      attenduAssocie: "Gérer son effort pour réaliser la meilleure performance possible sur une distance donnée et respecter son contrat de course."
    },
    {
      apsa: "Gymnastique", cycle: "Cycle 4",
      contenuPrioritaire: "Concevoir et présenter un enchaînement maîtrisé",
      motsCles: "enchaînement, roulade, atr, renversement, sol, alignement, parade, sécurité",
      competence: "Composer et réaliser un enchaînement en maîtrisant l'alignement segmentaire et la sécurité de soi et d'autrui.",
      attenduAssocie: "Présenter devant un public un enchaînement maîtrisé et l'apprécier à l'aide de critères simples."
    },
    {
      apsa: "Acrosport", cycle: "Cycle 4",
      contenuPrioritaire: "Construire des figures collectives sûres et esthétiques",
      motsCles: "pyramide, porteur, voltigeur, aide, montage, démontage, alignement, sécurité",
      competence: "Tenir les rôles de porteur, voltigeur et aide en assurant la sécurité au montage comme au démontage.",
      attenduAssocie: "Présenter une chorégraphie collective intégrant des figures maîtrisées et les apprécier avec des critères partagés."
    },
    {
      apsa: "Escalade", cycle: "Cycle 4",
      contenuPrioritaire: "Se déplacer en sécurité en économisant son énergie",
      motsCles: "assurage, encordement, voie, prise, grimpe, relais, nœud de huit, parade",
      competence: "Grimper en sécurité en maîtrisant la chaîne d'assurage et en choisissant un itinéraire adapté à ses ressources.",
      attenduAssocie: "Réaliser un itinéraire en toute sécurité, pour soi et pour autrui, en assumant les rôles de grimpeur et d'assureur."
    },
    {
      apsa: "Danse", cycle: "Cycle 4",
      contenuPrioritaire: "Composer et interpréter devant un public",
      motsCles: "chorégraphie, espace, énergie, temps, mémorisation, interprétation, regard",
      competence: "Mobiliser l'espace, le temps et l'énergie pour donner à voir une intention chorégraphique.",
      attenduAssocie: "Présenter une chorégraphie devant un public et porter un regard critique constructif sur les prestations."
    },
    {
      apsa: "Handball", cycle: "Cycle 3",
      contenuPrioritaire: "Se reconnaître attaquant / défenseur",
      motsCles: "passe, réception, dribble, cible, défenseur, attaquant, espace libre",
      competence: "Identifier son rôle dans le jeu et transmettre le ballon à un partenaire démarqué.",
      attenduAssocie: "S'organiser tactiquement pour gagner le duel ou le match en respectant les règles et les autres."
    },
    {
      apsa: "Athlétisme", cycle: "Cycle 3",
      contenuPrioritaire: "Mesurer et comparer ses performances",
      motsCles: "course, vitesse, départ, relais, saut, lancer, mesure, chronomètre",
      competence: "Combiner une course, un saut ou un lancer en mobilisant ses ressources pour réaliser une performance mesurée.",
      attenduAssocie: "Réaliser des efforts et enchaîner plusieurs actions motrices pour aller plus vite, plus haut, plus loin."
    },
    {
      apsa: "Natation", cycle: "Cycle 3",
      contenuPrioritaire: "Se déplacer longtemps en milieu aquatique",
      motsCles: "coulée, respiration, immersion, propulsion, glisse, virage, nage",
      competence: "Enchaîner immersion, déplacement et respiration pour nager sans interruption sur une distance donnée.",
      attenduAssocie: "Se déplacer dans l'eau sur une distance de 30 mètres sans aide à la flottaison et sans reprise d'appuis."
    },
    {
      apsa: "Musculation", cycle: "Lycée Général",
      contenuPrioritaire: "Construire et conduire un projet d'entraînement personnalisé",
      motsCles: "charge, série, répétition, récupération, échauffement, mobile, placement, respiration",
      competence: "Choisir et réguler des paramètres d'effort cohérents avec le mobile d'entraînement retenu.",
      attenduAssocie: "S'engager dans un programme personnalisé, en assurer la sécurité et analyser ses effets."
    }
  ];

  var ATTENDUS = [
    { apsa: "Handball",     cycle: "Cycle 4", attendu: "S'organiser collectivement pour créer et exploiter le déséquilibre, en assurant les rôles de joueur, d'arbitre et d'observateur." },
    { apsa: "Basket-ball",  cycle: "Cycle 4", attendu: "Réaliser des choix tactiques pertinents pour faire progresser le ballon et marquer, en respectant les règles et les partenaires." },
    { apsa: "Badminton",    cycle: "Cycle 4", attendu: "Rompre l'échange à son avantage par des trajectoires variées, en tenant les rôles de joueur, d'arbitre et de coach." },
    { apsa: "Demi-fond",    cycle: "Cycle 4", attendu: "Réaliser la meilleure performance possible en gérant son allure et en respectant son projet de course." },
    { apsa: "Gymnastique",  cycle: "Cycle 4", attendu: "Présenter un enchaînement maîtrisé devant un public et apprécier les prestations avec des critères partagés." },
    { apsa: "Escalade",     cycle: "Cycle 4", attendu: "Réaliser un itinéraire en sécurité, pour soi et pour autrui, en maîtrisant la chaîne d'assurage." },
    { apsa: "Handball",     cycle: "Cycle 3", attendu: "S'organiser tactiquement pour gagner le duel ou le match, en respectant les règles et les autres joueurs." },
    { apsa: "Athlétisme",   cycle: "Cycle 3", attendu: "Réaliser des efforts et enchaîner plusieurs actions motrices pour aller plus vite, plus haut, plus loin." },
    { apsa: "Natation",     cycle: "Cycle 3", attendu: "Se déplacer dans l'eau sur une distance de 30 mètres sans aide à la flottaison et sans reprise d'appuis." }
  ];

  /**
   * Remplit la base la première fois seulement.
   * Le professeur peut ensuite tout modifier ou supprimer.
   */
  function initialiser() {
    var reglages = Store.reglages();
    if (reglages.baseInitialisee) return false;
    if (Store.competences.compter() > 0 || Store.attendus.compter() > 0) {
      Store.majReglages({ baseInitialisee: true });
      return false;
    }
    COMPETENCES.forEach(function (c) { Store.competences.ajouter(Object.assign({ exemple: true }, c)); });
    ATTENDUS.forEach(function (a) { Store.attendus.ajouter(Object.assign({ exemple: true }, a)); });
    Store.majReglages({ baseInitialisee: true });
    return true;
  }

  /** Réinjecte les exemples (bouton des réglages). */
  function reinjecter() {
    COMPETENCES.forEach(function (c) { Store.competences.ajouter(Object.assign({ exemple: true }, c)); });
    ATTENDUS.forEach(function (a) { Store.attendus.ajouter(Object.assign({ exemple: true }, a)); });
    return COMPETENCES.length + ATTENDUS.length;
  }

  global.Seed = { initialiser: initialiser, reinjecter: reinjecter,
                  competences: COMPETENCES, attendus: ATTENDUS };
})(window);
