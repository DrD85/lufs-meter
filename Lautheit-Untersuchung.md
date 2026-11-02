# Clean, Edge, Drive, Fuzz, Lead: wie laut im Verhältnis – leise zu Hause und laut im Proberaum

> **Seit LUFS Meter 1.1.0 (17.10.2026):** Die Sounds sind nicht mehr gleich laut gemeint. Clean ist der leiseste,
> die anderen liegen um feste Stufen darüber (Edge +1,5, Drive und Fuzz +3, Lead +3 über Drive). Die Korrektur pro
> Profil aus Abschnitt 3 kommt dazu. Wie das zu „Snowflakes“ passt, steht in Abschnitt 6. Die Tabellen unten
> beschreiben den Stand 1.0.0: alle Rhythmus-Sounds gleich laut.

Stand 17.10.2026. Grundlage der Zielwerte im LUFS Meter. Die Zahlen kommen aus einer Modellrechnung
(`tools/loudness-model/`), nicht aus einem Hörversuch mit deinen Presets.

## Kurz

- **Gleiche LUFS heißt nicht gleich laut.** LUFS (ITU-R BS.1770) gewichtet immer gleich, egal wie laut du abhörst.
  Das Ohr tut das nicht: Bei leiser Wiedergabe hört es Bässe viel schwächer, bei hoher fast gleichmäßig (ISO 226).
- Mittenbetonte Sounds (Drive, Lead) wirken deshalb **leise abgehört um etwa 1–3 dB lauter** als ein Clean-Sound mit
  gleichem LUFS-Wert. **Laut im Proberaum** schrumpft das auf **etwa 0–1 dB**. Fuzz (viel Bass, ausgehöhlte Mitten) liegt
  dazwischen, Edge ändert sich kaum.
- Der Unterschied zwischen den beiden Situationen liegt bei Drive und Lead bei **etwa 1,5 dB**. Das ist mehr als die
  Hörschwelle für Lautstärkeunterschiede (etwa 1 dB). Deshalb hat der Meter **zwei Zielsätze, „Quiet“ und „Rehearsal“**.
  Die Methode ist bei beiden dieselbe: messen, mit dem Ziel vergleichen, die Differenz in dB ändern. Nur die Abstände
  zwischen den Sound-Typen sind verschieden.
- Lead liegt in beiden Profilen **3 dB über Drive**. In Foren werden meist 2–5 dB genannt.

| Ziel (LUFS, USB 3/4, LEVEL auf 10) | Clean | Edge  | Drive | Fuzz  | Lead  |
|------------------------------------|-------|-------|-------|-------|-------|
| Quiet (zu Hause, ~60–75 dB am Ohr)  | −20   | −20,5 | −22   | −21   | −19   |
| Rehearsal (mit Band, ~95–105 dB)    | −20   | −20,5 | −20,5 | −20,5 | −17,5 |

Die absolute Höhe ist frei wählbar. „Take … as the target“ verschiebt alle fünf Werte eines Profils gemeinsam. Es
zählen die Abstände. Clean bei −20 lässt cleanen Sounds mit Spitzen 12–18 dB über dem Mittel genug Luft bis 0 dBFS.

## 1. Was das Ohr tut: ISO 226

Die Kurven gleicher Lautstärke (ISO 226:2003; die Ausgabe von 2023 weicht höchstens 0,6 dB davon ab) sagen, wie viel
leiser das Ohr eine Frequenz hört als 1 kHz. Die Werte sind mit der Formel der Norm berechnet
(`tools/loudness-model/iso226.js`), neben der K-Gewichtung von LUFS:

| Frequenz | K-Gewichtung (LUFS) | Ohr bei 40 phon | 60 phon | 80 phon | 100 phon |
|---------:|------:|-------:|-------:|-------:|-------:|
|    80 Hz | −2,4  | −28,5  | −22,1  | −15,2  |  −8,2  |
|   100 Hz | −1,8  | −24,4  | −18,7  | −12,5  |  −6,2  |
|   200 Hz | −1,0  | −13,4  |  −9,9  |  −5,9  |  −1,8  |
|   300 Hz | −0,8  |  −8,2  |  −5,8  |  −3,2  |  −0,4  |
|   500 Hz | −0,7  |  −3,1  |  −2,1  |  −0,9  |  +0,4  |
|    1 kHz |  0    |   0    |   0    |   0    |   0    |
|  3,15 kHz| +3,2  |  +4,4  |  +3,6  |  +2,9  |  +2,3  |

