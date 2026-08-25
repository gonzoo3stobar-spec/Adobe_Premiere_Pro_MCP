---
name: youtube-script-prompting
description: Schreibe YouTube-Scripts mit hoher Watchtime und Zuschauerbindung nach bewährten Creator-Frameworks. Verwende diesen Skill, wenn der User ein YouTube-Script, Outline, Hook, Titelideen, Thumbnail-Text, B-Roll-Vorschläge oder Retention-Marker für ein Video möchte — oder fragt, wie man Claude dafür richtig promptet.
---

# YouTube Script Prompting

Dieser Skill definiert, wie YouTube-Scripts geschrieben werden: nicht als generischer Text, sondern wie bei großen Creators — mit klarer Rolle, messbarem Ziel, Zielgruppe, Regeln und Struktur.

## Warum "Schreibe ein YouTube-Video über ..." nicht reicht

Ein Prompt ohne Rolle, Ziel, Zielgruppe und Regeln erzeugt austauschbare Scripts ohne Spannungsbogen. Gute Scripts entstehen, wenn jeder dieser Bausteine explizit gesetzt ist. Fehlt einer davon in der Anfrage des Users, frage kurz nach oder setze eine sinnvolle Annahme und benenne sie.

## Kernprinzipien beim Schreiben

Wenn du ein Script schreibst, arbeite immer als Top-YouTube-Scriptwriter mit einem Ziel: **Watchtime und Zuschauerbindung maximieren.**

Regeln für jedes Script:

- Starker Hook in den ersten 15 Sekunden
- Alle 30–60 Sekunden neue Neugier erzeugen (offene Schleifen, Fragen, Teaser)
- Keine Füllwörter
- Kurze Sätze
- Keine Wiederholungen
- Cliffhanger vor jedem neuen Abschnitt
- Erzähle wie ein Mensch, nicht wie eine KI

Standard-Struktur:

1. Hook
2. Problem
3. Überraschung
4. Lösung
5. Payoff
6. Call to Action

**Outline zuerst.** Erstelle immer erst das Outline und lass es den User freigeben, bevor du das komplette Script ausformulierst. Das spart Iterationen und hält die Struktur unter Kontrolle.

## Basis-Template

```text
Du bist ein Top-YouTube-Scriptwriter.

Deine Aufgabe:
Maximiere Watchtime und Zuschauerbindung.

Zielgruppe:
[TARGET]

Videolänge:
[LÄNGE, z. B. 12 Minuten]

Regeln:

- Starker Hook in den ersten 15 Sekunden
- Alle 30-60 Sekunden neue Neugier erzeugen
- Keine Füllwörter
- Kurze Sätze
- Keine Wiederholungen
- Cliffhanger vor jedem neuen Abschnitt
- Erzähle wie ein Mensch, nicht wie eine KI

Struktur:

1. Hook
2. Problem
3. Überraschung
4. Lösung
5. Payoff
6. Call to Action

Erstelle zunächst nur das Outline.
```

## Produzenten-Modus: Framework vor Script

Noch besser als direkt zu schreiben: erst analysieren, dann schreiben. Statt "Schreib ein Script" arbeite in zwei Schritten:

```text
Analysiere die erfolgreichsten Videos
von [CREATOR 1], [CREATOR 2] und [CREATOR 3].

Welche Mechanismen sorgen für hohe Watchtime?

Erstelle daraus ein Framework.

Nutze dieses Framework für mein Video.
```

Typische Mechanismen, die dabei herauskommen und die du aktiv einsetzen sollst:

- **Frontloading:** Das Versprechen des Videos in den ersten Sekunden zeigen, nicht ankündigen
- **Open Loops:** Fragen aufmachen und erst später schließen
- **Stakes:** Warum es für den Protagonisten (und Zuschauer) etwas zu verlieren gibt
- **Progression:** Sichtbarer Fortschritt in Etappen (Tag 1 → Tag 30, Level 1 → Endgegner)
- **Pattern Interrupts:** Ortswechsel, Perspektivwechsel, unerwartete Wendungen als Schnittpunkte

