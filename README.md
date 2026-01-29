# PK X-treme Racers - Banetider Ledertabell System

## Oversikt

Dette er en komplett webbasert løpsledertabell-applikasjon for Mario Kart baneracing. Systemet håndterer registrering av rundetider, beregning av plasseringer, handicap-system, poengdeling og sesong-stilling.

**Teknologi:**

- Frontend: HTML5, CSS3 (Bootstrap), Vanilla JavaScript
- Database: Supabase (PostgreSQL)
- Autentisering: Supabase Auth
- Hosting: Versjon kontrollert via GitHub

---

## Systemarkitektur

### Databasestruktur

**Tabeller i Supabase:**

1. **Users**
   - `id` - Bruker-ID (PK)
   - `email` - E-post (unik)
   - `username` - Brukernavn (unik)
   - `is_admin` - Boolean for admin-rettigheter

2. **GrandPrix (Sesonger)**
   - `id` - Sesong-ID (PK)
   - `name` - Sesongnavn (f.eks. "Sesong 1")
   - `description` - Sesongbeskrivelse (valgfri)
   - `created_at` - Opprettelsestidspunkt

3. **Tracks (Baner)**
   - `id` - Bane-ID (PK)
   - `track_name` - Banenavn (f.eks. "Kyalami", "Monza")

4. **Races (Løp)**
   - `id` - Løp-ID (PK)
   - `grandprix_id` - Referanse til sesong (FK)
   - `track_id` - Referanse til bane (FK)
   - `race_name` - Løpsnavn (f.eks. "Løp 1")
   - `description` - Løpsbeskrivelse (valgfri)
   - `created_at` - Opprettelsestidspunkt

5. **Times (Rundetider)**
   - `id` - Tidsresultat-ID (PK)
   - `user_id` - Referanse til bruker (FK)
   - `race_id` - Referanse til løp (FK)
   - `track_id` - Referanse til bane (FK)
   - `time` - Tid i sekunder (desimaltall, f.eks. 83.45)
   - `username` - Brukernavnet (snapshot)
   - `placement` - Plassering i løpet (1, 2, 3, osv.)
   - `handicap_kg` - Handicap i kg basert på plassering
   - `points` - Poeng basert på plassering
   - `fastest_lap` - Boolean: raskeste runde i løpet?
   - `created_at` - Opprettelsestidspunkt

---

## Funksjoner & Arbeidsflyt

### 1. Autentisering

**Registrering:**

- Bruker fyller inn brukernavn, e-post og passord
- Supabase Auth lager konto
- Brukernavn lagres også i Users-tabell for søk

**Innlogging:**

- Bruker kan logge inn med enten brukernavn ELLER e-post
- Hvis brukernavn brukes: system slår opp e-post fra Users-tabell
- Innlogget bruker får vist admin-panel hvis `is_admin = true`

### 2. Sesong- og Løpshåndtering

**Admin kan:**

- Opprette nye sesonger (Grand Prix)
- Opprette løp innen sesonger
- Redigere løpsbeskrivelser

**Alle brukere:**

- Velge sesong fra dropdown
- Se løper som er opprettet for valgt sesong
- Se løpsbeskrivelse

### 3. Tidsregistrering

**Prosess:**

1. Bruker velger sesong → løp blir lastet
2. Bruker velger løp → løpsbeskrivelse vises
3. Bruker skriver rundetid i format `MM:SS.MS` (f.eks. 1:23.45)
4. System validerer formatet og konverterer til sekunder
5. Tid lagres i database
6. **Automatisk beregning:** System beregner plassering, handicap og poeng for alle deltakere i løpet

**Validering:**

- Brukeren kan bare registrere EN tid per løp
- Tidsformat må være MM:SS.MS (regex validering)

### 4. Poengdeling System

Basert på **Formula 1-lignende poengdeling:**

| Plassering | Poeng | Handicap |
| ---------- | ----- | -------- |
| 1. plass   | 15    | +20 kg   |
| 2. plass   | 13    | +10 kg   |
| 3. plass   | 11    | +5 kg    |
| 4. plass   | 10    | 0 kg     |
| 5+ plass   | 0     | 0 kg     |

**Bonuspoeng:** +1 poeng for raskeste runde i løpet

**Handicap-formål:** Jevne ut feltet ved å legge vekt på de som kjørte best forrige løp

### 5. Resultatvisning

Systemet viser tre parallelle resultat-seksjoner:

**A) Dine tider** (personlige resultater)

- Viser brukerens egne tider for valgt løp
- Format: `Tid (Plassering, Handicap) [Raskeste runde-icon]`
- Eksempel: `1:23.45 (P1, 20kg) 🏁`

**B) Løps-ledertabell** (alle deltakeres resultater for løpet)

- Sortert etter tid (raskeste først)
- Viser alle deltakeres navn, tid, differanse til vinner, handicap, poeng
- Format: `#. Navn — Tid (+Differanse) | handicap +Xkg | Yp [🏁]`
- Eksempel: `1. Ole — 1:23.45 | handicap +20kg | 16p 🏁`

**C) Sesong-stilling** (sammenlagt for hele sesongen)

