# Stackhaven – plan

Et turbasert containerpuslespill + en havn du bygger ut. Web først, mobil senere.
Tempo: 5–8 timer i uka. Én milepæl ≈ 2–3 uker.

## Status nå

**Milepæl:** M1 – Spillbart stable-puslespill (alt unntatt mine egne oppgaver er ferdig). Brett-editoren fra M2 er klar på `/editor.html`; «Løs»-knappen virker når løseren min er skrevet.
**Neste oppgave:** Spill på mobilen og følg ett trekk gjennom koden (M0), lag brett nr. 6 for hånd i JSON (M1), så løseren (M2)
**Sist oppdatert:** 2026-09-26

## Spilleregler for meg selv

1. **Kjernen skal være gøy før den blir pen.** Ingen grafikkpolering før M3 er bestått.
2. **Ikke merge kode jeg ikke kan forklare.** Spør Claude Code om «hvorfor» når noe er uklart.
3. **Små steg, ofte på mobilen.** Test hver milepæl på telefonen via GitHub Pages.
4. **Nye ideer går i Parkeringsplassen**, ikke rett inn i koden.
5. **Oppdater «Status nå» etter hver økt.**

---

## M0 – Oppsett (uke 40)

Mål: Repoet kjører, og jeg forstår hvordan det henger sammen.

- [x] Kjør oppstartsprompten i Claude Code og godkjenn planen den foreslår
- [x] `pnpm dev` fungerer lokalt
- [x] CI er grønn og spillet ligger ute på GitHub Pages
- [ ] Åpnet spillet på mobilen
- [ ] Lest `docs/ARCHITECTURE.md` og kan forklare lagene `core` / `render` / `ui` / `app` med egne ord
- [ ] Fulgt ett trekk gjennom koden: tap → controller → `applyMove` → events → animasjon

**Jeg lærer:** Prosjektoppsett, CI/CD, hvorfor spillogikk skilles fra rendering.

## M1 – Spillbart stable-puslespill (uke 40–42)

Mål: 5 brett som kan spilles fra start til slutt med enkel grafikk.

- [x] Spillreglene i `core` med tester (flytt, lever, vinn/tap, stjerner)
- [x] Angre fungerer
- [x] Containere med `InstancedMesh`, kran med animasjon
- [x] Tap/klikk fungerer likt på mus og touch
- [x] HUD: trekk, ordrekø, stjerner, angre-knapp
- [x] Brettvalg og vinn/tap-skjerm
- [x] 5 brett, med test som beviser at de er løsbare
- [ ] **Selv:** Lag brett nr. 6 helt på egen hånd i JSON

**Ferdig når:** Jeg kan gi telefonen til en venn, og de skjønner spillet uten forklaring fra meg (eller nesten).
**Jeg lærer:** Rene funksjoner, events, instancing, input på touch.

## M2 – Løser og brett-editor (uke 43–45) ⭐ mitt eget prosjekt

Mål: Et verktøy som gjør at jeg kan lage gode brett raskt.

- [ ] **Selv:** Skriv løseren med BFS over puslespilltilstander (tilstand-hashing, besøkt-mengde)
- [ ] **Selv:** Oppgrader til A* med en heuristikk (f.eks. antall containere som blokkerer neste ordre)
- [ ] Løseren regner ut `par` automatisk; testen sjekker at brett-filene stemmer
- [ ] Enkel brett-editor i nettleseren (egen side): legg ut stabler, trykk «løs», se par og vanskelighet
- [ ] Mål på vanskelighet (f.eks. par, antall tilstander løseren besøkte, antall «feller»)

**Ferdig når:** Jeg kan lage og verifisere et nytt brett på under 10 minutter.
**Jeg lærer:** Søkealgoritmer i praksis (rett fra KI-emnet), heuristikker, tilstandsrom.

## M3 – Er det gøy? (uke 46–48)

Mål: Finne ut om kjernen holder, og fikse den hvis ikke.

- [ ] Lag 20 brett med jevn vanskelighetskurve
- [ ] Legg inn minst én ny mekanikk for variasjon (forslag: låst stabel eller container med to ordre)
- [ ] Enkel lagring av fremgang (stjerner per brett)
- [ ] Playtest med minst 5 personer. Se på dem uten å hjelpe, og noter hvor de stopper opp
- [ ] Skriv ned funnene og hva jeg endrer
- [ ] **Beslutning:** Fortsette som planlagt, justere reglene, eller tenke om?

**Ferdig når:** Minst halvparten av testerne vil spille ett brett til av seg selv.

## ⏸ Buffer – eksamensperiode (uke 49–51)

Lite eller ingen spillutvikling. Hvis jeg har tid: små brett, ideer i Parkeringsplassen.