## Komplett-Paket: Head-Writer-Template

Für ein vollständiges Video-Paket (nicht nur Script) nutze dieses Format:

```text
Du bist Head Writer eines
1-Millionen-Abonnenten-Kanals im Bereich [NISCHE].

Thema:
[THEMA]

Ziel:
Hohe Zuschauerbindung.

Erstelle:

1. Titelideen
2. Thumbnail-Text
3. Hook
4. Complete YouTube Script
5. B-Roll Vorschläge
6. Schnitteffekte
7. Zuschauer-Retention-Marker
```

Liefere die sieben Punkte in genau dieser Reihenfolge:

1. **Titelideen** — 5–10 Varianten, kurz, mit Neugier-Lücke oder Konflikt
2. **Thumbnail-Text** — maximal 3–5 Wörter, ergänzt den Titel statt ihn zu wiederholen
3. **Hook** — die ersten 15 Sekunden wörtlich ausformuliert
4. **Complete YouTube Script** — vollständiges Sprechscript nach den Kernprinzipien oben
5. **B-Roll Vorschläge** — konkrete Shots pro Abschnitt (was ist im Bild, welche Perspektive)
6. **Schnitteffekte** — pro Abschnitt: Cuts, Zooms, Speed-Ramps, Texteinblendungen, Sound-Cues
7. **Zuschauer-Retention-Marker** — Timestamps, an denen ein neuer Neugier-Impuls sitzt, mit kurzer Begründung

## Beispiel-Nische: Tennis-Kanal

Bewährte Themenformate für einen Tennis-Kanal (übertragbar auf andere Sport-Nischen):

- "Warum ich gegen schwächere Spieler verliere"
- "Der größte Fehler beim Aufschlag"
- "Ich trainierte 30 Tage nur Beinarbeit"
- "LK 21 gegen Tennissenioren"

Gemeinsam ist ihnen: persönlicher Konflikt, klare Stakes, ein Experiment oder eine unbequeme Wahrheit — genau die Zutaten, die die Frameworks oben verlangen.

Beispiel-Prompt dafür:

```text
Du bist Head Writer eines
1-Millionen-Abonnenten-Sportkanals.

Thema:
Warum ich gegen Spieler verliere,
die technisch schlechter sind als ich.

Ziel:
Hohe Zuschauerbindung.

Erstelle:

1. Titelideen
2. Thumbnail-Text
3. Hook
4. Complete YouTube Script
5. B-Roll Vorschläge
6. Schnitteffekte
7. Zuschauer-Retention-Marker
```

## Übergabe an den Schnitt (Premiere Pro MCP)

Die Punkte 5–7 des Komplett-Pakets sind direkt für den Schnitt gedacht. Wenn der Adobe Premiere Pro MCP verfügbar ist (Skill `premiere-pro-mcp`):

- Nutze die **B-Roll-Vorschläge** als Import- und Platzierungsliste (`import_media`, Clips auf die Sequenz setzen)
- Setze die **Retention-Marker** als Sequenz-Marker an den genannten Timestamps
- Setze die **Schnitteffekte** pro Abschnitt mit den passenden Effekt-Tools um

So wird aus dem Script-Paket ohne Medienbruch ein Rohschnitt.

## Qualitätskontrolle

Vor der Abgabe eines Scripts prüfe:

- Klingt der Text gesprochen natürlich? (Laut-Lese-Test: keine Schachtelsätze, keine KI-Floskeln)
- Sitzt alle 30–60 Sekunden ein neuer Neugier-Impuls?
- Endet jeder Abschnitt mit einem Grund weiterzuschauen?
- Löst der Payoff das Versprechen des Hooks tatsächlich ein?

Wenn ein Anti-Slop- oder Script-Bereinigungs-Skill verfügbar ist, lasse das fertige Script als letzten Schritt dadurch laufen.
