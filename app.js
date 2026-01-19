(function () {
  console.log("App.js loaded");
  if (window.supabaseInitialized) {
    console.log("Already initialized, returning");
    return;
  }
  window.supabaseInitialized = true;

  document.addEventListener("DOMContentLoaded", () => {
    console.log("DOMContentLoaded fired");
    console.log("window.supabaseClient available:", !!window.supabaseClient);

    if (!window.supabaseClient) {
      console.error("ERROR: window.supabaseClient is not available!");
      return;
    }

    const loginOverlay = document.getElementById("loginOverlay");
    const main = document.getElementById("main");
    const usernameEl = document.getElementById("username");
    const emailEl = document.getElementById("email");
    const passwordEl = document.getElementById("password");
    const authMsg = document.getElementById("authMsg");

    const btnLogin = document.getElementById("btnLogin");
    const btnRegister = document.getElementById("btnRegister");
    const btnLogout = document.getElementById("btnLogout");
    const btnSave = document.getElementById("btnSave");

    const trackSelect = document.getElementById("trackSelect");
    const raceSelect = document.getElementById("raceSelect");
    const timeInput = document.getElementById("timeInput");
    const fastestLapInput = document.getElementById("fastestLap");
    const timesList = document.getElementById("timesList");
    const leaderboard = document.getElementById("leaderboard");
    const standings = document.getElementById("standings");

    // Admin elements
    const adminSection = document.getElementById("adminSection");
    const newRaceName = document.getElementById("newRaceName");
    const newRaceDesc = document.getElementById("newRaceDesc");
    const btnCreateRace = document.getElementById("btnCreateRace");
    const raceDescSection = document.getElementById("raceDescSection");
    const raceDesc = document.getElementById("raceDesc");
    const btnEditDesc = document.getElementById("btnEditDesc");
    const btnSaveDesc = document.getElementById("btnSaveDesc");

    let currentUser = null;
    let isAdmin = false;

    function showMsg(msg, isError = true) {
      authMsg.style.color = isError ? "red" : "green";
      authMsg.textContent = msg;
    }
    function clearMsg() {
      authMsg.textContent = "";
    }
    function showMain() {
      loginOverlay.style.display = "none";
      main.style.display = "block";
    }

    async function register() {
      console.log("Register clicked");
      clearMsg();
      const username = usernameEl.value.trim();
      const email = emailEl.value.trim();
      const password = passwordEl.value;
      if (!username || !email || !password)
        return showMsg("Fyll inn brukernavn, epost og passord");

      try {
        const { data, error } = await window.supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username,
            },
          },
        });
        if (error) return showMsg("Register feilet: " + error.message);

        // Lagre også i Users-tabellen for username-søk
        await window.supabaseClient.from("Users").insert([
          {
            email: email,
            username: username,
          },
        ]);

        showMsg("Registrert! Sjekk epost for bekreftelse", false);
        usernameEl.value = "";
        emailEl.value = "";
        passwordEl.value = "";
      } catch (e) {
        console.error(e);
        showMsg("Register exception, se console");
      }
    }

    async function login() {
      console.log("Login clicked");
      clearMsg();
      const usernameInput = usernameEl.value.trim();
      const emailInput = emailEl.value.trim();
      const password = passwordEl.value;

      if (!password) return showMsg("Fyll inn passord");
      if (!usernameInput && !emailInput)
        return showMsg("Fyll inn brukernavn eller epost");

      try {
        let email = emailInput;

        // Hvis brukernavn er fylt ut, finn epost fra Users-tabellen
        if (usernameInput && !emailInput) {
          const { data: userData } = await window.supabaseClient
            .from("Users")
            .select("email, is_admin")
            .eq("username", usernameInput)
            .single();

          if (userData) {
            email = userData.email;
            isAdmin = userData.is_admin || false;
          } else {
            return showMsg("Brukernavn ikke funnet");
          }
        } else if (emailInput) {
          // Sjekk admin-status for email
          const { data: userData } = await window.supabaseClient
            .from("Users")
            .select("is_admin")
            .eq("email", emailInput)
            .single();
          isAdmin = userData?.is_admin || false;
        }

        const { data, error } =
          await window.supabaseClient.auth.signInWithPassword({
            email,
            password,
          });
        if (error) return showMsg("Login feilet: " + error.message);
        currentUser = data.user;
        console.log("Logged in user:", currentUser);
        console.log("User metadata:", currentUser?.user_metadata);
        console.log("Is admin:", isAdmin);

        if (isAdmin) {
          adminSection.style.display = "block";
        }

        if (currentUser) showMain();
        loadTracks();
        showMsg("Innlogget!", false);
        usernameEl.value = "";
        emailEl.value = "";
        passwordEl.value = "";
      } catch (e) {
        console.error(e);
        showMsg("Login exception, se console");
      }
    }

    async function logout() {
      await window.supabaseClient.auth.signOut();
      location.reload();
    }

    async function loadTracks() {
      const { data, error } = await window.supabaseClient
        .from("Tracks")
        .select("*")
        .order("id", { ascending: true });
      if (error) return alert("Feil ved henting av baner: " + error.message);
      trackSelect.innerHTML = '<option value="">Velg bane</option>';
      (data || []).forEach((t) => {
        const o = document.createElement("option");
        o.value = t.id;
        o.textContent = t.track_name;
        trackSelect.appendChild(o);
      });
    }

    async function loadRaces() {
      const trackId = Number(trackSelect.value);
      if (!trackId) {
        raceSelect.innerHTML = '<option value="">Velg bane først</option>';
        raceDescSection.style.display = "none";
        return;
      }

      const { data, error } = await window.supabaseClient
        .from("Races")
        .select("*")
        .eq("track_id", trackId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error loading races:", error);
        return;
      }

      raceSelect.innerHTML = '<option value="">Velg løp</option>';
      (data || []).forEach((r) => {
        const o = document.createElement("option");
        o.value = r.id;
        o.textContent = r.race_name;
        o.dataset.description = r.description || "";
        raceSelect.appendChild(o);
      });
    }

    async function showRaceDescription() {
      const raceId = Number(raceSelect.value);
      if (!raceId) {
        raceDescSection.style.display = "none";
        return;
      }

      const selectedOption = raceSelect.options[raceSelect.selectedIndex];
      const description = selectedOption.dataset.description || "";

      raceDescSection.style.display = "block";
      raceDesc.value = description;

      if (isAdmin) {
        btnEditDesc.style.display = "inline-block";
      }

      loadTimes();
      loadLeaderboard();
      loadStandings();
    }

    async function createRace() {
      const trackId = Number(trackSelect.value);
      const raceName = newRaceName.value.trim();

      if (!trackId || !raceName) {
        return alert("Velg bane og skriv løpsnavn");
      }

      const { data, error } = await window.supabaseClient.from("Races").insert([
        {
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

      newRaceName.value = "";
      newRaceDesc.value = "";
      loadRaces();
      alert("Løp opprettet!");
    }

    function enableDescEdit() {
      raceDesc.readOnly = false;
      btnEditDesc.style.display = "none";
      btnSaveDesc.style.display = "inline-block";
    }

    async function saveDescEdit() {
      const raceId = Number(raceSelect.value);
      if (!raceId) return;

      const { error } = await window.supabaseClient
        .from("Races")
        .update({ description: raceDesc.value.trim() })
        .eq("id", raceId);

      if (error) {
        console.error("Error updating description:", error);
        alert("Feil ved lagring: " + error.message);
        return;
      }

      raceDesc.readOnly = true;
      btnEditDesc.style.display = "inline-block";
      btnSaveDesc.style.display = "none";

      // Oppdater dataset
      const selectedOption = raceSelect.options[raceSelect.selectedIndex];
      selectedOption.dataset.description = raceDesc.value.trim();

      alert("Beskrivelse lagret!");
    }

    async function saveTime() {
      if (!currentUser) return alert("Ikke innlogget");
      const raceId = Number(raceSelect.value);
      const timeInput_value = timeInput.value.trim();
      const fastestLap = fastestLapInput.checked;

      if (!raceId) return alert("Velg løp");

      // Parse rundetid fra format MM:SS.MS til sekund
      const timeRegex = /^(\d{1,2}):(\d{2})\.(\d{2})$/;
      const match = timeInput_value.match(timeRegex);

      if (!match) {
        return alert(
          "Skriv gyldig rundetid i format MM:SS.MS (f.eks. 1:23.45)"
        );
      }

      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const centiseconds = parseInt(match[3]);
      const totalSeconds = minutes * 60 + seconds + centiseconds / 100;

      // Hent brukernavnet fra user metadata
      const username =
        currentUser.user_metadata?.username || currentUser.email || "Ukjent";

      // Sjekk om bruker allerede har registrert tid for dette løpet
      const { data: existing } = await window.supabaseClient
        .from("Times")
        .select("id")
        .eq("user_id", currentUser.id)
        .eq("race_id", raceId)
        .single();

      if (existing) {
        return alert("Du har allerede registrert en tid for dette løpet");
      }

      // Lagre tid (plassering og handicap beregnes automatisk etterpå)
      const { data, error } = await window.supabaseClient.from("Times").insert([
        {
          user_id: currentUser.id,
          race_id: raceId,
          track_id: Number(trackSelect.value),
          time: totalSeconds,
          username: username,
          fastest_lap: fastestLap,
          placement: null,
          handicap_kg: null,
          points: null,
        },
      ]);

      if (error) {
        console.error("Error saving time:", error);
        alert("Feil ved lagring: " + error.message);
        return;
      }

      timeInput.value = "";
      fastestLapInput.checked = false;

      // Beregn plasseringer og handicap for dette løpet
      await calculateRaceResults(raceId);

      loadTimes();
      loadLeaderboard();
      loadStandings();
    }

    async function calculateRaceResults(raceId) {
      // Hent alle tider for dette løpet, sortert etter tid
      const { data, error } = await window.supabaseClient
        .from("Times")
        .select("*")
        .eq("race_id", raceId)
        .order("time", { ascending: true });

      if (error || !data) {
        console.error("Error fetching race times:", error);
        return;
      }

      // Poengsystem: 1=15, 2=13, 3=11, 4=10, 5+=0
      // Handicap: 1=20kg, 2=10kg, 3=5kg, 4+=0kg
      const handicapMap = { 1: 20, 2: 10, 3: 5 };
      const pointsMap = { 1: 15, 2: 13, 3: 11, 4: 10 };

      for (let i = 0; i < data.length; i++) {
        const time = data[i];
        const placement = i + 1;
        const handicap = handicapMap[placement] || 0;
        let points = pointsMap[placement] || 0;
        if (time.fastest_lap) points += 1;

        // Oppdater i databasen
        await window.supabaseClient
          .from("Times")
          .update({
            placement: placement,
            handicap_kg: handicap,
            points: points,
          })
          .eq("id", time.id);
      }
    }

    async function loadTimes() {
      if (!currentUser) return;
      const raceId = Number(raceSelect.value);
      if (!raceId) {
        timesList.innerHTML = "<li class='list-group-item'>Velg løp</li>";
        return;
      }

      const { data, error } = await window.supabaseClient
        .from("Times")
        .select("*")
        .eq("user_id", currentUser.id)
        .eq("race_id", raceId)
        .order("time", { ascending: true });

      timesList.innerHTML = "";
      (data || []).forEach((t, i) => {
        const li = document.createElement("li");
        li.className = "list-group-item";
        // Format sekunder til MM:SS.MS
        const totalSec = t.time;
        const minutes = Math.floor(totalSec / 60);
        const seconds = Math.floor(totalSec % 60);
        const centiseconds = Math.round((totalSec % 1) * 100);
        const formatted = `${minutes}:${String(seconds).padStart(
          2,
          "0"
        )}.${String(centiseconds).padStart(2, "0")}`;

        const fastestTag = t.fastest_lap ? " 🏁" : "";
        const handicapText = t.handicap_kg > 0 ? `, ${t.handicap_kg}kg` : "";
        li.textContent = `${formatted} (P${t.placement}${handicapText})${fastestTag}`;
        timesList.appendChild(li);
      });
      if ((data || []).length === 0)
        timesList.innerHTML = "<li class='list-group-item'>Ingen tider</li>";
    }

    async function loadLeaderboard() {
      const raceId = Number(raceSelect.value);
      if (!raceId) {
        leaderboard.innerHTML = "<li class='list-group-item'>Velg løp</li>";
        return;
      }

      const { data, error } = await window.supabaseClient
        .from("Times")
        .select("time, username, placement, handicap_kg, fastest_lap, points")
        .eq("race_id", raceId)
        .order("time", { ascending: true });

      leaderboard.innerHTML = "";

      if ((data || []).length === 0) {
        leaderboard.innerHTML = "<li class='list-group-item'>Ingen tider</li>";
        return;
      }

      const winnerTime = data[0].time;

      // Vis tider med brukernavn og differanse
      (data || []).forEach((t, i) => {
        // Format sekunder til MM:SS.MS
        const totalSec = t.time;
        const minutes = Math.floor(totalSec / 60);
        const seconds = Math.floor(totalSec % 60);
        const centiseconds = Math.round((totalSec % 1) * 100);
        const formatted = `${minutes}:${String(seconds).padStart(
          2,
          "0"
        )}.${String(centiseconds).padStart(2, "0")}`;

        // Beregn differanse
        let diffText = "";
        if (i > 0) {
          const diff = totalSec - winnerTime;
          const diffMin = Math.floor(diff / 60);
          const diffSec = Math.floor(diff % 60);
          const diffCenti = Math.round((diff % 1) * 100);
          if (diffMin > 0) {
            diffText = ` (+${diffMin}:${String(diffSec).padStart(
              2,
              "0"
            )}.${String(diffCenti).padStart(2, "0")})`;
          } else {
            diffText = ` (+${diffSec}.${String(diffCenti).padStart(2, "0")}s)`;
          }
        }

        const fastestTag = t.fastest_lap ? " 🏁" : "";
        const handicapText = t.handicap_kg > 0 ? `${t.handicap_kg}kg, ` : "";
        const li = document.createElement("li");
        li.className = "list-group-item";
        li.textContent = `${i + 1}. ${
          t.username
        } — ${formatted}${diffText} (${handicapText}${t.points}p)${fastestTag}`;
        leaderboard.appendChild(li);
      });
    }

    async function loadStandings() {
      // Hent alle tider med poeng
      const { data, error } = await window.supabaseClient
        .from("Times")
        .select("username, points");

      if (error) {
        console.error("Error loading standings:", error);
        return;
      }

      // Grupper og summer poeng per bruker
      const userPoints = {};
      (data || []).forEach((t) => {
        const name = t.username || "Ukjent";
        if (!userPoints[name]) {
          userPoints[name] = 0;
        }
        userPoints[name] += t.points || 0;
      });

      // Konverter til array og sorter
      const sorted = Object.entries(userPoints)
        .map(([username, points]) => ({ username, points }))
        .sort((a, b) => b.points - a.points);

      standings.innerHTML = "";
      if (sorted.length === 0) {
        standings.innerHTML = "<li class='list-group-item'>Ingen data</li>";
        return;
      }

      sorted.forEach((u, i) => {
        const li = document.createElement("li");
        li.className = "list-group-item";
        li.textContent = `${i + 1}. ${u.username} — ${u.points} poeng`;
        standings.appendChild(li);
      });
    }

    btnRegister.addEventListener("click", register);
    btnLogin.addEventListener("click", login);
    btnLogout.addEventListener("click", logout);
    btnSave.addEventListener("click", saveTime);
    btnCreateRace.addEventListener("click", createRace);
    btnEditDesc.addEventListener("click", enableDescEdit);
    btnSaveDesc.addEventListener("click", saveDescEdit);

    trackSelect.addEventListener("change", loadRaces);
    raceSelect.addEventListener("change", showRaceDescription);

    console.log("Event listeners attached");
  }); // DOMContentLoaded
})(); // end IIFE