- Summert poeng fra alle løp for hver bruker
- Summert handicap fra alle løp
- Sortert etter poeng (høyest først)
- Format: `#. Navn — X poeng, Y kg totalt`
- Eksempel: `1. Kari — 45 poeng, 50 kg totalt`

---

## Kodestruktur

### index.html

Inneholder HTML-struktur med Bootstrap-styling og Supabase-initialisering

### app.js

Hoveddelen av logikken. Delt opp i seksjoner:

**Initialisering:**

- Sjekk Supabase-tilkobling
- Hent alle HTML-elementer

**Autentisering:**

- `register()` - Registrer ny bruker
- `login()` - Logg inn bruker
- `logout()` - Logg ut bruker

**Admin-funksjoner:**

- `loadTracksForAdmin()` - Last alle baner
- `createSeason()` - Opprett sesong
- `createRace()` - Opprett løp
- `enableDescEdit()` - Tillat redigering av beskrivelse
- `saveDescEdit()` - Lagre beskrivelse

**Data-lastinger:**

- `loadSeasons()` - Last alle sesonger
- `loadRaces()` - Last løper for sesong
- `loadTimes()` - Last brukerens tider for løp
- `loadLeaderboard()` - Last alle deltakeres tider for løp
- `loadStandings()` - Last sesong-stilling

**Tidsregistrering & Beregning:**

- `saveTime()` - Registrer ny tid
- `calculateRaceResults()` - Beregn plasseringer, handicap, poeng

**UI-hjelpere:**

- `showMsg()` - Vis melding til bruker
- `clearMsg()` - Fjern melding
- `showMain()` - Skjul login, vis hovedinnhold

---

## Tidsformat & Konvertering

**Bruker-input:** `MM:SS.MS`

- Eksempel: `1:23.45` betyr 1 minutt, 23 sekunder, 45 centisekunder

**Intern lagring:** Desimalsekunder

- Beregning: `(minutter * 60) + sekunder + (centisekunder / 100)`
- Eksempel: `1:23.45` blir `83.45` sekunder

**Displayformat:** Konverteres tilbake for visning

- Henter heltalls-minutter: `Math.floor(totalSec / 60)`
- Henter gjenstående sekunder: `Math.floor(totalSec % 60)`
- Henter centisekunder: `Math.round((totalSec % 1) * 100)`

---

## Supabase-konfigurering

**Autentisering:**

- Sign-up aktivert: Ja
- E-post-bekreftelse: Ja (anbefalt)
- Minimum passordlengde: 6 tegn

**Database-tilgang:**

- Row Level Security (RLS): Burde aktiveres i produksjon
- Public read på Times-tabellen (for ledertabeller)
- Auth-bruker kan insertere egne times

**API-nøkkel:**

- Anon key brukt i klienten (sikker: har begrenset tilgang)
- Service role key: HOLD HEMMELIG (ikke i frontend!)

---

## Sikkerhet & Forbedringer

**Nåværende sikkerhetsnivå:** Lavt (for prototype/testing)

**Anbefalt før produksjon:**

1. Aktivér Row Level Security (RLS) på alle tabeller
2. Valider alle inputs på backend (Supabase Functions)
3. Lagre API-nøkler som miljøvariabler, ikke i HTML
4. Implementer rate-limiting for tidsregistrering
5. Legg til audit-logging av alle endringer
6. Bruk HTTPS kun
7. Implementer CORS-policy

---

## Feilsøking

**Problem: "Brukernavn ikke funnet" ved login**

- Sjekk at brukernavn ble lagret korrekt i Users-tabell under registrering
- Brukernavn er case-sensitive

**Problem: Plasseringer beregnes ikke riktig**

- Sjekk at tidsformatet er korrekt (MM:SS.MS)
- Se browser console for feilmeldinger
- Verifiser at calculateRaceResults() kjørte etter tid ble lagret

**Problem: Handicap vises ikke**

- Kontroller at placement-feltet er satt (burde være 1, 2, 3, etc.)
- Sjekk at handicapMap inneholder riktige verdier

**Problem: Login/Register fungerer ikke**

- Sjekk at Supabase-klienten er initialisert (sjekk browser console)
- Verifiser at API-URL og nøkkel er korrekte i index.html
- Sjekk Supabase-dashboard for autentiseringsfeil

---

## Utvidelsesmuligheter

1. **Photo finish:** Lagre video/bilde av tidsregistreringene
2. **Manuelle handicap-justeringer:** Admin kan justere handicap per løp
3. **Bruker-profil:** Statistikk per bruker, gjennomsnittlig runde, best lap record
4. **Turneringsformat:** Bracket-system, playoff-løp
5. **Historikk:** Mulighet til å se tidligere sesonger
6. **Notifikasjoner:** Push-varslinger når resultat er postet
7. **Muliplayer chat:** Live chat under løp
8. **Mobil-app:** React Native eller Flutter versjon

---

## Kontakt & Support

For spørsmål om systemet, se koden eller database-struktur i Supabase-dashboarden.

**Sist oppdatert:** Januar 2026
**Versjon:** 1.0 (Prototyp)
