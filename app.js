(function () {
  console.log("App.js loaded");
  if (window.supabaseInitialized) {
    console.log("Already initialized, returning");
    return;
  }
  window.supabaseInitialized = true;

  const SUPABASE_URL = "https://mvnnwmgkjmhemchiduiq.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12bm53bWdram1oZW1jaGlkdWlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyOTg2MzQsImV4cCI6MjA4Mzg3NDYzNH0.OARgOYerC5iNGr0QaR2jx8shdrddUYxc-rXCCU2dFRY";

  if (typeof window.supabaseClient === "undefined") {
    window.supabaseClient = null;
  }

  // Initialiser Supabase direkte når window.supabase er tilgjengelig
  if (window.supabase) {
    console.log("Supabase library already loaded, initializing client");
    window.supabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    );
    console.log("Supabase client initialized:", window.supabaseClient);
  } else {
    console.warn("Supabase library not yet available");
  }

  document.addEventListener("DOMContentLoaded", () => {
    console.log("DOMContentLoaded fired");
    console.log("window.supabaseClient:", window.supabaseClient);

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
      const email = emailEl.value.trim();
      const password = passwordEl.value;
      if (!email || !password) return showMsg("Fyll inn epost og passord");

      try {
        const { data, error } =
          await window.supabaseClient.auth.signInWithPassword({
            email,
            password,
          });
        if (error) return showMsg("Login feilet: " + error.message);
        currentUser = data.user;
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

      const { data, error } = await window.supabaseClient.from("Times").insert([
        {
          user_id: currentUser.id,
          track_id: trackId,
          time: timeInput_value,
          time_seconds: totalSeconds,
        },
      ]);
      if (error) return console.error(error);
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
        .order("created_at", { ascending: true });

      timesList.innerHTML = "";
      (data || []).forEach((t, i) => {
        const li = document.createElement("li");
        li.className = "list-group-item";
        li.textContent = `${i + 1}. ${t.time || t.time_seconds + " sek"}`;
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
        .select("time, time_seconds, user_id")
        .eq("track_id", trackId)
        .order("time_seconds", { ascending: true })
        .limit(5);

      leaderboard.innerHTML = "";

      if ((data || []).length === 0) {
        leaderboard.innerHTML = "<li class='list-group-item'>Ingen tider</li>";
        return;
      }

      // Hent brukernamn for kvar tid
      for (let i = 0; i < data.length; i++) {
        const t = data[i];
        try {
          const { data: userData } =
            await window.supabaseClient.auth.admin.getUserById(t.user_id);
          const username = userData?.user?.user_metadata?.username || "Ukjent";

          const li = document.createElement("li");
          li.className = "list-group-item";
          li.textContent = `${i + 1}. ${
            t.time || t.time_seconds + " sek"
          } — ${username}`;
          leaderboard.appendChild(li);
        } catch (e) {
          console.error("Error fetching user:", e);
        }
      }
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