Bei 100 Hz ändert sich die Empfindlichkeit des Ohrs zwischen 60 und 100 phon um 12,5 dB. Die K-Gewichtung bleibt
fest bei −1,8 dB. LUFS ist im Bass also fast neutral. Für leises Abhören ist das zu großzügig, für sehr lautes ungefähr
richtig. Clean- und Fuzz-Sounds haben mehr Energie unter 300 Hz. Leise abgehört verlieren sie deshalb mehr an Lautheit,
als LUFS anzeigt.

## 2. Was LUFS bei verzerrter Gitarre nicht sieht

- **Lautheitssummation:** Ein Signal, dessen Energie über viele Frequenzgruppen verteilt ist, klingt bei gleicher
  Energie lauter als eines mit wenigen starken Teiltönen (Zwicker). LUFS misst nur die Energie. Verzerrung verteilt die
  Energie auf viele Obertöne, vor allem in die oberen Mitten. Das spricht dafür, Drive, Fuzz und Lead etwas weniger
  LUFS zu geben. Wie stark der Effekt ist, ist umstritten: Messungen zeigen, dass die Lautheitsmodelle nach DIN 45631
  und ANSI S3.4 diese Summation überschätzen, um etwa 10 dB bei 45 phon und nur noch etwa 2 dB bei 85 phon
  (JASA 137, EL26, 2015). Deshalb bildet das Modell unten beide Grenzfälle ab.
- **Kompression / Dynamik:** In den Modell-Sounds liegt das 90-%-Perzentil der Momentary-Lautheit bei Clean 2 LU über
  dem integrierten Wert, bei Drive und Fuzz nur 0,5 LU. Clean ist also spitzer. Ob das Ohr den spitzen Clean-Sound
  nach seinen lauten Momenten beurteilt (er würde dann lauter wirken, als LUFS sagt) oder nach dem Mittel, ist für
  Gitarre nicht untersucht. Das ist ein Grund, Clean nach Gehör nachzustellen.
- **Obere Mitten:** Die K-Gewichtung hebt ab etwa 2 kHz nur um 4 dB an. Das Ohr ist um 3–4 kHz bei jedem Pegel am
  empfindlichsten, das deckt die Anhebung grob ab. Der Bereich verschiebt sich zwischen leise und laut kaum. Die Bässe
  verschieben sich viel mehr.
- **Mit Band:** Im Proberaum verdecken Schlagzeug, Bass und Gesang die Gitarre. Ein Solo muss über die Band kommen,
  zu Hause muss es das nicht. Dafür gibt es kein Normmodell. Dafür steht der Abstand Lead–Drive aus der Praxis.

## 3. Modellrechnung

`tools/loudness-model/model.js` (Node, ohne Abhängigkeiten): eine synthetische Gitarre (Karplus-Strong, offene
Akkorde in Achteln bei 100 bpm, für Lead eine Linie auf den hohen Saiten) durch fünf Amp-Skizzen und eine 4x12-artige
Box:

- Clean: kaum Sättigung, Fender-artige Mittenabsenkung.
- Edge: leichte Röhrensättigung.
- Drive: Tube-Screamer-artige Vorfilterung, zwei Gain-Stufen, Bass danach wieder angehoben.
- Fuzz: harte Begrenzung mit vollem Bass, Big-Muff-artige Mittenabsenkung −9 dB.
- Lead: wie Drive mit mehr Gain und +3 dB bei 900 Hz.

Alle Sounds sind auf −20 LUFS gesetzt, das entspricht der K-Gewichtung aus dem Helfer, gegen ffmpeg `ebur128`
geprüft. Dann wird mit drei pegelabhängigen Modellen bestimmt, wie viel dB jeder Sound gegenüber Clean braucht, um
gleich laut zu wirken:

- **contour:** Gewichtung mit der umgekehrten ISO-226-Kurve beim Abhörpegel (wie dB(A) bei 40 phon und dB(C) bei 100).
- **stevens:** Terzbänder → phon → sone, lautestes Band + 0,15 × Rest (Stevens Mark VI, Teilsummation).
- **full:** Summe der sone über Frequenzgruppen (volle Summation, Zwicker-artig ohne Verdeckung) – die obere Grenze.

Die Abhörpegel sind der K-gewichtete Pegel der Gitarre am Ohr: zu Hause 60 / 70 dB, im Proberaum 95 / 105 dB.

