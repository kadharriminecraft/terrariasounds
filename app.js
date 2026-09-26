/* ==========================================================
   Terraria Sounds — app logic
   Sections: config · state · helpers · render · playback · scan · events
   ========================================================== */
(() => {
  "use strict";

  /* ---------- Config ---------- */
  const OWNER = "kadharriminecraft";
  const REPO = "terrariasounds";
  const BRANCH = "main";
  const RAW = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/`;
  const TREE_API = `https://api.github.com/repos/${OWNER}/${REPO}/git/trees/${BRANCH}?recursive=1`;
  const AUDIO = /\.(mp3|wav|ogg|m4a|flac|aac|opus|weba)$/i;
  // Fallback used if the GitHub API is unreachable (offline / rate-limited).
  const FALLBACK = ["Music_forrest-day.mp3", "sfx_hurt.mp3"];

  /* ---------- State ---------- */
  const state = {
    items: [],
    filter: "",
    playing: null, // { audio, card, button }
  };

  const el = {
    grid: document.getElementById("grid"),
    status: document.getElementById("status"),
    filter: document.getElementById("filter"),
    stopAll: document.getElementById("stopAll"),
    reload: document.getElementById("reload"),
  };

  /* ---------- Helpers ---------- */
  const humanSize = bytes => {
    if (!bytes) return "";
    const units = ["B", "KB", "MB", "GB"];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++; }
    return `${bytes.toFixed(bytes < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
  };

  const rawUrl = path => RAW + path.split("/").map(encodeURIComponent).join("/");
  const toItem = name => ({ name, dir: "", size: 0, url: rawUrl(name) });
  const setStatus = text => { el.status.textContent = text; };

  /* ---------- Render ---------- */
  function visibleItems() {
    const q = state.filter.trim().toLowerCase();
    return state.items.filter(f => f.name.toLowerCase().includes(q));
  }

  function createCard(file) {
    const card = document.createElement("div");
    card.className = "card";

    const button = document.createElement("button");
    button.className = "play";
    button.type = "button";
    button.textContent = "▶";
    button.setAttribute("aria-label", `Play ${file.name}`);

    const info = document.createElement("div");
    const name = document.createElement("div");
    name.className = "name";
    name.textContent = file.name;
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = [file.dir, humanSize(file.size)].filter(Boolean).join(" · ");
    info.append(name, meta);

    button.addEventListener("click", () => play(card, file, button));
    card.append(button, info);
    return card;
  }

  function render() {
    state.filter = el.filter.value;
    const shown = visibleItems();
    el.grid.replaceChildren(...shown.map(createCard));
    setStatus(shown.length
      ? `${shown.length} sound${shown.length === 1 ? "" : "s"}`
      : "No sounds found.");
  }

  /* ---------- Playback ---------- */
  function stop() {
    if (!state.playing) return;
    const { audio, card, button } = state.playing;
    audio.pause();
    button.textContent = "▶";
    card.classList.remove("playing");
    state.playing = null;
  }

  function play(card, file, button) {
    stop();
    const audio = new Audio(file.url);
    audio.preload = "none";
    button.textContent = "⏸";
    card.classList.add("playing");
    state.playing = { audio, card, button };

    audio.addEventListener("ended", () => {
      button.textContent = "▶";
      card.classList.remove("playing");
      if (state.playing && state.playing.audio === audio) state.playing = null;
    });
    audio.play().catch(err => {
      setStatus(`Couldn't play ${file.name}: ${err.message}`);
      button.textContent = "▶";
      card.classList.remove("playing");
      state.playing = null;
    });
  }

  /* ---------- Scan (GitHub tree → audio list) ---------- */
  async function scan() {
    setStatus("Loading…");
    try {
      const res = await fetch(TREE_API, { headers: { Accept: "application/vnd.github+json" } });
      if (!res.ok) throw new Error(`GitHub API ${res.status}`);
      const data = await res.json();
      const found = (data.tree || [])
        .filter(node => node.type === "blob" && AUDIO.test(node.path))
        .map(node => ({
          name: node.path.split("/").pop(),
          dir: node.path.includes("/") ? node.path.split("/").slice(0, -1).join("/") : "",
          size: node.size,
          url: rawUrl(node.path),
        }));
      state.items = found.length ? found : FALLBACK.map(toItem);
    } catch {
      state.items = FALLBACK.map(toItem);
    }
    render();
  }

  /* ---------- Events ---------- */
  el.filter.addEventListener("input", render);
  el.reload.addEventListener("click", scan);
  el.stopAll.addEventListener("click", stop);
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && state.playing) stop();
  });

  scan();
})();
