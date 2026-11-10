/* =====================================================================
   speech.js — dictée vocale
   Remplace Vosk (modèle hors ligne de 50 Mo) par la reconnaissance
   vocale intégrée au navigateur : rien à installer sur le téléphone.
   ===================================================================== */
(function (global) {
  "use strict";

  var Moteur = global.SpeechRecognition || global.webkitSpeechRecognition || null;
  var session = null;

  var Voix = {

    /** La reconnaissance vocale est-elle utilisable ici ? */
    disponible: function () { return !!Moteur; },

    /**
     * Démarre l'écoute.
     * @param {Object} options
     *   - surTexte(texteFinal)       : appelé une fois la phrase terminée
     *   - surApercu(texteProvisoire) : transcription en direct
     *   - surFin()                   : écoute terminée (quelle qu'en soit la cause)
     *   - surErreur(message)         : erreur explicite
     *   - continu                    : true pour une dictée longue
     */
    demarrer: function (options) {
      options = options || {};
      if (!Moteur) {
        if (options.surErreur) options.surErreur("Ce navigateur ne gère pas la dictée vocale.");
        return null;
      }
      Voix.arreter();

      var reco = new Moteur();
      reco.lang = "fr-FR";
      reco.continuous = !!options.continu;
      reco.interimResults = true;
      reco.maxAlternatives = 1;

      var acquis = "";

      reco.onresult = function (e) {
        var provisoire = "";
        for (var i = e.resultIndex; i < e.results.length; i++) {
          var extrait = e.results[i][0].transcript;
          if (e.results[i].isFinal) acquis += extrait + " ";
          else provisoire += extrait;
        }
        if (options.surApercu) options.surApercu((acquis + provisoire).trim());
      };

      reco.onerror = function (e) {
        var messages = {
          "no-speech": "Aucune parole détectée.",
          "audio-capture": "Micro introuvable.",
          "not-allowed": "Accès au micro refusé. Autorisez-le dans les réglages du navigateur.",
          "service-not-allowed": "Service de reconnaissance vocale indisponible.",
          "network": "La dictée nécessite une connexion internet."
        };
        if (options.surErreur && e.error !== "aborted") {
          options.surErreur(messages[e.error] || "Dictée interrompue.");
        }
      };

      reco.onend = function () {
        session = null;
        var texte = acquis.trim();
        if (texte && options.surTexte) options.surTexte(texte);
        if (options.surFin) options.surFin();
      };

      try {
        reco.start();
        session = reco;
      } catch (e) {
        if (options.surErreur) options.surErreur("Impossible de démarrer la dictée.");
        return null;
      }
      return reco;
    },

    arreter: function () {
      if (session) {
        try { session.stop(); } catch (e) {}
        session = null;
      }
    },

    enCours: function () { return !!session; }
  };

  global.Voix = Voix;
})(window);