## M4 – Visuell stil / look dev (uke 1–3, 2027)

Mål: Bestemme hvordan spillet skal se ut, i én liten testscene.

- [ ] Moodboard med 10–15 skjermbilder av spill jeg synes ser bra ut
- [ ] Fargepalett (6–8 farger) på ett sted i koden
- [ ] Lys: environment map, myke skygger, tone mapping
- [ ] Post-processing: ambient occlusion, lett bloom, fargegradering
- [ ] Stilisert vann med skum langs kaikanten
- [ ] Første egne lavpoly-modeller (container, kran, lastebil) i Blender eller CC0-assets
- [ ] Sjekk ytelse på mobilen (mål: jevne 60 fps på min telefon)

**Jeg lærer:** Lys, materialer, shadere, post-processing, Blender-grunnlag.

## M5 – Havne-laget (uke 4–7)

Mål: Stjernene fra brettene brukes til å bygge ut havna.

- [ ] Havnescene med kamera man kan panorere/zoome med fingrene
- [ ] Oppgaver: «Bygg ny kai (3 ⭐)», «Mal lagerbygget (2 ⭐)» osv.
- [ ] Byggeanimasjoner og litt liv: båter, måker, lastebiler
- [ ] Kobling: oppgraderinger låser opp nye brett/mekanikker
- [ ] Enkel historie og en første dialog (hvem er du, hvorfor er havna nedslitt?)

**Ferdig når:** Løkken «spill brett → få stjerner → bygg havn → nye brett» fungerer.

## M6 – Flere mekanikker og progresjon (uke 8–11)

- [ ] 2–3 nye mekanikker (ideer: kjølecontainere som trenger strøm, tog fra ett spor, storm som stenger en stabel)
- [ ] 50+ brett fordelt på «kapitler» i havna
- [ ] Balansering av stjerner og kostnader
- [ ] Ny playtest-runde

## M7 – Polering (uke 12–14)

- [ ] Lyd og musikk
- [ ] Tutorial for de første brettene
- [ ] «Juice»: easing, partikler, små feiringer ved seier
- [ ] Innstillinger (lyd, språk)
- [ ] Feilsøking og ytelse på flere telefoner

## M8 – Lansering på web (uke 15–16)

- [ ] Velg kanal: itch.io først, deretter Poki/CrazyGames
- [ ] Butikkside med skjermbilder og en kort video
- [ ] Enkel analyse: hvor langt kommer spillerne?
- [ ] Samle tilbakemeldinger og prioritere

## M9 – Mobil (uke 17+)

- [ ] Pakk inn med Capacitor, test på iOS og Android
- [ ] Bestem forretningsmodell (engangskjøp, reklame eller gratis med kjøp)
- [ ] App Store / Google Play-oppføring

---

## Beslutningslogg

| Dato       | Beslutning                                               | Hvorfor                                                     |
| ---------- | -------------------------------------------------------- | ----------------------------------------------------------- |
| 2026-09-26 | Three.js (imperativt) + React for UI + ren TS-kjerne     | Web først, full kontroll over rendering, mye meny-UI senere |
| 2026-09-26 | Turbasert puslespill + havn-meta (Gardenscapes-modellen) | Mobilvennlig, testbar kjerne, kombinerer brett og sandbox   |
| 2026-09-26 | Første milepæl: stable-puslespill før grafikk            | Finne ut om kjernen er gøy før jeg bruker tid på utseende   |
| 2026-09-26 | Jeg skriver løseren selv                                 | Best læring, knyttet til KI-emnet                           |
| 2026-09-26 | Input-kø i stedet for å låse input under animasjoner     | Føles smidigere; trykk sjekkes mot logisk tilstand          |
| 2026-09-26 | Trykk treffer det som er tegnet, ikke usynlige søyler    | Usynlige søyler ga opptil 50 % feiltrykk på desktop         |
| 2026-09-26 | Offentlig repo egeiran/stackhaven + GitHub Pages         | Teste på mobilen; CI deployer main automatisk               |
| 2026-09-26 | Claude oppdaterer «Status nå» og beslutningsloggen       | Planen holdes oppdatert uten at jeg må huske det            |
| 2026-09-26 | Brett-editor som egen side (editor.html), i 2D           | Enkel; gjenbruker core; 3D-test via ?custom=-lenke          |

## Parkeringsplassen 🅿️

Ideer som ikke skal gjøres nå:

- Tidevann som endrer hvilke kaier som kan brukes
- Daglige utfordringer (generert av løseren)
- Ekte skipsnavn/rederier som inspirasjon for farger og historier
- Dag/natt og vær i havne-laget