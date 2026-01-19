const SUPABASE_URL = "https://mvnnwmgkjmhemchiduiq.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12bm53bWdram1oZW1jaGlkdWlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyOTg2MzQsImV4cCI6MjA4Mzg3NDYzNH0.OARgOYerC5iNGr0QaR2jx8shdrddUYxc-rXCCU2dFRY";

if (typeof window.supabaseClient === "undefined") {
  window.supabaseClient = null;
}

document.addEventListener("DOMContentLoaded", () => {
  // Initialize supabase only once
  if (!window.supabaseClient) {
    window.supabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    );
  }

  const loginOverlay = document.getElementById("loginOverlay");
  const main = document.getElementById("main");
  const emailEl = document.getElementById("email");
  const passwordEl = document.getElementById("password");
  const authMsg = document.getElementById("authMsg");

  const btnLogin = document.getElementById("btnLogin");
  const btnRegister = document.getElementById("btnRegister");
  const btnLogout = document.getElementById("btnLogout");
  const btnSave = document.getElementById("btnSave");

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
    clearMsg();
    const email = emailEl.value.trim();
    const password = passwordEl.value;
    if (!email || !password) return showMsg("Fyll inn epost og passord wallah");

    try {
      const { data, error } = await window.supabaseClient.auth.signUp({
        email,
        password,
      });
      if (error) return showMsg("Register feilet: " + error.message);
      showMsg("Registrert! Sjekk epost wallah", false);
    } catch (e) {
      console.error(e);
      showMsg("Register exception, se console");
    }
  }

  async function login() {
    clearMsg();
    const email = emailEl.value.trim();
    const password = passwordEl.value;
    if (!email || !password) return showMsg("Fyll inn epost og passord wallah");

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
    const time = parseFloat(timeInput.value);
    const trackId = Number(trackSelect.value);
    if (isNaN(time) || !trackId) return alert("Skriv gyldig tid og velg bane");

    const { data, error } = await window.supabaseClient
      .from("Times")
      .insert([{ user_id: currentUser.id, track_id: trackId, time }]);
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
      li.textContent = `${i + 1}. ${t.time} sek`;
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
      .select("time, user_id")
      .eq("track_id", trackId)
      .order("time", { ascending: true })
      .limit(5);

    leaderboard.innerHTML = "";
    (data || []).forEach((t, i) => {
      const li = document.createElement("li");
      li.className = "list-group-item";
      li.textContent = `${i + 1}. ${t.time} sek — bruker: ${t.user_id}`;
      leaderboard.appendChild(li);
    });
    if ((data || []).length === 0)
      leaderboard.innerHTML = "<li class='list-group-item'>Ingen tider</li>";
  }

  btnRegister.addEventListener("click", register);
  btnLogin.addEventListener("click", login);
  btnLogout.addEventListener("click", logout);
  btnSave.addEventListener("click", saveTime);
  trackSelect.addEventListener("change", () => {
    loadTimes();
    loadLeaderboard();
  });
}); // DOMContentLoaded
