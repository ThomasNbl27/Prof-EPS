/* =====================================================================
   ics.js — lecture et écriture de fichiers calendrier (.ics, RFC 5545)
   C'est le pont avec le calendrier de l'iPad ou du téléphone : chaque
   événement exporté embarque ses deux alarmes (la veille et 3 h avant),
   que le calendrier du système affichera même application fermée.
   ===================================================================== */
(function (global) {
  "use strict";

  /* ---------- Écriture ---------- */

  function echapperTexte(s) {
    return String(s || "")
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\r?\n/g, "\\n");
  }

  /** Replie les lignes longues (75 octets max, RFC 5545). */
  function plier(ligne) {
    var morceaux = [];
    while (ligne.length > 73) {
      morceaux.push(ligne.slice(0, 73));
      ligne = " " + ligne.slice(73);
    }
    morceaux.push(ligne);
    return morceaux.join("\r\n");
  }

  function deuxChiffres(n) { return String(n).padStart(2, "0"); }

  /** "2026-03-12" + "17:30" -> "20260312T173000" (heure locale flottante). */
  function horodatageLocal(dateISO, heure) {
    var d = dateISO.replace(/-/g, "");
    if (!heure) return d;
    var h = heure.split(":");
    return d + "T" + deuxChiffres(h[0]) + deuxChiffres(h[1]) + "00";
  }

  function horodatageUTC(d) {
    return d.getUTCFullYear() + deuxChiffres(d.getUTCMonth() + 1) + deuxChiffres(d.getUTCDate()) +
      "T" + deuxChiffres(d.getUTCHours()) + deuxChiffres(d.getUTCMinutes()) +
      deuxChiffres(d.getUTCSeconds()) + "Z";
  }

  /** Fin d'événement : début + durée en minutes. */
  function finLocale(dateISO, heure, dureeMin) {
    var d = U.depuisISO(dateISO);
    var h = (heure || "00:00").split(":");
    d.setHours(Number(h[0]), Number(h[1]) + (Number(dureeMin) || 60), 0, 0);
    return horodatageLocal(U.versISO(d),
      deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes()));
  }

  function blocEvenement(evt) {
    var lignes = [
      "BEGIN:VEVENT",
      "UID:" + (evt.id || U.uid()) + "@jarvis-eps",
      "DTSTAMP:" + horodatageUTC(new Date())
    ];

    if (evt.heure) {
      lignes.push("DTSTART:" + horodatageLocal(evt.date, evt.heure));
      lignes.push("DTEND:" + finLocale(evt.date, evt.heure, evt.duree));
    } else {
      // Journée entière : DTEND exclusif au lendemain.
      var lendemain = U.depuisISO(evt.date);
      lendemain.setDate(lendemain.getDate() + 1);
      lignes.push("DTSTART;VALUE=DATE:" + horodatageLocal(evt.date, ""));
      lignes.push("DTEND;VALUE=DATE:" + horodatageLocal(U.versISO(lendemain), ""));
    }

    lignes.push("SUMMARY:" + echapperTexte(evt.titre));
    if (evt.lieu) lignes.push("LOCATION:" + echapperTexte(evt.lieu));
    if (evt.notes) lignes.push("DESCRIPTION:" + echapperTexte(evt.notes));

    // Les deux rappels demandés : la veille, puis 3 heures avant.
    if (evt.rappelVeille !== false) {
      lignes.push("BEGIN:VALARM", "ACTION:DISPLAY",
        "DESCRIPTION:" + echapperTexte("Demain : " + evt.titre),
        "TRIGGER:-P1D", "END:VALARM");
    }
    if (evt.rappel3h !== false && evt.heure) {
      lignes.push("BEGIN:VALARM", "ACTION:DISPLAY",
        "DESCRIPTION:" + echapperTexte("Dans 3 heures : " + evt.titre),
        "TRIGGER:-PT3H", "END:VALARM");
    }

    lignes.push("END:VEVENT");
    return lignes;
  }

  function exporter(evenements, nomCalendrier) {
    var lignes = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Prof EPS+//FR",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:" + echapperTexte(nomCalendrier || "Prof EPS+")
    ];
    evenements.forEach(function (evt) { lignes = lignes.concat(blocEvenement(evt)); });
    lignes.push("END:VCALENDAR");
    return lignes.map(plier).join("\r\n") + "\r\n";
  }

  /* ---------- Lecture ---------- */

  function desechapper(s) {
    return String(s || "")
      .replace(/\\n/gi, "\n")
      .replace(/\\,/g, ",")
      .replace(/\\;/g, ";")
      .replace(/\\\\/g, "\\");
  }

  /**
   * Analyse un fichier .ics et renvoie des événements au format de l'app.
   * Tolérant : ignore ce qu'il ne connaît pas, ne développe pas les
   * récurrences (seule la première occurrence est reprise).
   */
  function analyser(texte) {
    var lignes = String(texte).replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

    // Dépliage : une ligne qui commence par un espace continue la précédente.
    var depliees = [];
    lignes.forEach(function (l) {
      if (/^[ \t]/.test(l) && depliees.length) depliees[depliees.length - 1] += l.slice(1);
      else depliees.push(l);
    });

    var bruts = [];
    var courant = null;
    depliees.forEach(function (l) {
      if (/^BEGIN:VEVENT/i.test(l)) { courant = {}; return; }
      if (/^END:VEVENT/i.test(l)) { if (courant) bruts.push(courant); courant = null; return; }
      if (!courant) return;
      var i = l.indexOf(":");
      if (i === -1) return;
      var cle = l.slice(0, i);
      var nom = cle.split(";")[0].toUpperCase();
      // On garde la première occurrence de chaque propriété.
      if (!courant[nom]) courant[nom] = { valeur: l.slice(i + 1), parametres: cle.toUpperCase() };
    });

    return bruts.map(convertir).filter(Boolean);
  }

  function convertir(brut) {
    if (!brut.DTSTART) return null;
    var debut = lireDate(brut.DTSTART);
    if (!debut) return null;

    var evt = {
      titre: desechapper(brut.SUMMARY ? brut.SUMMARY.valeur : "").trim() || "Événement",
      date: debut.date,
      heure: debut.heure,
      lieu: desechapper(brut.LOCATION ? brut.LOCATION.valeur : "").trim(),
      notes: desechapper(brut.DESCRIPTION ? brut.DESCRIPTION.valeur : "").trim(),
      uid: brut.UID ? brut.UID.valeur.trim() : "",
      recurrent: !!brut.RRULE
    };

    if (brut.DTEND && debut.heure) {
      var fin = lireDate(brut.DTEND);
      if (fin && fin.heure && fin.date === debut.date) {
        var minutes = (Number(fin.heure.slice(0, 2)) * 60 + Number(fin.heure.slice(3))) -
                      (Number(debut.heure.slice(0, 2)) * 60 + Number(debut.heure.slice(3)));
        if (minutes > 0) evt.duree = minutes;
      }
    }
    return evt;
  }

  /** DTSTART sous ses formes courantes -> { date: "AAAA-MM-JJ", heure: "HH:MM" | "" } */
  function lireDate(prop) {
    var v = prop.valeur.trim();

    // Journée entière : 20260312
    var mJour = v.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (mJour || /VALUE=DATE(?![-])/.test(prop.parametres)) {
      var mj = mJour || v.match(/^(\d{4})(\d{2})(\d{2})/);
      if (!mj) return null;
      return { date: mj[1] + "-" + mj[2] + "-" + mj[3], heure: "" };
    }

    var m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
    if (!m) return null;

    if (m[7]) {
      // Heure UTC : conversion en heure locale de l'appareil.
      var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)));
      return {
        date: U.versISO(d),
        heure: deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes())
      };
    }
    // Heure locale (avec ou sans TZID) : reprise telle quelle.
    return { date: m[1] + "-" + m[2] + "-" + m[3], heure: m[4] + ":" + m[5] };
  }

  global.ICS = { exporter: exporter, analyser: analyser };
})(window);
