(() => {
  const KEY = "the-board/v1";
  const $ = (id) => document.getElementById(id);
  const defaultState = () => ({
    cases: structuredClone(BOARD_SEED.cases),
    notes: [],
    hiddenHeadlines: [],
    prefs: { strings: true, reduceMotion: false, grain: 35, customRss: "", seenIntro: false },
    wire: { items: BOARD_SEED.headlines, live: false, fetchedAt: null }
  });
  let state = load();
  let mode = (location.hash || "#board").slice(1) || "board";
  let drag = null;
  let docketFilter = "all";
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (!raw) return defaultState();
      return { ...defaultState(), ...raw, prefs: { ...defaultState().prefs, ...(raw.prefs || {}) }, cases: raw.cases?.length ? raw.cases : defaultState().cases };
    } catch { return defaultState(); }
  }
  function save() {
    localStorage.setItem(KEY, JSON.stringify({ cases: state.cases, notes: state.notes, hiddenHeadlines: state.hiddenHeadlines, prefs: state.prefs }));
  }
  function toast(msg) {
    const t = $("toast"); t.textContent = msg; t.hidden = false;
    setTimeout(() => { t.hidden = true; }, 2200);
  }
  function setMode(next) {
    mode = next;
    document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${next}`));
    document.querySelectorAll(".modes a").forEach((a) => a.classList.toggle("active", a.dataset.mode === next));
    if (location.hash !== `#${next}`) history.replaceState(null, "", `#${next}`);
    render();
  }
  function applyPrefs() {
    document.documentElement.style.setProperty("--grain", state.prefs.grain);
    document.body.classList.toggle("reduce", state.prefs.reduceMotion);
    $("optStrings").checked = state.prefs.strings;
    $("optMotion").checked = state.prefs.reduceMotion;
    $("optGrain").value = state.prefs.grain;
    $("optRss").value = state.prefs.customRss || "";
  }
  function q() { return ($("search").value || "").trim().toLowerCase(); }
  function matches(c) {
    const s = q(); if (!s) return true;
    return [c.title, c.shortName, c.summary, c.court, ...(c.tags || []), ...(c.defendants || [])].join(" ").toLowerCase().includes(s);
  }
  function render() { applyPrefs(); renderBoard(); renderDocket(); renderWire(); renderNotes(); }
  function renderBoard() {
    const board = $("board"); board.innerHTML = "";
    state.cases.filter((c) => c.pinned !== false && matches(c)).forEach((c) => {
      const el = document.createElement("article");
      el.className = "card";
      el.style.left = (c.boardX ?? 10) + "%";
      el.style.top = (c.boardY ?? 10) + "%";
      el.style.transform = `rotate(${c.rotation || 0}deg)`;
      el.dataset.id = c.id;
      el.innerHTML = `<span class="tack" style="background:${c.color || "var(--red)"}"></span><div class="meta">${esc(c.court || "")}</div><h3>${esc(c.shortName || c.title)}</h3><span class="status ${c.status}">${esc(c.status)}</span><p>${esc((c.summary || "").slice(0, 140))}${(c.summary || "").length > 140 ? "…" : ""}</p>`;
      el.addEventListener("pointerdown", onDragStart);
      el.addEventListener("dblclick", () => openCase(c.id));
      board.appendChild(el);
    });
    state.notes.filter((n) => n.pinnedToBoard).forEach((n) => {
      if (q() && !`${n.title} ${n.body}`.toLowerCase().includes(q())) return;
      const el = document.createElement("article");
      el.className = `sticky-note ${n.color || "yellow"}`;
      el.style.left = (n.boardX ?? 60) + "%";
      el.style.top = (n.boardY ?? 20) + "%";
      el.innerHTML = `<strong>${esc(n.title || "Note")}</strong><div>${esc((n.body || "").slice(0, 90))}</div>`;
      el.addEventListener("click", () => openNoteEditor(n.id));
      board.appendChild(el);
    });
    drawStrings();
  }
  function drawStrings() {
    const svg = $("strings"); svg.innerHTML = "";
    if (!state.prefs.strings) return;
    const board = $("board").getBoundingClientRect();
    const seen = new Set();
    state.cases.forEach((c) => {
      (c.linkedTo || []).forEach((oid) => {
        const key = [c.id, oid].sort().join(":");
        if (seen.has(key)) return; seen.add(key);
        const a = document.querySelector(`.card[data-id="${c.id}"]`);
        const b = document.querySelector(`.card[data-id="${oid}"]`);
        if (!a || !b) return;
        const ar = a.getBoundingClientRect(); const br = b.getBoundingClientRect();
        const x1 = ar.left + ar.width / 2 - board.left; const y1 = ar.top + 8 - board.top;
        const x2 = br.left + br.width / 2 - board.left; const y2 = br.top + 8 - board.top;
        const mid = (x1 + x2) / 2; const sag = Math.min(40, Math.abs(x2 - x1) * 0.12 + 16);
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", `M ${x1} ${y1} Q ${mid} ${(y1 + y2) / 2 + sag} ${x2} ${y2}`);
        path.addEventListener("click", () => {
          c.linkedTo = (c.linkedTo || []).filter((x) => x !== oid);
          const other = state.cases.find((x) => x.id === oid);
          if (other) other.linkedTo = (other.linkedTo || []).filter((x) => x !== c.id);
          save(); drawStrings(); toast("String cut");
        });
        svg.appendChild(path);
      });
    });
  }
  function onDragStart(e) {
    if (window.matchMedia("(max-width:760px)").matches) return;
    const el = e.currentTarget;
    const rect = $("board").getBoundingClientRect();
    drag = { el, id: el.dataset.id, ox: e.clientX - el.getBoundingClientRect().left, oy: e.clientY - el.getBoundingClientRect().top, rect };
    el.setPointerCapture(e.pointerId);
    el.addEventListener("pointermove", onDrag);
    el.addEventListener("pointerup", onDragEnd);
  }
  function onDrag(e) {
    if (!drag) return;
    const x = ((e.clientX - drag.rect.left - drag.ox) / drag.rect.width) * 100;
    const y = ((e.clientY - drag.rect.top - drag.oy) / drag.rect.height) * 100;
    drag.el.style.left = Math.max(0, Math.min(82, x)) + "%";
    drag.el.style.top = Math.max(0, Math.min(82, y)) + "%";
    drawStrings();
  }
  function onDragEnd() {
    if (!drag) return;
    const c = state.cases.find((x) => x.id === drag.id);
    if (c) { c.boardX = parseFloat(drag.el.style.left); c.boardY = parseFloat(drag.el.style.top); save(); }
    drag.el.removeEventListener("pointermove", onDrag);
    drag.el.removeEventListener("pointerup", onDragEnd);
    drag = null;
  }
  function renderDocket() {
    $("docketFilters").innerHTML = ["all", "breaking", "pretrial", "trial", "jury", "verdict", "appeal", "court-tv"].map((f) => `<button type="button" class="${docketFilter === f ? "on" : ""}" data-f="${f}">${f}</button>`).join("");
    $("docketFilters").onclick = (e) => { const f = e.target.dataset.f; if (!f) return; docketFilter = f; renderDocket(); };
    const rows = state.cases.filter((c) => {
      if (!matches(c)) return false;
      if (docketFilter === "all") return true;
      if (docketFilter === "court-tv") return (c.tags || []).includes("court-tv");
      return c.status === docketFilter;
    });
    $("docketBody").innerHTML = rows.map((c) => `<tr data-id="${c.id}"><td><strong>${esc(c.shortName)}</strong><div class="meta">${esc(c.title)}</div></td><td><span class="status ${c.status}">${esc(c.status)}</span></td><td>${esc(c.court || "—")}</td><td>${esc(c.nextHearing || "—")}</td><td>${(c.tags || []).map(esc).join(", ")}</td></tr>`).join("");
    $("docketBody").onclick = (e) => { const tr = e.target.closest("tr"); if (tr) openCase(tr.dataset.id); };
  }
  function renderWire() {
    $("livePill").classList.toggle("on", !!state.wire.live);
    $("livePill").textContent = state.wire.live ? "LIVE" : "WIRE";
    $("wireMeta").textContent = state.wire.live ? `Court TV feed · ${state.wire.fetchedAt || ""}` : "Wire offline — showing last known clippings";
    const items = (state.wire.items || []).filter((h) => !state.hiddenHeadlines.includes(h.id));
    const s = q();
    const shown = items.filter((h) => !s || `${h.title} ${h.snippet}`.toLowerCase().includes(s));
    $("wireList").innerHTML = shown.map((h) => {
      const match = guessCase(h);
      return `<article class="clip"><div class="src">${esc(h.source || "Court TV")} · ${esc(h.publishedAt || "")}</div><h3>${esc(h.title)}</h3><p>${esc(h.snippet || "")}</p><a href="${esc(h.url)}" target="_blank" rel="noopener">Open source ↗</a>${match ? `<div class="meta">Possible match: ${esc(match.shortName)}</div>` : ""}</article>`;
    }).join("") || "<p class='panel'>Nothing on the wire.</p>";
  }
  function guessCase(h) {
    const blob = `${h.title} ${h.snippet}`.toLowerCase();
    return state.cases.find((c) => [c.shortName, ...(c.defendants || [])].some((n) => n && blob.includes(n.toLowerCase().split(" ").pop())));
  }
  function renderNotes() {
    const s = q();
    const list = state.notes.filter((n) => !s || `${n.title} ${n.body}`.toLowerCase().includes(s));
    $("noteGrid").innerHTML = list.map((n) => `<article class="note-card ${n.color || "yellow"}" data-id="${n.id}"><h3>${esc(n.title || "Untitled")}</h3><p>${esc(n.body || "")}</p></article>`).join("") || "<p class='panel'>Notebook is empty. Stamp a note.</p>";
    $("noteGrid").onclick = (e) => { const n = e.target.closest("[data-id]"); if (n) openNoteEditor(n.dataset.id); };
  }
  function openCase(id) {
    const c = state.cases.find((x) => x.id === id); if (!c) return;
    const others = state.cases.filter((x) => x.id !== id);
    $("drawerInner").innerHTML = `<header class="dossier-top"><span class="stamp">${esc(c.status)}</span><button type="button" class="iconbtn" data-close="drawer">✕</button></header><div class="meta">${esc(c.jurisdiction || "")} · ${esc(c.court || "")}</div><h2>${esc(c.title)}</h2><p class="lede">${esc(c.summary)}</p><p><em>${esc(c.whyItMatters || "")}</em></p><h3>Timeline</h3><ul>${(c.timeline || []).map((t) => `<li><span class="meta">${esc(t.date)}</span> ${esc(t.text)}</li>`).join("") || "<li>No events yet</li>"}</ul><form id="tlForm" class="row"><input name="date" placeholder="Date" /><input name="text" placeholder="What happened" /><button class="tagbtn" type="submit">Add event</button></form><h3>Sources</h3><div class="sources">${(c.sources || []).map((s) => `<div><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a></div>`).join("")}</div><div class="row gap" style="margin-top:1rem"><button type="button" class="tagbtn" id="pinToggle">${c.pinned === false ? "Pin" : "Unpin"}</button><select id="linkTo"><option value="">Link with red string…</option>${others.map((o) => `<option value="${o.id}">${esc(o.shortName)}</option>`).join("")}</select></div>`;
    $("drawer").hidden = false;
    $("drawerInner").querySelector("[data-close]").onclick = () => { $("drawer").hidden = true; };
    $("tlForm").onsubmit = (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const date = fd.get("date"); const text = fd.get("text"); if (!text) return;
      c.timeline = c.timeline || []; c.timeline.push({ date, text }); save(); openCase(id); toast("Event added");
    };
    $("pinToggle").onclick = () => { c.pinned = c.pinned === false; save(); render(); openCase(id); };
    $("linkTo").onchange = (e) => {
      const oid = e.target.value; if (!oid) return;
      c.linkedTo = Array.from(new Set([...(c.linkedTo || []), oid]));
      const o = state.cases.find((x) => x.id === oid);
      if (o) o.linkedTo = Array.from(new Set([...(o.linkedTo || []), c.id]));
      save(); render(); toast("String tied");
    };
  }
  function formModal(title, fields, onSubmit) {
    const form = $("modalForm");
    form.innerHTML = `<h2>${title}</h2>` + fields.map((f) => {
      if (f.type === "textarea") return `<label class="row">${f.label}<textarea name="${f.name}" rows="4">${esc(f.value || "")}</textarea></label>`;
      if (f.type === "select") return `<label class="row">${f.label}<select name="${f.name}">${f.options.map((o) => `<option ${o === f.value ? "selected" : ""}>${o}</option>`).join("")}</select></label>`;
      return `<label class="row">${f.label}<input name="${f.name}" value="${esc(f.value || "")}" /></label>`;
    }).join("") + `<div class="row gap"><button class="tagbtn" type="submit">Save</button><button type="button" class="tagbtn ghost" id="cancelModal">Cancel</button></div>`;
    $("modal").hidden = false;
    $("cancelModal").onclick = () => { $("modal").hidden = true; };
    form.onsubmit = (e) => { e.preventDefault(); onSubmit(Object.fromEntries(new FormData(form).entries())); $("modal").hidden = true; };
  }
  function openNoteEditor(id) {
    const n = id ? state.notes.find((x) => x.id === id) : { title: "", body: "", color: "yellow", pinnedToBoard: true };
    formModal(id ? "Edit note" : "New note", [
      { name: "title", label: "Title", value: n.title },
      { name: "body", label: "Note", type: "textarea", value: n.body },
      { name: "color", label: "Color", type: "select", options: ["yellow", "peach", "green"], value: n.color || "yellow" }
    ], (data) => {
      if (id) Object.assign(n, data);
      else state.notes.push({ id: "n" + Date.now(), ...data, pinnedToBoard: true, boardX: 55, boardY: 28, createdAt: new Date().toISOString() });
      save(); render(); toast("Note saved");
    });
  }
  async function fetchWire() {
    const rss = state.prefs.customRss || "https://www.courttv.com/feed/";
    const proxy = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rss)}`;
    try {
      const res = await fetch(proxy, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error("proxy");
      const json = await res.json();
      const items = (json.items || []).slice(0, 16).map((it, i) => ({
        id: it.guid || it.link || "rss" + i, title: it.title, source: json.feed?.title || "Court TV",
        url: it.link, publishedAt: (it.pubDate || "").slice(0, 16),
        snippet: (it.description || "").replace(/<[^>]+>/g, "").slice(0, 180)
      }));
      if (!items.length) throw new Error("empty");
      state.wire = { items, live: true, fetchedAt: new Date().toLocaleString() };
    } catch {
      state.wire = { items: BOARD_SEED.headlines, live: false, fetchedAt: null };
    }
    renderWire();
  }
  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&", "<": "<", ">": ">", '"': """, "'": "&#39;" }[c]));
  }
  $("modes").addEventListener("click", (e) => { const a = e.target.closest("a"); if (!a) return; e.preventDefault(); setMode(a.dataset.mode); });
  window.addEventListener("hashchange", () => setMode((location.hash || "#board").slice(1)));
  $("search").addEventListener("input", render);
  $("btnAddCase").onclick = () => {
    formModal("New case file", [
      { name: "shortName", label: "Short name" }, { name: "title", label: "Full caption" }, { name: "court", label: "Court" },
      { name: "status", label: "Status", type: "select", options: ["breaking", "investigation", "pretrial", "trial", "jury", "verdict", "sentencing", "appeal", "closed"] },
      { name: "summary", label: "Briefing", type: "textarea" }, { name: "source", label: "Source URL" }
    ], (d) => {
      state.cases.push({ id: "c" + Date.now(), title: d.title || d.shortName, shortName: d.shortName || d.title, status: d.status, court: d.court, summary: d.summary, tags: ["user"], sources: d.source ? [{ label: "Source", url: d.source }] : [], pinned: true, boardX: 40, boardY: 40, rotation: (Math.random() * 4 - 2).toFixed(1), color: "#8b1e1e", linkedTo: [], timeline: [], defendants: [] });
      save(); setMode("board"); toast("Folder stamped");
    });
  };
  $("btnAddNote").onclick = () => openNoteEditor(null);
  $("btnSettings").onclick = () => { $("settings").hidden = false; };
  document.querySelector("#settings [data-close]").onclick = () => { $("settings").hidden = true; };
  $("optStrings").onchange = (e) => { state.prefs.strings = e.target.checked; save(); drawStrings(); };
  $("optMotion").onchange = (e) => { state.prefs.reduceMotion = e.target.checked; save(); applyPrefs(); };
  $("optGrain").oninput = (e) => { state.prefs.grain = e.target.value; applyPrefs(); };
  $("optGrain").onchange = () => save();
  $("optRss").onchange = (e) => { state.prefs.customRss = e.target.value; save(); };
  $("btnRefresh").onclick = fetchWire;
  $("btnResetSeed").onclick = () => { const notes = state.notes; const prefs = state.prefs; state = defaultState(); state.notes = notes; state.prefs = prefs; save(); render(); toast("Seed restored"); };
  $("btnExport").onclick = () => { const blob = new Blob([JSON.stringify({ cases: state.cases, notes: state.notes }, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "the-board-export.json"; a.click(); };
  $("btnImport").onclick = () => $("importFile").click();
  $("importFile").onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try { const data = JSON.parse(await file.text()); if (data.cases) state.cases = data.cases; if (data.notes) state.notes = data.notes; save(); render(); toast("Imported"); }
    catch { toast("Could not read file"); }
  };
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { $("drawer").hidden = true; $("modal").hidden = true; $("settings").hidden = true; }
  });
  if (!state.prefs.seenIntro) $("intro").hidden = false;
  $("btnOpenBoard").onclick = () => { state.prefs.seenIntro = true; save(); $("intro").hidden = true; };
  setMode(mode);
  fetchWire();
})();