Ergebnis, normale Gitarre (`node model.js`), dB gegenüber Clean, damit gleich laut:

| Sound | Modell  | zu Hause 60 | 70   | Probe 95 | 105  |
|-------|---------|------:|------:|------:|------:|
| Edge  | contour | −0,4 | −0,4 | −0,3 | −0,2 |
|       | stevens | −0,5 | −0,5 | −0,4 | −0,3 |
|       | full    | −0,7 | −0,6 | −0,5 | −0,5 |
| Drive | contour | −1,4 | −1,1 | −0,1 | +0,6 |
|       | stevens | −1,6 | −1,5 | −1,2 | −0,3 |
|       | full    | −1,5 | −1,4 | −0,9 | −0,6 |
| Fuzz  | contour | −0,3 | −0,2 | −0,1 |  0,0 |
|       | stevens | −0,9 | −0,9 | −0,8 | −0,7 |
|       | full    | −0,9 | −0,8 | −0,7 | −0,7 |
| Lead  | contour | −1,6 | −1,4 | −0,5 | +0,2 |
|       | stevens | −1,1 | −1,2 | −1,1 | −0,3 |
|       | full    | −1,3 | −1,2 | −0,5 | −0,1 |

Dunklere Gitarre (`PICK_HZ=600 node model.js`, mehr Grundton beim Clean): Drive zu Hause −2,0 bis −3,3 dB, im
Proberaum +0,8 bis −1,7 dB. Fuzz zu Hause −0,6 bis −2,0 dB, im Proberaum +0,2 bis −1,1 dB. Lead zu Hause −2,3 bis
−2,9 dB, im Proberaum +0,6 bis −1,3 dB.

Gelesen:

- Drive und Lead brauchen zu Hause etwa **1,5–2 dB weniger** als Clean, im Proberaum etwa **0,5 dB weniger**.
- Fuzz braucht zu Hause etwa **1 dB weniger**, im Proberaum etwa **0,5 dB weniger**.
- Edge braucht in beiden Situationen etwa **0,5 dB weniger**.

Darauf beruht die Tabelle oben. Lead bekommt dazu seine +3 dB über Drive.

Grenzen: Die Sounds sind synthetisch, und echte Captures haben andere Spektren. Mehr Bass im Clean macht den
Unterschied größer, mehr Bass im Drive kleiner. Alle drei Modelle stammen aus Tönen und Rauschen, nicht aus Gitarre.
Die Größenordnung (1–2 dB zwischen leise und laut) und die Richtung sind in allen Varianten gleich. Die genauen
Zehntel sind es nicht.

## 4. Praxis

- Solo-Boost: Im Fractal-Forum nennen Spieler meist 2–5 dB. Verzerrte Sounds brauchen weniger als cleane, weil sie
  schon komprimiert sind. Ein Spieler berichtet, dass derselbe Boost im kleinen Wohnzimmer zu leise und in einem
  halligen Raum zu laut war. Daher +3 dB als Mitte und die Möglichkeit, es zu ändern.
- „Presets im Kontext der Band einstellen, zu Hause nur annähern“ (Sweetwater). Verzerrte und cleane Sounds wirken bei
  gleichem Pegel unterschiedlich laut (Line 6 Forum). Manche stellen bei etwa 90 dB ein, um den Fletcher-Munson-Effekt
  zu umgehen (Fractal Forum).

## 5. Ein Zielsatz oder zwei?

Zwei Zielsätze, aber nur eine Herangehensweise. Gemessen und vorgeschlagen wird gleich, nur die Abstände zwischen den
Typen sind verschieden. Der Nano speichert pro Preset aber nur eine Lautstärke. Daraus folgt für die Praxis:

- Wenn du vor allem mit der Band spielst: alles im Profil „Rehearsal“ einpegeln. Zu Hause sind Drive und Lead dann
  etwa 1,5 dB zu laut gegenüber Clean. Das hört man, es stört aber selten.
- Wenn du vor allem leise zu Hause spielst: „Quiet“.
- Wenn beides wichtig ist: zwei Kopien der Presets (zu Hause / Probe, mit dem Editor kopieren) oder zu Hause etwas
  lauter abhören. Ab etwa 80 dB am Ohr liegt man schon zwischen den beiden Profilen.

## 6. Die Stufen im Song: „Snowflakes“

