(function () {
  // IIFE (Immediately Invoked Function Expression) - lukker all kode i sitt eget scope
  // Dette forhindrer at globale variabler forureneses
  console.log("App.js loaded");

  // Sjekk om app allerede er initialisert for å unngå dobbel initialisering
  // Dette er viktig hvis siden lastes på nytt eller hvis app.js lastes flere ganger
  if (window.supabaseInitialized) {
    console.log("Already initialized, returning");
    return;
  }
  window.supabaseInitialized = true;

  // Vent til hele HTML-dokumentet er lastet før vi starter JavaScript-logikken
  document.addEventListener("DOMContentLoaded", () => {
    console.log("DOMContentLoaded fired");
    console.log("window.supabaseClient available:", !!window.supabaseClient);

    // Sjekk at Supabase-klienten ble initialisert korrekt i index.html
    if (!window.supabaseClient) {
      console.error("ERROR: window.supabaseClient is not available!");
      return;
    }

    // ===== HENT ALLE HTML-ELEMENTER =====
    // Vi lagrer referanser til alle elementer vi skal manipulere
    // Dette gjør det raskere enn å kalle document.getElementById() hver gang

    // Loginoverlay og hovedinnhold
    const loginOverlay = document.getElementById("loginOverlay");
    const main = document.getElementById("main");

    // Loginform-felter
    const usernameEl = document.getElementById("username");
    const emailEl = document.getElementById("email");
    const passwordEl = document.getElementById("password");
    const authMsg = document.getElementById("authMsg");

    // Knapper
    const btnLogin = document.getElementById("btnLogin");
    const btnRegister = document.getElementById("btnRegister");
    const btnLogout = document.getElementById("btnLogout");
    const btnSave = document.getElementById("btnSave");

    // Sesong- og løpsvelgere
    const seasonSelect = document.getElementById("seasonSelect");
    const adminSeasonSelect = document.getElementById("adminSeasonSelect");
    const raceSelect = document.getElementById("raceSelect");

    // Tidsregistrering
    const timeInput = document.getElementById("timeInput");

    // Resultatlister
    const timesList = document.getElementById("timesList");
    const leaderboard = document.getElementById("leaderboard");
    const standings = document.getElementById("standings");
    const fastestLapCheckbox = document.getElementById("fastestLap");

    // Admin-elementer
    const adminSection = document.getElementById("adminSection");
    const adminTrackSelect = document.getElementById("adminTrackSelect");
    const newGPName = document.getElementById("newGPName");
    const newGPDesc = document.getElementById("newGPDesc");
    const btnCreateGP = document.getElementById("btnCreateGP");
    const newRaceName = document.getElementById("newRaceName");
    const newRaceDesc = document.getElementById("newRaceDesc");
    const btnCreateRace = document.getElementById("btnCreateRace");
    const raceDescSection = document.getElementById("raceDescSection");
    const raceDesc = document.getElementById("raceDesc");
    const btnEditDesc = document.getElementById("btnEditDesc");
    const btnSaveDesc = document.getElementById("btnSaveDesc");

    // ===== GLOBALE VARIABLER =====
    // Disse brukes til å holde styr på innlogget bruker og admin-status
    let currentUser = null; // Inneholder brukerinformasjon når innlogget
    let isAdmin = false; // Boolean som indikerer om bruker er admin

    // ===== RYDDING OG INITIALISERING =====
    // Fjern eventuell gammel "raskeste runde"-checkbox som kan henge igjen i cache
    if (fastestLapCheckbox) {
      const wrapper = fastestLapCheckbox.closest(".form-check");
      if (wrapper) {
        wrapper.remove();
      } else {
        fastestLapCheckbox.remove();
      }
    }

    // ===== HJELPEFUNKSJONER FOR UI =====

    // Viser en melding til bruker (feil eller suksess)
    // isError = true gjør teksten rød, false gjør den grønn
    function showMsg(msg, isError = true) {
      authMsg.style.color = isError ? "red" : "green";
      authMsg.textContent = msg;
    }

    // Fjerner meldingen fra skjermen
    function clearMsg() {
      authMsg.textContent = "";
    }

    // Viser hovedinnholdet og skjuler loginoverlayet
    // Brukes når bruker har logget inn eller registrert seg
    function showMain() {
      loginOverlay.style.display = "none";
      main.style.display = "block";
    }

    // ===== AUTENTISERING: REGISTRERING =====
    // Denne funksjonen registrerer en ny bruker i systemet
    async function register() {
      console.log("Register clicked");
      clearMsg();

      // Hent og validér input-verdier fra skjemaet
      const username = usernameEl.value.trim();
      const email = emailEl.value.trim();
      const password = passwordEl.value;

      // Sjekk at alle felt er fylt ut
      if (!username || !email || !password)
        return showMsg("Fyll inn brukernavn, epost og passord");

      try {
        // Registrer bruker via Supabase Auth
        // Dette oppretter en konto som kan logges inn senere
        const { data, error } = await window.supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username,
            },
          },
        });

        // Hvis registrering feilet, vis feilmelding
        if (error) return showMsg("Register feilet: " + error.message);

        // Lagre også i Users-tabellen slik at vi kan søke etter brukernavn senere
        // (Supabase Auth bruker e-post som primærnøkkel, så vi trenger denne for brukernavn-søk)
        await window.supabaseClient.from("Users").insert([
          {
            email: email,
            username: username,
          },
        ]);

        // Suksessmeldinger og rydding
        showMsg("Registrert! Sjekk epost for bekreftelse", false);
        usernameEl.value = "";
        emailEl.value = "";
        passwordEl.value = "";
      } catch (e) {
        console.error(e);
        showMsg("Register exception, se console");
      }
    }

    // ===== AUTENTISERING: INNLOGGING =====
    // Denne funksjonen logger inn en eksisterende bruker
    async function login() {
      console.log("Login clicked");
      clearMsg();

      // Hent input-verdier
      const usernameInput = usernameEl.value.trim();
      const emailInput = emailEl.value.trim();
      const password = passwordEl.value;

      // Validering: Passord er påkrevd
      if (!password) return showMsg("Fyll inn passord");

      // Validering: Enten brukernavn eller e-post må fylles inn
      if (!usernameInput && !emailInput)
        return showMsg("Fyll inn brukernavn eller epost");

      try {
        let email = emailInput;

        // Hvis brukernavn er oppgitt (i stedet for e-post):
        // Slå opp e-posten til brukernavnet fra Users-tabellen
        if (usernameInput && !emailInput) {
          const { data: userData } = await window.supabaseClient
            .from("Users")
            .select("email")
            .eq("username", usernameInput)
            .single();

          // Hvis brukernavnet ikke finnes, avbryt
          if (userData) {
            email = userData.email;
          } else {
            return showMsg("Brukernavn ikke funnet");
          }
        }

        // Logg inn med Supabase Auth (bruker e-post og passord)
        const { data, error } =
          await window.supabaseClient.auth.signInWithPassword({
            email,
            password,
          });

        // Hvis innlogging feilet, vis feilmelding
        if (error) return showMsg("Login feilet: " + error.message);

        // Lagre brukerinformasjonen globalt så vi kan bruke den senere
        currentUser = data.user;
        console.log("Logged in user:", currentUser);
        console.log("User metadata:", currentUser?.user_metadata);

        // ===== SJEKK ADMIN-STATUS =====
        // Etter vellykket login, sjekk om bruker har admin-rettigheter
        const { data: userData } = await window.supabaseClient
          .from("Users")
          .select("is_admin")
          .eq("email", currentUser.email)
          .single();

        isAdmin = userData?.is_admin || false;
        console.log("Is admin:", isAdmin);

        // Hvis bruker er admin, vis admin-panelet og last inn banenavn
        if (isAdmin) {
          adminSection.style.display = "block";
          loadTracksForAdmin();
        }

        // Vis hovedinnholdet og last inn data
        if (currentUser) showMain();
        loadSeasons();
        showMsg("Innlogget!", false);

        // Rydd skjemaet
        usernameEl.value = "";
        emailEl.value = "";
        passwordEl.value = "";
      } catch (e) {
        console.error(e);
        showMsg("Login exception, se console");
      }
    }

    // ===== AUTENTISERING: LOGUT =====
    // Logger ut bruker ved å fjerne autentiserings-tokenen
    async function logout() {
      await window.supabaseClient.auth.signOut();
      location.reload(); // Last siden på nytt for å resette alt
    }

    // ===== ADMIN-FUNKSJONER: LAST BANER =====
    // Denne funksjonen henter alle tilgjengelige banenavn fra databasen
    // brukes av admin når de skal opprette et nytt løp
    async function loadTracksForAdmin() {
      const { data, error } = await window.supabaseClient
        .from("Tracks")
        .select("*")
        .order("id", { ascending: true });
      if (error) {
        console.error("Error loading tracks:", error);
        return;
      }
      // Fyll dropdown med banenavn
      adminTrackSelect.innerHTML =
        '<option value="">Velg bane for løpet</option>';
      (data || []).forEach((t) => {
        const o = document.createElement("option");
        o.value = t.id;
        o.textContent = t.track_name;
        adminTrackSelect.appendChild(o);
      });
    }

    // ===== SESONG-FUNKSJONER: LAST SESONGER =====
    // Denne funksjonen henter alle sesonger fra databasen og fyller dropdown-menyer
    // Sesonger vises i både bruker-dropdown og admin-dropdown
    async function loadSeasons() {
      const { data, error } = await window.supabaseClient
        .from("GrandPrix")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) {
        console.error("Error loading sesong:", error);
        return;
      }

      // Fyll bruker-dropdown
      seasonSelect.innerHTML = '<option value="">Velg sesong</option>';
      if (adminSeasonSelect) {
        adminSeasonSelect.innerHTML = '<option value="">Velg sesong</option>';
      }

      // Legg til hver sesong som option
      (data || []).forEach((gp) => {
        const o = document.createElement("option");
        o.value = gp.id;
        o.textContent = gp.name;
        seasonSelect.appendChild(o);

        if (adminSeasonSelect) {
          const adminOpt = document.createElement("option");
          adminOpt.value = gp.id;
          adminOpt.textContent = gp.name;
          adminSeasonSelect.appendChild(adminOpt);
        }
      });

      // Hold admin- og bruker-valg i synk så nye løp settes på valgt sesong
      // (Hvis admin velger en sesong, skal bruker også få den valgt)
      if (adminSeasonSelect) {
        adminSeasonSelect.value = seasonSelect.value || "";
      }
    }

    // ===== ADMIN-FUNKSJONER: OPPRETT NY SESONG =====
    // Admin bruker denne funksjonen til å lage en helt ny sesong (Grand Prix)
    async function createSeason() {
      const gpName = newGPName.value.trim();

      // Valider at sesongnavn er fylt inn
      if (!gpName) {
        return alert("Skriv sesongnavn");
      }

      // Innsert ny sesong i database
      const { data, error } = await window.supabaseClient
        .from("GrandPrix")
        .insert([
          {
            name: gpName,
            description: newGPDesc.value.trim() || null,
          },
        ]);

      if (error) {
        console.error("Error creating sesong:", error);
        alert("Feil ved opprettelse: " + error.message);
        return;
      }

      // Rydd skjema og oppdater liste
      newGPName.value = "";
      newGPDesc.value = "";
      loadSeasons();
      alert("Sesong opprettet!");
    }

    // ===== LØPS-FUNKSJONER: LAST LØPER =====
    // Denne funksjonen henter alle løp for en valgt sesong fra databasen
    // Den fyller også dropdown med løpene og henter baneinformasjon
    async function loadRaces() {
      const gpId = Number(seasonSelect.value);

      // Hvis ingen sesong er valgt, vis instruksjon og reset
      if (!gpId) {
        raceSelect.innerHTML = '<option value="">Velg sesong først</option>';
        raceDescSection.style.display = "none";
        loadStandings();
        return;
      }

      // Hent alle løp for denne sesongen fra databasen
      // "Tracks(track_name)" henter banenavn via relasjon
      const { data, error } = await window.supabaseClient
        .from("Races")
        .select("*, Tracks(track_name)")
        .eq("grandprix_id", gpId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error loading races:", error);
        return;
      }

      // Fyll dropdown med løpene
      raceSelect.innerHTML = '<option value="">Velg løp</option>';
      (data || []).forEach((r) => {
        const o = document.createElement("option");
        o.value = r.id;
        const trackName = r.Tracks?.track_name || "Ukjent bane";
        // Vise løpsnavn sammen med banenavn (f.eks. "Løp 1 (Kyalami)")
        o.textContent = `${r.race_name} (${trackName})`;
        // Lagre beskrivelse og track_id som data-attributter så vi kan hente dem senere
        o.dataset.description = r.description || "";
        o.dataset.trackId = r.track_id;
        raceSelect.appendChild(o);
      });

      // Oppdater sammenlagt når sesong skifter
      loadStandings();
    }

    // ===== LØPS-FUNKSJONER: VIS LØPSBESKRIVELSE =====
    // Når bruker velger et løp, vis beskrivelsen og last alle resultatene
    async function showRaceDescription() {
      const raceId = Number(raceSelect.value);
      if (!raceId) {
        raceDescSection.style.display = "none";
        return;
      }

      // Hent beskrivelsen fra data-attributten vi lagret før
      const selectedOption = raceSelect.options[raceSelect.selectedIndex];
      const description = selectedOption.dataset.description || "";

      // Vis beskrivelsesseksjonen
      raceDescSection.style.display = "block";
      raceDesc.value = description;

      // Hvis bruker er admin, tillat redigering av beskrivelse
      if (isAdmin) {
        btnEditDesc.style.display = "inline-block";
      }

      // Last alle resultater for dette løpet
      loadTimes();
      loadLeaderboard();
      loadStandings();
    }

    // ===== ADMIN-FUNKSJONER: OPPRETT NYTT LØP =====
    // Admin bruker denne funksjonen til å lage et nytt løp innen en sesong
    async function createRace() {
      const gpId = Number(adminSeasonSelect.value);
      const trackId = Number(adminTrackSelect.value);
      const raceName = newRaceName.value.trim();

      // Validering: Alt må være valgt/fylt inn
      if (!gpId || !trackId || !raceName) {
        return alert("Velg sesong, bane og skriv løpsnavn");
      }

      // Innsert nytt løp i database
      const { data, error } = await window.supabaseClient.from("Races").insert([
        {
          grandprix_id: gpId,
          track_id: trackId,
          race_name: raceName,
          description: newRaceDesc.value.trim() || null,
        },
      ]);

      if (error) {
        console.error("Error creating race:", error);
        alert("Feil ved opprettelse: " + error.message);
        return;
      }

      // Rydd skjema og oppdater løpslisten
      newRaceName.value = "";
      newRaceDesc.value = "";
      adminTrackSelect.value = "";
      loadRaces();
      alert("Løp opprettet!");
    }

    // ===== BESKRIVELSE-REDIGERING: AKTIVER REDIGERING =====
    // Når admin klikker "Rediger beskrivelse", gjør tekstfeltet skrivbart
    function enableDescEdit() {
      raceDesc.readOnly = false;
      btnEditDesc.style.display = "none";
      btnSaveDesc.style.display = "inline-block";
    }

    // ===== BESKRIVELSE-REDIGERING: LAGRE ENDRINGER =====
    // Når admin er ferdig med redigering, lagre endringene i databasen
    async function saveDescEdit() {
      const raceId = Number(raceSelect.value);
      if (!raceId) return;

      // Oppdater databasen med ny beskrivelse
      const { error } = await window.supabaseClient
        .from("Races")
        .update({ description: raceDesc.value.trim() })
        .eq("id", raceId);

      if (error) {
        console.error("Error updating description:", error);
        alert("Feil ved lagring: " + error.message);
        return;
      }

      // Gjør tekstfeltet skrivebeskyttet igjen
      raceDesc.readOnly = true;
      btnEditDesc.style.display = "inline-block";
      btnSaveDesc.style.display = "none";

      // Oppdater data-attributten så vi har den nye verdien i minnet
      const selectedOption = raceSelect.options[raceSelect.selectedIndex];
      selectedOption.dataset.description = raceDesc.value.trim();

      alert("Beskrivelse lagret!");
    }

    async function saveTime() {
      // ===== TIDSREGISTRERING: LAGRE TID =====
      // Denne er den viktigste funksjonen! Den registrerer en rundetid for bruker
      // Funksjonen validerer format, beregner sekunder, og lagrer i databasen
      if (!currentUser) return alert("Ikke innlogget");
      const raceId = Number(raceSelect.value);
      const timeInput_value = timeInput.value.trim();

      // Validering: Løp må være valgt
      if (!raceId) return alert("Velg løp");

      // Hent track_id fra selected option (lagret når vi fylte løps-dropdown)
      const selectedOption = raceSelect.options[raceSelect.selectedIndex];
      const trackId = Number(selectedOption.dataset.trackId);

      // ===== PARSE TIDSFORMAT =====
      // Brukeren skriver tid som MM:SS.MS (f.eks. 1:23.45)
      // Vi må konvertere dette til totalt sekunder for lagring
      // Regex-pattern: Minutter (1-2 sifre) : Sekunder (2 sifre) . Centisekunder (2 sifre)
      const timeRegex = /^(\d{1,2}):(\d{2})\.(\d{2})$/;
      const match = timeInput_value.match(timeRegex);

      // Hvis formatet er feil, vis feilmelding
      if (!match) {
        return alert(
          "Skriv gyldig rundetid i format MM:SS.MS (f.eks. 1:23.45)",
        );
      }

      // Ekstrahér minutter, sekunder og centisekunder fra regex-match
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const centiseconds = parseInt(match[3]);

      // Beregn totalsum i sekunder som desimaltall
      // Eksempel: 1:23.45 = (1*60) + 23 + (45/100) = 83.45 sekunder
      const totalSeconds = minutes * 60 + seconds + centiseconds / 100;

      // Hent brukernavnet fra brukerens profil
      // Bruker enten brukernavn fra metadata, eller e-post som fallback
      const username =
        currentUser.user_metadata?.username || currentUser.email || "Ukjent";

      // ===== SJEKK FOR DUPLIKAT =====
      // Bruker kan bare registrere EN tid per løp
      // Sjekk om bruker allerede har registrert tid for dette løpet
      const { data: existing } = await window.supabaseClient
        .from("Times")
        .select("id")
        .eq("user_id", currentUser.id)
        .eq("race_id", raceId)
        .single();

      // Hvis bruker allerede har en tid, avbryt
      if (existing) {
        return alert("Du har allerede registrert en tid for dette løpet");
      }

      // ===== LAGRE I DATABASE =====
      // Innsert ny tidsregistrering
      // Plassering, handicap og poeng beregnes senere av calculateRaceResults-funksjonen
      const { data, error } = await window.supabaseClient.from("Times").insert([
        {
          user_id: currentUser.id,
          race_id: raceId,
          track_id: trackId,
          time: totalSeconds,
          username: username,
          fastest_lap: false, // Settes korrekt ved beregning
          placement: null, // Beregnes basert på rekkefølge
          handicap_kg: null, // Beregnes basert på plassering
          points: null, // Beregnes basert på plassering
        },
      ]);

      if (error) {
        console.error("Error saving time:", error);
        alert("Feil ved lagring: " + error.message);
        return;
      }

      // Rydd input-feltet
      timeInput.value = "";

      // ===== BEREGN RESULTATER =====
      // Nå som en ny tid er lagt inn, må vi beregne plasseringer, handicap og poeng
      // for hele løpet (ikke bare for denne brukeren)
      await calculateRaceResults(raceId);

      // Oppdater alle resultat-listene på skjermen
      loadTimes();
      loadLeaderboard();
      loadStandings();
    }

    async function calculateRaceResults(raceId) {
      // ===== BEREGNING: RESULTAT BEREGNINGER =====
      // Denne funksjonen beregner plassering, handicap og poeng for alle deltakere i et løp
      // Dette kjøres automatisk når en ny tid registreres

      // Hent alle tider for dette løpet, sortert etter tid (raskeste først)
      const { data, error } = await window.supabaseClient
        .from("Times")
        .select("*")
        .eq("race_id", raceId)
        .order("time", { ascending: true });

      if (error || !data) {
        console.error("Error fetching race times:", error);
        return;
      }

      // ===== POENGFORDELING =====
      // Systemet gir poeng basert på plassering:
      // 1. plass: 15 poeng
      // 2. plass: 13 poeng
      // 3. plass: 11 poeng
      // 4. plass: 10 poeng
      // 5+ plass: 0 poeng
      // Bonus: +1 poeng for raskeste runde
      const pointsMap = { 1: 15, 2: 13, 3: 11, 4: 10 };

      // ===== HANDICAP-FORDELING =====
      // Handicap er vekt som legges til bilen basert på plassering (simulerer F1-regel)
      // Formål: Jevne ut feltet for neste løp
      // 1. plass: +20 kg
      // 2. plass: +10 kg
      // 3. plass: +5 kg
      // 4+ plass: +0 kg
      const handicapMap = { 1: 20, 2: 10, 3: 5 };

      // Finn den raskeste tiden i løpet (brukes for å markere raskeste runde)
      const fastestTime = data.length ? data[0].time : null;

      // Iterer gjennom alle deltakere (sortert etter tid)
      for (let i = 0; i < data.length; i++) {
        const time = data[i];
        const placement = i + 1; // Plassering: 1, 2, 3, osv.
        const handicap = handicapMap[placement] || 0; // Handicap fra map

        // Sjekk om denne tidsresultatet er den raskeste (for icon/markering)
        const isFastest = fastestTime !== null && time.time === fastestTime;

        // Hent poeng fra map, og legg til bonuspoeng hvis raskeste runde
        let points = pointsMap[placement] || 0;
        if (isFastest) points += 1; // +1 poeng for raskeste runde

        // Oppdater databasen med beregnede verdier
        await window.supabaseClient
          .from("Times")
          .update({
            placement: placement,
            handicap_kg: handicap,
            points: points,
            fastest_lap: isFastest,
          })
          .eq("id", time.id);
      }
    }

    async function loadTimes() {
      // ===== LAST BRUKERENS TIDER =====
      // Denne funksjonen henter og viser brukerens egne tider for valgt løp
      // Vises i "Dine tider"-kolonnen på skjermen

      if (!currentUser) return;
      const raceId = Number(raceSelect.value);
      if (!raceId) {
        timesList.innerHTML = "<li class='list-group-item'>Velg løp</li>";
        return;
      }

      // Hent alle tider som tilhører innlogget bruker for dette løpet
      const { data, error } = await window.supabaseClient
        .from("Times")
        .select("*")
        .eq("user_id", currentUser.id)
        .eq("race_id", raceId)
        .order("time", { ascending: true });

      timesList.innerHTML = "";

      // Generer HTML-liste over brukerens tider
      (data || []).forEach((t, i) => {
        const li = document.createElement("li");
        li.className = "list-group-item";

        // ===== KONVERTER SEKUNDER TILBAKE TIL MM:SS.MS VISNING =====
        // Tidsformatet er lagret som desimaltall (sekunder) i databasen
        // Vi må konvertere det tilbake til lesbar format for bruker
        const totalSec = t.time;
        const minutes = Math.floor(totalSec / 60); // Heltall minutter
        const seconds = Math.floor(totalSec % 60); // Gjenstående sekunder
        const centiseconds = Math.round((totalSec % 1) * 100); // Desimalpart * 100

        // Formatér som MM:SS.MS med nullpadding
        const formatted = `${minutes}:${String(seconds).padStart(
          2,
          "0",
        )}.${String(centiseconds).padStart(2, "0")}`;

        // Legg til ikonmarkering hvis dette er raskeste runde
        const fastestTag = t.fastest_lap ? " 🏁" : "";

        // Vise handicap hvis det finnes
        const handicapText = t.handicap_kg > 0 ? `, ${t.handicap_kg}kg` : "";

        // Sett innhold: tid (plassering, handicap) [raskeste runde-icon]
        li.textContent = `${formatted} (P${t.placement}${handicapText})${fastestTag}`;
        timesList.appendChild(li);
      });

      // Vis melding hvis bruker har ingen tider
      if ((data || []).length === 0)
        timesList.innerHTML = "<li class='list-group-item'>Ingen tider</li>";
    }

    async function loadLeaderboard() {
      // ===== LAST LØPS-LEDERTABELL =====
      // Denne funksjonen henter og viser resultatene for alle deltakere i valgt løp
      // Sortert etter tidsrekkefølge (raskeste først)
      // Vises i "Resultat - Dette løpet"-kolonnen på skjermen

      const raceId = Number(raceSelect.value);
      if (!raceId) {
        leaderboard.innerHTML = "<li class='list-group-item'>Velg løp</li>";
        return;
      }

      // Hent alle tider for dette løpet med brukerinfo
      const { data, error } = await window.supabaseClient
        .from("Times")
        .select("time, username, placement, handicap_kg, fastest_lap, points")
        .eq("race_id", raceId)
        .order("time", { ascending: true });

      leaderboard.innerHTML = "";

      // Håndter tom liste
      if ((data || []).length === 0) {
        leaderboard.innerHTML = "<li class='list-group-item'>Ingen tider</li>";
        return;
      }

      // Få den raskeste tiden for å beregne differanser
      const winnerTime = data[0].time;

      // Generer ledertabell med alle deltakere
      (data || []).forEach((t, i) => {
        // ===== KONVERTER SEKUNDER TIL MM:SS.MS VISNING =====
        const totalSec = t.time;
        const minutes = Math.floor(totalSec / 60);
        const seconds = Math.floor(totalSec % 60);
        const centiseconds = Math.round((totalSec % 1) * 100);
        const formatted = `${minutes}:${String(seconds).padStart(
          2,
          "0",
        )}.${String(centiseconds).padStart(2, "0")}`;

        // ===== BEREGN TIDSDIFFERANSE =====
        // Viser hvor mye raskere/saktere hver deltaker var i forhold til vinneren
        let diffText = "";
        if (i > 0) {
          // Vinneren (plass 1) får ikke differanse
          const diff = totalSec - winnerTime;
          const diffMin = Math.floor(diff / 60);
          const diffSec = Math.floor(diff % 60);
          const diffCenti = Math.round((diff % 1) * 100);

          // Formatering avhenger av om differansen er større enn 1 minutt
          if (diffMin > 0) {
            diffText = ` (+${diffMin}:${String(diffSec).padStart(
              2,
              "0",
            )}.${String(diffCenti).padStart(2, "0")})`;
          } else {
            diffText = ` (+${diffSec}.${String(diffCenti).padStart(2, "0")}s)`;
          }
        }

        // Legg til raskeste runde-icon hvis denne deltakeren hadde det
        const fastestTag = t.fastest_lap ? " 🏁" : "";

        // Vis handicap som skal påsettes neste løp
        const handicapText = `+${t.handicap_kg || 0}kg`;

        // Opprett listeelement med komplett informasjon
        const li = document.createElement("li");
        li.className = "list-group-item";
        // Format: "#. Navn — Tid (+Differanse) | handicap +Xkg | Ypoeng [🏁]"
        li.textContent = `${i + 1}. ${
          t.username
        } — ${formatted}${diffText} | handicap ${handicapText} | ${
          t.points
        }p${fastestTag}`;
        leaderboard.appendChild(li);
      });
    }

    async function loadStandings() {
      // ===== LAST SESONG-STILLING =====
      // Denne funksjonen henter og viser sammenlagt poengstilling for hele sesongen
      // Den summerer poeng og handicap fra alle løp for hver bruker
      // Sortert etter poeng (mest poeng først)
      // Vises i "Sammenlagt (sesong)"-kolonnen på skjermen

      // Hent sesong-ID fra dropdown
      const seasonId = Number(seasonSelect.value);
      standings.innerHTML = "";

      // Hvis ingen sesong er valgt, vis instruksjon
      if (!seasonId) {
        standings.innerHTML = "<li class='list-group-item'>Velg sesong</li>";
        return;
      }

      // ===== HENT ALLE TIDER I SESONGEN =====
      // Bruk relasjon "Races!inner(grandprix_id)" for å bare hente tider fra løp i valgt sesong
      // "inner" betyr at det må finnes minst en matching løp (filtrer bort data uten løp)
      const { data, error } = await window.supabaseClient
        .from("Times")
        .select("username, points, handicap_kg, Races!inner(grandprix_id)")
        .eq("Races.grandprix_id", seasonId);

      // Håndter feil
      if (error) {
        console.error("Error loading standings:", error);
        standings.innerHTML =
          "<li class='list-group-item'>Feil ved henting</li>";
        return;
      }

      // ===== AGGREGER POENG OG HANDICAP PER BRUKER =====
      // Vi må summere alle poeng fra alle løp for hver bruker
      // Og summere all handicap fra alle løp
      const userTotals = {};
      (data || []).forEach((t) => {
        const name = t.username || "Ukjent";

        // Opprett ny brukerposten hvis den ikke finnes
        if (!userTotals[name]) {
          userTotals[name] = { points: 0, handicapKg: 0 };
        }

        // Legg til poeng og handicap fra denne tidsresultatet
        userTotals[name].points += t.points || 0;
        userTotals[name].handicapKg += t.handicap_kg || 0;
      });

      // ===== SORTÉR ETTER POENG =====
      // Konverter objekt til array, legg til brukernavnet, og sorter
      const sorted = Object.entries(userTotals)
        .map(([username, totals]) => ({ username, ...totals }))
        .sort((a, b) => b.points - a.points); // Synkende sortering (høyest poeng først)

      // Vis melding hvis ingen data
      if (sorted.length === 0) {
        standings.innerHTML = "<li class='list-group-item'>Ingen data</li>";
        return;
      }

      // ===== GENERER SESONG-STILLING-LISTE =====
      sorted.forEach((u, i) => {
        const li = document.createElement("li");
        li.className = "list-group-item";
        // Format: "#. Brukernavn — X poeng, Y kg totalt"
        li.textContent = `${i + 1}. ${u.username} — ${u.points} p, ${
          u.handicapKg
        } kg totalt`;
        standings.appendChild(li);
      });
    }

    // ===== EVENT LISTENERS: KOBLE FUNKSJONER TIL KNAPPER =====
    // Disse koder knytte JavaScript-funksjoner til HTML-knapper
    // Når bruker klikker knapp, kjøres den tilhørende funksjonen

    // Autentisering-knapper
    btnRegister.addEventListener("click", register); // Registrer ny bruker
    btnLogin.addEventListener("click", login); // Logg inn
    btnLogout.addEventListener("click", logout); // Logg ut

    // Tidsregistrering
    btnSave.addEventListener("click", saveTime); // Lagre rundetid

    // Admin-funksjoner
    btnCreateGP.addEventListener("click", createSeason); // Opprett ny sesong
    btnCreateRace.addEventListener("click", createRace); // Opprett nytt løp
    btnEditDesc.addEventListener("click", enableDescEdit); // Rediger løpsbeskrivelse
    btnSaveDesc.addEventListener("click", saveDescEdit); // Lagre redigert beskrivelse

    // ===== DROPDOWN-ENDRING: LAST LØPER NÅR SESONG SKIFTES =====
    // Når bruker velger en ny sesong, last løpene for den sesongen
    seasonSelect.addEventListener("change", loadRaces);

    // ===== ADMIN-SESONG-SYNK =====
    // Når admin velger sesong, synkronisér til bruker-dropdownen
    // (Dette holder admin og bruker-dropdowns i synk)
    if (adminSeasonSelect) {
      adminSeasonSelect.addEventListener("change", () => {
        seasonSelect.value = adminSeasonSelect.value; // Oppdater bruker-dropdown
        loadRaces(); // Last løpene for valgt sesong
      });
    }

    // ===== DROPDOWN-ENDRING: VIS LØPSBESKRIVELSE NÅR LØP VELGES =====
    // Når bruker velger et løp, vis beskrivelsen og last alle resultater
    raceSelect.addEventListener("change", showRaceDescription);

    console.log("Event listeners attached"); // Debug-melding: alle event listeners er klare
  }); // end DOMContentLoaded
})(); // end IIFE - avslutter hele appen
