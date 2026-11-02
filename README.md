# LUFS Meter

Misst den Sound des Nano Cortex über USB und sagt, um wie viele dB das gerade gespielte Preset leiser oder lauter
gemacht werden sollte. Das Ziel hängt vom Sound-Typ ab (Clean, Edge, Drive, Fuzz, Lead) und davon, wo du spielst:
leise zu Hause oder laut im Proberaum. Es ist der Pegelmesser aus dem Nano Cortex Editor als eigenes Programm. Der
Editor selbst ist unverändert.

Inoffiziell, nicht von Neural DSP.

## So geht's

1. Nano per USB-C an den Mac, **LEVEL am Nano auf 10**: Der USB-Sound folgt dem LEVEL-Regler.
2. LUFS Meter öffnen. Er wählt den Nano und die Kanäle 3/4 (der Sound mit Capture und Effekten; 1/2 ist das trockene
   DI-Signal). Beim ersten Mal fragt macOS nach dem Zugriff aufs „Mikrofon“. Es wird nichts aufgenommen.
3. Oben **Quiet** oder **Rehearsal** wählen, unten den Sound (Tasten 1–5).
4. Spielen wie im Song: Akkorde für Rhythmus-Sounds, eine Linie für Lead. Nach 4 Sekunden steht der Vorschlag da,
   zum Beispiel „−2.4 dB: Turn the preset down by 2.4 dB“. Er wird genauer, je länger du spielst.
5. Die Capture Volume im Capture-Block um diesen Wert ändern (in Cortex Control, im Editor oder am Nano) und speichern.

**New after a pause** (an): Nach 3 Sekunden ohne Spielen beginnt mit dem nächsten Ton eine neue Messung. Die fertige
Messung landet in der **History**, dort kannst du ihr den Preset-Namen geben. So gehst du die Presets nacheinander
durch: spielen, umschalten, spielen. **New measurement** (Leertaste) beginnt sofort neu.

**Take … as the target** macht die gemessene Lautheit zum Ziel dieses Sounds. Die anderen wandern mit, ihre Stufen
bleiben. Damit stellst du die Gesamthöhe auf ein Preset ein, das dir schon gefällt.

Steigen die Spitzen bei einem Vorschlag „lauter“ über −1 dBFS, warnt der Meter.

## Die Ziele: Clean am leisesten, dann Stufen

Ein Satz Presets für alle Songs, immer dieselbe Dynamik. Clean ist der leiseste Sound, die anderen liegen um feste
Stufen darüber. Die Stufen sagen, wie viel lauter ein Sound **klingen** soll:

| Sound | Stufe (Vorgabe) | Ziel Rehearsal | Ziel Quiet |
|-------|-----------------|----------------|------------|
| Clean | Grundlautstärke −20 LUFS | −20    | −20 |
| Edge  | +1,5 dB über Clean       | −19    | −19 |
| Drive | +3 dB über Clean         | −17,5  | −19 |
| Fuzz  | +3 dB über Clean         | −17,5  | −18 |
| Lead  | +3 dB über Drive         | −14,5  | −16 |

(LUFS auf USB 3/4 mit LEVEL auf 10.) Die Stufen kannst du in den Kacheln ändern, Clean trägt die Grundlautstärke.
„Take … as the target“ verschiebt nur die Grundlautstärke, die Stufen bleiben.

Das Profil rechnet die Stufen in LUFS um. Bei gleichem LUFS-Wert wirken die mittenbetonten Sounds lauter als Clean,
leise abgehört mehr als laut. Quiet zieht deshalb Drive und Lead 2 dB ab, Fuzz 1 dB und Edge 0,5 dB. Rehearsal zieht
nur 0,5 dB ab. Woher die Zahlen kommen: [Lautheit-Untersuchung.md](Lautheit-Untersuchung.md). Dort steht auch, wie
„Snowflakes“ die Stufen bestätigt.

Die Ziele sind ein Startpunkt aus Modell und Songanalyse, nicht aus einem Hörtest. Wenn ein Sound nach Gehör nicht
passt, ändere seine Stufe.

## Warum kein Bluetooth

Der Meter kann das Preset nicht selbst ändern, er schlägt nur vor. Bluetooth würde technisch gehen. Der Nano nimmt
aber nur **eine** Bluetooth-Verbindung an: Solange der Meter verbunden wäre, ginge kein Editor, kein Cortex Control
und kein Controller-Board. Automatisch einpegeln kann schon der Editor mit **Auto level** (Ausgangspegel-Dialog), mit
demselben Messweg. Diese App ist für den Fall, dass du nur messen willst oder gerade ein anderes Programm mit dem
Nano verbunden hast.

## Bauen

```bash
cd mac-app && ./build.sh
```

Ergebnis: `mac-app/dist/LUFS Meter-darwin-arm64/LUFS Meter.app` (Apple Silicon, ad-hoc signiert), zum Kopieren nach
/Applications. `./build.sh --zip` legt zusätzlich ein Zip in `release/` ab. Nötig sind Node und die Swift-Werkzeuge
(Xcode oder Command Line Tools). Der Helfer `nano-meter` ist derselbe wie im Editor (`mac-app/native/nano-meter.swift`).

`index.html` läuft auch in Chrome. Dort kommen auf dem Mac aber nur die Kanäle 1/2 an (Chromium öffnet Eingänge mit
mehr als zwei Kanälen als Stereo), also nur das DI-Signal. Für den Nano braucht es die Mac-App.

Schrift: IBM Plex Sans (SIL OFL 1.1, `fonts/`).