Gemessen habe ich den Album-Master (`Album Master/09 Snowflakes.wav`, integriert −10,1 LUFS, LRA 7,7 LU) und die
„Jam Along“-Fassung. Die Jam-Along-Fassung ist derselbe Mix ohne Mastering: durchgehend etwa 11 dB leiser, mit
demselben Verlauf. Eine Einzelspur der Gitarre gibt es darin also nicht. Die Zahlen beschreiben die ganze Band. Weil
die Gitarre im Proberaum mit der Band mitgehen muss, sind genau das die Stufen, die sie braucht.

Mittlere Lautheit über 4 Sekunden, Jam-Along-Fassung (ohne Limiter, daher ehrlicher als der Master):

| Teil (ungefähr)          | Zeit      | LUFS         | gegenüber Strophe |
|--------------------------|-----------|--------------|-------------------|
| Intro, Gitarre allein    | 0–16 s    | −25 bis −27  | −2                |
| Strophe 1                | 16–60 s   | um −23,5     | 0                 |
| Refrain 1                | 60–86 s   | −20,6 … −19,6 | +3 bis +4        |
| Zwischenteil / Strophe 2 | 88–124 s  | um −23       | +0,5              |
| Refrain 2 bis Schluss    | 124–172 s | −20 … −17,8  | +3,5 bis +5,5     |
| Bridge                   | 176–200 s | −22 bis −25  | 0                 |
| letzter Refrain          | 200–208 s | um −20,5     | +3                |

Im Master wird das vom Limiter auf etwa −12,5 (Strophe) zu −9,5 / −7,5 (Refrains) zusammengedrückt.

Das passt zu deinen Stufen. Der Schritt von Strophe zu Refrain beträgt etwa 3 dB, das ist Clean / Edge → Drive
(+3). Der Höhepunkt liegt noch 2–2,5 dB darüber, das ist Drive → Lead (+3). Welcher Teil welches Preset nutzt, kann
ich aus dem Mix nicht sicher trennen. Die Zuordnung ist meine Lesart des Verlaufs.

## Quellen

- ISO 226:2003 / ISO 226:2023, Normal equal-loudness-level contours; Änderungen 2023 „up to 0,6 dB“:
  [Vorschau ISO 226:2023 (ANSI)](https://webstore.ansi.org/preview-pages/ISO/preview_ISO+226-2023.pdf),
  [Suzuki, Takeshima, Kurakata, Acoust. Sci. & Tech. 45(1), 2024](https://doi.org/10.1250/ast.e23.66),
  Kurvenbild: [Sengpiel, ISO 226:2003](https://www.SengpielAudio.com/Acoustics226-2003.pdf).
- ITU-R BS.1770 (K-Gewichtung, Gating, LUFS):
  [ITU-R BS.1770](https://itu.int/dms_pubrec/itu-r/rec/bs/R-REC-BS.1770-0-200607-S!!PDF-C.pdf).
  Grundlage war Soulodres Leq(RLB):
  [Soulodre, „Evaluation of Objective Loudness Meters“, AES 116, 2004](https://aes2.org/publications/elibrary-page/?id=12790).
  Ausreißer bis 6 dB in den Validierungstests, weil Summation und Zeitkonstanten fehlen:
  [TV Technology, Comparing loudness meters](https://tvtechnology.com/opinions/the-forum-comparing-loudness-meters-part-2).
- Lautheitssummation, Überschätzung durch DIN 45631 / ANSI S3.4 je nach Pegel:
  [„Spectral loudness summation: Shortcomings of current standards“, JASA 137 (1), EL26, 2015](https://pubs.aip.org/asa/jasa/article/137/1/EL26/911718/Spectral-loudness-summation-Shortcomings-of).
- Praxis: [Fractal Forum, Solo boost dB?](https://forum.fractalaudio.com/threads/solo-boost-db.115891/),
  [Fractal Forum, solo boost](https://forum.fractalaudio.com/threads/solo-boost.212256/),
  [Line 6, Levels for lead / rhythm patches](https://line6.com/support/topic/62073-settings-levels-for-lead-rhythm-patches/),
  [Line 6, Preset balancing](https://line6.com/support/topic/60930-preset-balancing/),
  [Sweetwater, Balancing modeling amp presets](https://www.sweetwater.com/insync/balancing-modeling-amp-presets/),
  [Neural DSP Forum, Normalize patch volume](https://unity.neuraldsp.com/t/normalize-patch-volume/16157).
