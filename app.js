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

    console.log("Elements found:", {
      btnLogin,
      btnRegister,
      btnLogout,
      btnSave,
    });

    const trackSelect = document.getElementById("trackSelect");
    const timeInput = document.getElementById("timeInput");
    const timesList = document.getElementById("timesList");
    const leaderboard = document.getElementById("leaderboard");

    let currentUser = null;

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
      console.log("window.supabaseClient in login:", window.supabaseClient);
      console.log("window.supabaseClient?.auth:", window.supabaseClient?.auth);
      clearMsg();
      let emailInput = emailEl.value.trim();
      const password = passwordEl.value;
      if (!emailInput || !password)
        return showMsg("Fyll inn brukernavn/epost og passord");

      try {
        let email = emailInput;

        // Hvis input ikke inneholder @, søk etter username i Users-tabellen
        if (!emailInput.includes("@")) {
          const { data: userData } = await window.supabaseClient
            .from("Users")
            .select("email")
            .eq("username", emailInput)
            .single();

          if (userData) {
            email = userData.email;
          } else {
            return showMsg("Brukernavn ikke funnet");
          }
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
      trackSelect.innerHTML = "";
      (data || []).forEach((t) => {
        const o = document.createElement("option");
        o.value = t.id;
        o.textContent = t.track_name;
        trackSelect.appendChild(o);
      });
      loadTimes();
      loadLeaderboard();
    }

    async function saveTime() {
      if (!currentUser) return alert("Ikke innlogget");
      const timeInput_value = timeInput.value.trim();
      const trackId = Number(trackSelect.value);

      // Parse rundetid fra format MM:SS.MS til sekund
      const timeRegex = /^(\d{1,2}):(\d{2})\.(\d{2})$/;
      const match = timeInput_value.match(timeRegex);

      if (!match || !trackId) {
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

      const { data, error } = await window.supabaseClient.from("Times").insert([
        {
          user_id: currentUser.id,
          track_id: trackId,
          time: totalSeconds,
          username: username,
        },
      ]);
      if (error) {
        console.error("Error saving time:", error);
        alert("Feil ved lagring: " + error.message);
        return;
      }
      timeInput.value = "";
      loadTimes();
      loadLeaderboard();
    }

    async function loadTimes() {
      if (!currentUser) return;
      const trackId = Number(trackSelect.value);
      if (!trackId) {
        timesList.innerHTML = "<li class='list-group-item'>Velg bane</li>";
        return;
      }

      const { data, error } = await window.supabaseClient
        .from("Times")
        .select("*")
        .eq("user_id", currentUser.id)
        .eq("track_id", trackId)
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
        li.textContent = `${i + 1}. ${formatted}`;
        timesList.appendChild(li);
      });
      if ((data || []).length === 0)
        timesList.innerHTML = "<li class='list-group-item'>Ingen tider</li>";
    }

    async function loadLeaderboard() {
      const trackId = Number(trackSelect.value);
      if (!trackId) {
        leaderboard.innerHTML = "<li class='list-group-item'>Velg bane</li>";
        return;
      }

      const { data, error } = await window.supabaseClient
        .from("Times")
        .select("time, username")
        .eq("track_id", trackId)
        .order("time", { ascending: true })
        .limit(5);

      leaderboard.innerHTML = "";

      if ((data || []).length === 0) {
        leaderboard.innerHTML = "<li class='list-group-item'>Ingen tider</li>";
        return;
      }

      // Vis tider med brukernavn
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

        const li = document.createElement("li");
        li.className = "list-group-item";
        li.textContent = `${i + 1}. ${formatted} — ${t.username || "Ukjent"}`;
        leaderboard.appendChild(li);
      });
    }

    btnRegister.addEventListener("click", register);
    btnLogin.addEventListener("click", login);
    btnLogout.addEventListener("click", logout);
    btnSave.addEventListener("click", saveTime);
    console.log("Event listeners attached");
    trackSelect.addEventListener("change", () => {
      loadTimes();
      loadLeaderboard();
    });
  }); // DOMContentLoaded
})(); // end IIFE
