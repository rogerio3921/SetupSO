// SetupSO — MVP 2 — app.js
// Build: 2026-05-04 (com backend + autenticação)
const APP_VERSION = "MVP2";
const BUILD_STAMP = "2026-05-04";

const STORAGE_KEY = "setupso_mvp2_state";
const AUTH_KEY = "setupso_auth";
const CLICK_LOCK_MS = 1000;

/* ---------------- API / Auth ---------------- */
const API_BASE = "";  // same-origin; change to "http://localhost:3000" if serving separately

function authGetToken() {
  try { const a = JSON.parse(localStorage.getItem(AUTH_KEY) || "{}"); return a.token || null; }
  catch { return null; }
}
function authGetUsername() {
  try { const a = JSON.parse(localStorage.getItem(AUTH_KEY) || "{}"); return a.username || null; }
  catch { return null; }
}
function authSave(token, username) {
  localStorage.setItem(AUTH_KEY, JSON.stringify({ token: token, username: username }));
}
function authClear() { localStorage.removeItem(AUTH_KEY); }
function isLoggedIn() { return !!authGetToken(); }

async function apiPost(path, body) {
  const token = authGetToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = "Bearer " + token;
  const resp = await fetch(API_BASE + path, { method: "POST", headers: headers, body: JSON.stringify(body) });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || "Erro " + resp.status);
  return data;
}
async function apiGet(path) {
  const token = authGetToken();
  const headers = {};
  if (token) headers["Authorization"] = "Bearer " + token;
  const resp = await fetch(API_BASE + path, { method: "GET", headers: headers });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || "Erro " + resp.status);
  return data;
}
async function apiPut(path, body) {
  const token = authGetToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = "Bearer " + token;
  const resp = await fetch(API_BASE + path, { method: "PUT", headers: headers, body: JSON.stringify(body) });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || "Erro " + resp.status);
  return data;
}

/* ---------------- Save indicator ---------------- */
function setSaveIndicator(status) {
  const el = document.getElementById("saveIndicator");
  if (!el) return;
  if (status === "saving") {
    el.textContent = "Salvando…";
    el.style.opacity = "0.7";
  } else if (status === "saved") {
    el.textContent = isLoggedIn() ? "✓ Salvo (servidor)" : "✓ Salvo (local)";
    el.style.opacity = "1";
  } else if (status === "error") {
    el.textContent = "⚠ Erro ao salvar";
    el.style.opacity = "1";
  } else {
    el.textContent = "—";
    el.style.opacity = "0.5";
  }
}

/* ---------------- Remote state sync ---------------- */
let _syncTimer = null;
function scheduleSyncToServer() {
  if (!isLoggedIn()) return;
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(function () {
    _syncTimer = null;
    syncStateToServer();
  }, 1200);
}
async function syncStateToServer() {
  if (!isLoggedIn()) return;
  setSaveIndicator("saving");
  try {
    await apiPut("/api/state", { state: state });
    setSaveIndicator("saved");
  } catch (err) {
    setSaveIndicator("error");
    console.warn("SetupSO: falha ao sincronizar com servidor:", err.message);
  }
}
async function loadStateFromServer() {
  try {
    const data = await apiGet("/api/state");
    return data.state || {};
  } catch (err) {
    console.warn("SetupSO: falha ao carregar do servidor:", err.message);
    return null;
  }
}

/* ---------------- Storage (localStorage) ---------------- */
function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}
function saveState(st) { localStorage.setItem(STORAGE_KEY, JSON.stringify(st)); }
function resetState() { localStorage.removeItem(STORAGE_KEY); authClear(); }

/* ---------------- Utils ---------------- */
function uid() { return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16); }
function nowISO() { return new Date().toISOString(); }
function pad2(n) { return String(n).padStart(2, "0"); }
function toISODate(d) { return String(d.getFullYear()) + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
function formatDateBRFromISO(isoDate) {
  const m = String(isoDate || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? (m[3] + "/" + m[2] + "/" + m[1]) : "—";
}
function formatTimeBR_HHmmss(isoOrDate) {
  const d = (isoOrDate instanceof Date) ? isoOrDate : new Date(isoOrDate);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function formatTimeOrDash(dateObj) { return dateObj ? formatTimeBR_HHmmss(dateObj) : "—"; }
function formatDurationNoSign(ms) {
  if (ms === null || ms === undefined || isNaN(ms)) return "—";
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return pad2(h) + ":" + pad2(m) + ":" + pad2(s);
}
function formatDurationSigned(ms) {
  if (ms === null || ms === undefined || isNaN(ms)) return "—";
  const sign = ms < 0 ? "-" : "+";
  return sign + formatDurationNoSign(Math.abs(ms));
}
function todayAtHHMMUsingISODate(isoDate, hhmm) {
  if (!isoDate || !hhmm) return null;
  const dm = String(isoDate).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const tm = String(hhmm).trim().match(/^(\d{2}):(\d{2})$/);
  if (!dm || !tm) return null;
  const yyyy = Number(dm[1]), mo = Number(dm[2]) - 1, dd = Number(dm[3]);
  const hh = Number(tm[1]), mm = Number(tm[2]);
  if (hh > 23 || mm > 59) return null;
  return new Date(yyyy, mo, dd, hh, mm, 0, 0);
}
function shortText(s, max) {
  const t = String(s || "").trim();
  if (!t) return "—";
  if (t.length <= max) return t;
  return t.slice(0, Math.max(0, max - 1)) + "…";
}
function safeEl(id) { return document.getElementById(id); }
function setTextById(id, v) {
  const e = safeEl(id);
  if (!e) return;
  e.textContent = (v === null || v === undefined || v === "") ? "—" : String(v);
}

/* ---------------- DOM helpers ---------------- */
function el(tag, className, txt) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (txt !== undefined) n.textContent = txt;
  return n;
}
function chip(textValue, className) {
  const cls = ("chip " + (className || "")).trim();
  return el("span", cls, textValue);
}

/* ---------------- Events model ---------------- */
const EVENT_TYPES = [
  { key: "anesthesia_team", label: "Equipe anestesia", mode: "in_out", seq: 1 },
  { key: "surgical_team", label: "Equipe cirúrgica", mode: "in_out", seq: 2 },
  { key: "transport_patient", label: "Transporte paciente", mode: "start_end", seq: 3 },
  { key: "admission_cc", label: "Admissão no CC", mode: "in_out", seq: 4 },
  { key: "patient_in_or", label: "Paciente em SO", mode: "in_out", seq: 5 },
  { key: "anesthesia", label: "Anestesia", mode: "start_end", seq: 6 },
  { key: "positioning", label: "Posicionamento", mode: "start_end", seq: 7 },
  { key: "time_out", label: "Time out", mode: "start_end", seq: 8 },
  { key: "surgery", label: "Cirurgia", mode: "start_end", seq: 9 },
  { key: "cme", label: "CME", mode: "in_out", seq: 10 },
  { key: "cleaning", label: "Limpeza", mode: "in_out", seq: 11 },
  { key: "pharmacy", label: "Farmácia", mode: "in_out", seq: 12 },
  { key: "clinical_engineering", label: "Eng. clínica", mode: "in_out", seq: 13 },
  { key: "rpa", label: "RPA", mode: "in_out", seq: 14 },
  { key: "room_setup", label: "Montagem sala", mode: "start_end", seq: 15 }
];

function isTeamCard(eventKey) { return eventKey === "anesthesia_team" || eventKey === "surgical_team"; }
function actionLabel(action) {
  if (action === "start") return "INÍCIO";
  if (action === "end") return "FIM";
  if (action === "in") return "ENTRADA";
  if (action === "out") return "SAÍDA";
  return String(action).toUpperCase();
}

/* ---------------- State ---------------- */
const state = loadState();
state.rooms = state.rooms || [{ id: "room-01", code: "Sala 3" }];
state.cases = state.cases || [];
state.eventsByCaseId = state.eventsByCaseId || {};
function save() {
  saveState(state);
  setSaveIndicator("saved");
  scheduleSyncToServer();
}

/* ---------------- Cases ---------------- */
function ensureActiveCase(roomId) {
  const active = state.cases
    .filter(function (c) { return c.roomId === roomId && c.status === "active"; })
    .sort(function (a, b) { return (a.createdAt || "") < (b.createdAt || "") ? 1 : -1; })[0];
  if (active) return active;

  const room = state.rooms.find(function (r) { return r.id === roomId; });
  const count = state.cases.filter(function (c) { return c.roomId === roomId; }).length + 1;

  const code = (room && room.code ? room.code : "SALA").replaceAll(" ", "") +
    "-" + toISODate(new Date()) + "-" + pad2(count);

  const c = {
    id: uid(),
    roomId: roomId,
    code: code,
    createdAt: nowISO(),
    status: "active",
    patientPhase: "open",
    roomPhase: "open",
    data: {
      fullName: "",
      noticeNumber: "",
      procedureName: "",
      surgeonName: "",
      attendanceNumber: "",
      birthDate: "",
      allergies: "",
      weightKg: "",
      heightCm: "",
      plannedSurgeryTimeHHMM: "",
      referenceDateISO: toISODate(new Date())
    }
  };

  state.cases.push(c);
  state.eventsByCaseId[c.id] = state.eventsByCaseId[c.id] || [];
  save();
  return c;
}
function getActiveCase(roomId) { return ensureActiveCase(roomId); }

/* ---------------- Events ---------------- */
function getEvents(caseId) {
  return (state.eventsByCaseId[caseId] || []).slice()
    .sort(function (a, b) { return new Date(a.happenedAt) - new Date(b.happenedAt); });
}
function addEvent(caseId, payload) {
  const eventKey = payload.eventKey;
  const action = payload.action;
  const auto = !!payload.auto;

  state.eventsByCaseId[caseId] = state.eventsByCaseId[caseId] || [];
  state.eventsByCaseId[caseId].push({
    id: uid(),
    eventKey: eventKey,
    action: action,
    happenedAt: nowISO(),
    createdAt: nowISO(),
    auto: auto
  });
  save();
}
function findFirstEventTime(caseId, eventKey, action) {
  const ev = (state.eventsByCaseId[caseId] || [])
    .filter(function (e) { return e.eventKey === eventKey && e.action === action; })
    .sort(function (a, b) { return new Date(a.happenedAt) - new Date(b.happenedAt); })[0];
  return ev ? new Date(ev.happenedAt) : null;
}
function isOpen(caseId, eventKey) {
  const t = EVENT_TYPES.find(function (x) { return x.key === eventKey; });
  const ev = (state.eventsByCaseId[caseId] || []).filter(function (e) { return e.eventKey === eventKey; });
  const actions = ev.map(function (e) { return e.action; });
  if (!t) return false;
  if (t.mode === "start_end") return actions.includes("start") && !actions.includes("end");
  if (t.mode === "in_out") return actions.includes("in") && !actions.includes("out");
  return false;
}
function getOpenEventKeys(caseId) { return EVENT_TYPES.map(function (t) { return t.key; }).filter(function (k) { return isOpen(caseId, k); }); }
function hasAnyAutoClosures(caseId) { return (state.eventsByCaseId[caseId] || []).some(function (e) { return e.auto; }); }
function countAutoClosures(caseId) { return (state.eventsByCaseId[caseId] || []).filter(function (e) { return e.auto; }).length; }

function autoClose(caseId, eventKey) {
  const t = EVENT_TYPES.find(function (x) { return x.key === eventKey; });
  if (!t) return;
  if (!isOpen(caseId, eventKey)) return;
  const action = (t.mode === "start_end") ? "end" : "out";
  addEvent(caseId, { eventKey: eventKey, action: action, auto: true });
}

/* ---------------- Rules ---------------- */
function applyAutoClosures(caseId, ctx) {
  const eventKey = ctx.eventKey;
  const action = ctx.action;

  if (eventKey === "admission_cc" && action === "in") autoClose(caseId, "transport_patient");
  if (eventKey === "patient_in_or" && action === "in") { autoClose(caseId, "transport_patient"); autoClose(caseId, "admission_cc"); }

  if (eventKey === "time_out" && action === "start") autoClose(caseId, "positioning");
  if (eventKey === "surgery" && action === "start") autoClose(caseId, "time_out");

  if (eventKey === "cleaning" && action === "in") {
    autoClose(caseId, "surgery");
    autoClose(caseId, "anesthesia");
    autoClose(caseId, "patient_in_or");
  }

  if (eventKey === "rpa" && action === "in") {
    for (let i = 0; i < EVENT_TYPES.length; i++) {
      const t = EVENT_TYPES[i];
      if (t.key === "rpa") continue;
      autoClose(caseId, t.key);
    }
  }

  if (eventKey === "room_setup" && action === "start") {
    for (let i = 0; i < EVENT_TYPES.length; i++) {
      const t = EVENT_TYPES[i];
      if (t.key === "room_setup") continue;
      autoClose(caseId, t.key);
    }
  }
}

/* ---------------- Event UI state ---------------- */
function nextActionForEvent(eventType, eventsForKey) {
  const actions = eventsForKey.map(function (e) { return e.action; });
  if (eventType.mode === "start_end") {
    if (!actions.includes("start")) return "start";
    if (actions.includes("start") && !actions.includes("end")) return "end";
    return "start";
  }
  if (eventType.mode === "in_out") {
    const inside = actions.includes("in") && !actions.includes("out");
    if (!actions.includes("in")) return "in";
    if (inside) return "out";
    return "in";
  }
  return "start";
}
function computeEventUIState(eventType, eventsForKey) {
  const actions = eventsForKey.map(function (e) { return e.action; });
  const next = nextActionForEvent(eventType, eventsForKey);

  let validation = { ok: true };
  if (next === "end" && !actions.includes("start")) validation = { ok: false, reason: "Não é possível finalizar sem iniciar." };
  if (next === "out" && !actions.includes("in")) validation = { ok: false, reason: "Não é possível registrar saída sem entrada." };

  let st = "idle";
  if (eventType.mode === "start_end") {
    if (actions.includes("start") && !actions.includes("end")) st = "in_progress";
    else if (actions.includes("start") && actions.includes("end")) st = "done";
  } else {
    if (actions.includes("in") && !actions.includes("out")) st = "in_progress";
    else if (actions.includes("in") && actions.includes("out")) st = "done";
  }

  return { state: st, nextAction: next, nextActionLabel: actionLabel(next), validation: validation };
}

/* ---------------- Status & phases ---------------- */
function deriveRoomStatus(caseId) {
  const priority = [
    { key: "room_setup", label: "MONTAGEM" },
    { key: "cleaning", label: "LIMPEZA" },
    { key: "cme", label: "CME" },
    { key: "surgery", label: "CIRURGIA" },
    { key: "anesthesia", label: "ANESTESIA" },
    { key: "patient_in_or", label: "PACIENTE EM SO" },
    { key: "admission_cc", label: "ADMISSÃO" },
    { key: "transport_patient", label: "TRANSPORTE" },
    { key: "rpa", label: "RPA" }
  ];
  for (let i = 0; i < priority.length; i++) {
    if (isOpen(caseId, priority[i].key)) return priority[i].label;
  }
  return "EM PREPARO";
}
function updateCasePhasesFromEvents(caseObj) {
  const caseId = caseObj.id;
  const patientOut = findFirstEventTime(caseId, "patient_in_or", "out");
  const roomEnd = findFirstEventTime(caseId, "room_setup", "end");
  caseObj.patientPhase = patientOut ? "closed" : "open";
  caseObj.roomPhase = roomEnd ? "closed" : "open";

  if (roomEnd && caseObj.status !== "closed") {
    caseObj.status = "closed";
    const roomId = caseObj.roomId;
    const existsActive = state.cases.some(function (c) { return c.roomId === roomId && c.status === "active" && c.id !== caseObj.id; });
    if (!existsActive) ensureActiveCase(roomId);
  }
  save();
}

/* ---------------- Metrics ---------------- */
function computeSpanMs(startDate, endDate) {
  if (!startDate) return null;
  const end = endDate || new Date();
  return end.getTime() - startDate.getTime();
}
function computeStageDurationMs(caseId, eventKey) {
  const t = EVENT_TYPES.find(function (x) { return x.key === eventKey; });
  if (!t) return null;
  if (t.mode === "start_end") {
    const s = findFirstEventTime(caseId, eventKey, "start");
    const e = findFirstEventTime(caseId, eventKey, "end");
    return computeSpanMs(s, e);
  }
  const si = findFirstEventTime(caseId, eventKey, "in");
  const so = findFirstEventTime(caseId, eventKey, "out");
  return computeSpanMs(si, so);
}
function computeOrTimeMs(caseId) { return computeStageDurationMs(caseId, "patient_in_or"); }
function computeSurgeryTimeMs(caseId) { return computeStageDurationMs(caseId, "surgery"); }
function computeAnesthesiaTimeMs(caseId) { return computeStageDurationMs(caseId, "anesthesia"); }
function computeRpaTimeMs(caseId) { return computeStageDurationMs(caseId, "rpa"); }
function computeTotalToRpaInMs(caseId) {
  const startAt = findFirstEventTime(caseId, "transport_patient", "start");
  const endAt = findFirstEventTime(caseId, "rpa", "in");
  return computeSpanMs(startAt, endAt);
}
function computeTotalCcMs(caseId) {
  const startAt = findFirstEventTime(caseId, "transport_patient", "start");
  const endAt = findFirstEventTime(caseId, "rpa", "out");
  return computeSpanMs(startAt, endAt);
}
function computeDelays(caseObj) {
  const c = caseObj.data;
  const planned = String(c.plannedSurgeryTimeHHMM || "").trim();
  const refISO = String(c.referenceDateISO || "").trim();
  const plannedDate = (refISO && planned) ? todayAtHHMMUsingISODate(refISO, planned) : null;
  if (!plannedDate) return { patient: null, surgTeam: null, anesTeam: null };

  const patientIn = findFirstEventTime(caseObj.id, "patient_in_or", "in");
  const surgTeamIn = findFirstEventTime(caseObj.id, "surgical_team", "in");
  const anesTeamIn = findFirstEventTime(caseObj.id, "anesthesia_team", "in");

  return {
    patient: patientIn ? (patientIn.getTime() - plannedDate.getTime()) : null,
    surgTeam: surgTeamIn ? (surgTeamIn.getTime() - plannedDate.getTime()) : null,
    anesTeam: anesTeamIn ? (anesTeamIn.getTime() - plannedDate.getTime()) : null
  };
}
function avgMs(values) {
  const v = values.filter(function (x) { return x !== null && x !== undefined && !isNaN(x); });
  if (v.length === 0) return null;
  return v.reduce(function (a, b) { return a + b; }, 0) / v.length;
}
function pct(num, den) { return den ? (String(Math.round((num / den) * 100)) + "%") : "0%"; }

/* ---------------- Toast ---------------- */
function toast(msg) {
  const t = safeEl("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.remove("hidden");
  setTimeout(function () { t.classList.add("hidden"); }, 2600);
}

/* ---------------- Click lock ---------------- */
const clickLockUntilByKey = new Map();
function isLocked(key) { return Date.now() < (clickLockUntilByKey.get(key) || 0); }
function lock(key) { clickLockUntilByKey.set(key, Date.now() + CLICK_LOCK_MS); }

/* ---------------- Navigation ---------------- */
function setSelectedTab(tabId) {
  const tabs = [
    { id: "tabRooms", view: "viewRooms" },
    { id: "tabDashboard", view: "viewDashboard" },
    { id: "tabReports", view: "viewReports" }
  ];
  for (let i = 0; i < tabs.length; i++) {
    const t = tabs[i];
    const btn = safeEl(t.id);
    const view = safeEl(t.view);
    const active = (t.id === tabId);
    if (btn) btn.setAttribute("aria-selected", active ? "true" : "false");
    if (view) view.classList.toggle("hidden", !active);
  }
  const detail = safeEl("viewRoomDetail");
  if (detail) detail.classList.add("hidden");
}
function showRoomDetail() {
  const ids = ["viewRooms", "viewDashboard", "viewReports"];
  for (let i = 0; i < ids.length; i++) {
    const v = safeEl(ids[i]);
    if (v) v.classList.add("hidden");
  }
  const d = safeEl("viewRoomDetail");
  if (d) d.classList.remove("hidden");
  const tabs = ["tabRooms", "tabDashboard", "tabReports"];
  for (let i = 0; i < tabs.length; i++) {
    const b = safeEl(tabs[i]);
    if (b) b.setAttribute("aria-selected", "false");
  }
}

/* ---------------- Current room ---------------- */
let currentRoomId = state.rooms[0].id;

/* ---------------- Render: Rooms ---------------- */
function renderRooms() {
  const grid = safeEl("roomsGrid");
  if (!grid) return;
  grid.innerHTML = "";

  for (let i = 0; i < state.rooms.length; i++) {
    const room = state.rooms[i];
    const c = getActiveCase(room.id);
    updateCasePhasesFromEvents(c);

    const card = el("div", "card bg-white border border-slate-200 shadow-sm p-4");
    const wrap = el("div", "flex flex-wrap items-start justify-between gap-3");
    const left = el("div", "min-w-0");
    const right = el("div", "shrink-0 flex flex-col gap-2");

    const top = el("div", "flex items-center gap-2");
    top.appendChild(el("div", "text-lg font-black", room.code));
    top.appendChild(chip(deriveRoomStatus(c.id), "bg-slate-100 border border-slate-200 text-slate-700"));
    top.appendChild(chip(c.code, "bg-slate-100 border border-slate-200 text-slate-700 mono"));
    left.appendChild(top);

    const info = el("div", "mt-2 text-sm text-slate-700");
    const p1 = el("div");
    p1.appendChild(el("span", "text-slate-500 font-bold", "Paciente: "));
    p1.appendChild(document.createTextNode(String(c.data.fullName || "").trim() || "—"));
    info.appendChild(p1);

    const row = el("div", "mt-1 grid grid-cols-2 gap-2");
    const a = el("div");
    a.appendChild(el("span", "text-slate-500 font-bold", "Aviso: "));
    a.appendChild(el("span", "mono", String(c.data.noticeNumber || "").trim() || "—"));
    const b = el("div");
    b.appendChild(el("span", "text-slate-500 font-bold", "Cirurgião: "));
    b.appendChild(document.createTextNode(String(c.data.surgeonName || "").trim() || "—"));
    row.appendChild(a); row.appendChild(b);
    info.appendChild(row);

    const p2 = el("div", "mt-1");
    p2.appendChild(el("span", "text-slate-500 font-bold", "Procedimento: "));
    p2.appendChild(document.createTextNode(String(c.data.procedureName || "").trim() || "—"));
    info.appendChild(p2);
    left.appendChild(info);

    const kpis = el("div", "mt-3 grid grid-cols-2 gap-2 text-sm");
    const k1 = el("div", "bg-slate-50 border border-slate-200 rounded-xl p-3");
    k1.appendChild(el("div", "text-xs text-slate-500 font-bold uppercase", "Tempo de SO"));
    const msSO = computeOrTimeMs(c.id);
    k1.appendChild(el("div", "mt-1 mono font-black", msSO === null ? "—" : formatDurationNoSign(msSO)));

    const k2 = el("div", "bg-slate-50 border border-slate-200 rounded-xl p-3");
    k2.appendChild(el("div", "text-xs text-slate-500 font-bold uppercase", "Total (Transp→RPA.in)"));
    const msTR = computeTotalToRpaInMs(c.id);
    k2.appendChild(el("div", "mt-1 mono font-black", msTR === null ? "—" : formatDurationNoSign(msTR)));

    kpis.appendChild(k1); kpis.appendChild(k2);
    left.appendChild(kpis);

    const btn = el("button", "btn bg-blue-600 text-white px-4 py-2", "Abrir sala");
    btn.addEventListener("click", function () {
      currentRoomId = room.id;
      renderRoomDetail(true);
      showRoomDetail();
    });
    right.appendChild(btn);

    wrap.appendChild(left);
    wrap.appendChild(right);
    card.appendChild(wrap);
    grid.appendChild(card);
  }
}

/* ---------------- Render: Room detail (minimal, compatible) ---------------- */
function renderRoomDetail(fullRender) {
  const room = state.rooms.find(function (r) { return r.id === currentRoomId; });
  const c = getActiveCase(currentRoomId);
  updateCasePhasesFromEvents(c);

  if (fullRender) {
    setTextById("roomTitle", (room && room.code) ? room.code : "Sala");
    setTextById("roomStatus", deriveRoomStatus(c.id));

    const caseLine = safeEl("caseLine");
    if (caseLine) caseLine.textContent = "Caso: #1 • Proced.: " + (String(c.data.procedureName || "").trim() || "—");

    const patientLine = safeEl("patientLine");
    if (patientLine) patientLine.textContent =
      "Paciente: " + (String(c.data.fullName || "").trim() || "—") +
      " • Cirurgião: " + (String(c.data.surgeonName || "").trim() || "—");

    setTextById("noticeNumber", String(c.data.noticeNumber || "").trim() || "—");
    setTextById("attendanceNumber", String(c.data.attendanceNumber || "").trim() || "—");

    const planned = String(c.data.plannedSurgeryTimeHHMM || "").trim();
    setTextById("plannedSurgery", planned || "—");

    const delays = computeDelays(c);
    setTextById("delayPatientInOr", delays.patient !== null ? formatDurationSigned(delays.patient) : "—");
    setTextById("delaySurgicalTeam", delays.surgTeam !== null ? formatDurationSigned(delays.surgTeam) : "—");
    setTextById("delayAnesthesiaTeam", delays.anesTeam !== null ? formatDurationSigned(delays.anesTeam) : "—");

    const allergyBanner = safeEl("allergyBanner");
    if (allergyBanner) {
      const has = !!String(c.data.allergies || "").trim();
      allergyBanner.classList.toggle("hidden", !has);
      if (has) setTextById("allergyText", String(c.data.allergies || "").trim());
    }

    renderActions(c);
    renderDashboardTv();
    renderReports();
  }

  const msSO = computeOrTimeMs(c.id);
  setTextById("orTime", msSO === null ? "—" : formatDurationNoSign(msSO));
  const total = computeTotalToRpaInMs(c.id);
  setTextById("timelineTotal", total === null ? "—" : formatDurationNoSign(total));
}

/* ---------------- Render: Actions (simplified, no templates) ---------------- */
function stylesForCard(t, ui) {
  const team = isTeamCard(t.key);
  if (team) {
    if (ui.state === "in_progress") return { style: "background:linear-gradient(135deg,#1e40af,#2563eb);border-color:#93c5fd;", text: "text-white", badge: "chip bg-white/15 border border-white/20 text-white" };
    if (ui.state === "done") return { style: "background:linear-gradient(180deg,#f0f7ff,#e0f2fe);border-color:#93c5fd;", text: "text-slate-900", badge: "chip bg-sky-200 text-sky-900" };
    return { style: "background:linear-gradient(180deg,#f0f7ff,#dbeafe);border-color:#93c5fd;", text: "text-slate-900", badge: "chip bg-sky-100 text-sky-900" };
  }
  if (ui.state === "in_progress") return { style: "background:linear-gradient(135deg,#1d4ed8,#3b82f6);border-color:#93c5fd;", text: "text-white", badge: "chip bg-white/15 border border-white/20 text-white" };
  if (ui.state === "done") return { style: "background:linear-gradient(180deg,#ffffff,#e8f2ff);border-color:#bfdbfe;", text: "text-slate-900", badge: "chip bg-sky-100 text-sky-800" };
  return { style: "background:linear-gradient(180deg,#ffffff,#eef6ff);", text: "text-slate-900", badge: "chip bg-slate-100 text-slate-700" };
}
function badgeTextForCard(t, ui) {
  if (isTeamCard(t.key)) {
    if (ui.state === "in_progress") return "EM SO";
    if (ui.state === "done") return "SAÍDA DE SO";
  }
  if (ui.state === "in_progress") return "EM ANDAMENTO";
  if (ui.state === "done") return "CONCLUÍDO";
  return ui.nextActionLabel;
}
function renderActions(caseObj) {
  const grid = safeEl("actionsGrid");
  if (!grid) return;
  grid.innerHTML = "";

  for (let i = 0; i < EVENT_TYPES.length; i++) {
    const t = EVENT_TYPES[i];
    const evForKey = getEvents(caseObj.id).filter(function (e) { return e.eventKey === t.key; });
    const ui = computeEventUIState(t, evForKey);
    const st = stylesForCard(t, ui);

    const btn = el("button", ("btn btn-xl border shadow-sm " + st.text).trim());
    btn.setAttribute("style", st.style);

    const row = el("div", "flex items-center justify-between gap-2");
    row.appendChild(el("span", "truncate", String(t.seq) + ". " + t.label));
    row.appendChild(el("span", st.badge, badgeTextForCard(t, ui)));
    btn.appendChild(row);

    (function (eventType, uiState, eventsForKeyLocal) {
      btn.addEventListener("click", function () {
        const lockKey = "evt:" + caseObj.id + ":" + eventType.key;
        if (isLocked(lockKey)) { toast("Aguarde 1s (anti-toque duplo)."); return; }
        lock(lockKey);

        if (!uiState.validation.ok) { toast("Bloqueado: " + uiState.validation.reason); return; }
        const next = nextActionForEvent(eventType, eventsForKeyLocal);

        if (eventType.key === "cleaning" && next === "in") {
          if (isOpen(caseObj.id, "surgery") || isOpen(caseObj.id, "anesthesia") || isOpen(caseObj.id, "patient_in_or")) {
            if (!confirm("Ao iniciar Limpeza, Cirurgia, Anestesia e Paciente em SO (se em andamento) serão concluídas automaticamente. Continuar?")) return;
          }
        }

        if (eventType.key === "rpa" && next === "in") {
          const open = getOpenEventKeys(caseObj.id).filter(function (k) { return k !== "rpa"; });
          if (open.length > 0) {
            if (!confirm("Há etapas em andamento. Ao registrar ENTRADA na RPA, todas as etapas em andamento serão concluídas automaticamente. Continuar?")) return;
          }
        }

        applyAutoClosures(caseObj.id, { eventKey: eventType.key, action: next });
        addEvent(caseObj.id, { eventKey: eventType.key, action: next, auto: false });
        updateCasePhasesFromEvents(caseObj);

        toast(eventType.label + ": " + actionLabel(next) + " registrado (" + formatTimeBR_HHmmss(new Date()) + ")");

        renderRoomDetail(true);
        renderRooms();
        renderDashboardTv();
        renderReports();
      });
    })(t, ui, evForKey);

    grid.appendChild(btn);
  }
}

/* ---------------- Dashboard TV + Reports (minimal required) ---------------- */
function getAllCasesSorted() {
  return state.cases.slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
}
function renderDashboardTv() {
  const kpisEl = safeEl("dashKpis");
  const tbody = safeEl("dashTvTable");
  const updated = safeEl("dashUpdatedAt");
  if (!kpisEl || !tbody || !updated) return;

  const cases = getAllCasesSorted();
  const totalCases = cases.length;

  const avgOr = avgMs(cases.map(function (c) { return computeOrTimeMs(c.id); }));
  const avgSurg = avgMs(cases.map(function (c) { return computeSurgeryTimeMs(c.id); }));
  const avgAnes = avgMs(cases.map(function (c) { return computeAnesthesiaTimeMs(c.id); }));
  const avgToRpaIn = avgMs(cases.map(function (c) { return computeTotalToRpaInMs(c.id); }));
  const avgRpa = avgMs(cases.map(function (c) { return computeRpaTimeMs(c.id); }));
  const avgTotalCc = avgMs(cases.map(function (c) { return computeTotalCcMs(c.id); }));

  const withRpaIn = cases.filter(function (c) { return !!findFirstEventTime(c.id, "rpa", "in"); }).length;
  const withRpaOut = cases.filter(function (c) { return !!findFirstEventTime(c.id, "rpa", "out"); }).length;

  const plannedCount = cases.filter(function (c) { return !!String((c.data && c.data.plannedSurgeryTimeHHMM) || "").trim(); }).length;

  kpisEl.innerHTML = "";
  function addKpi(label, value, sub) {
    const box = el("div", "tv-kpi");
    box.appendChild(el("div", "label", label));
    box.appendChild(el("div", "value mono", value));
    box.appendChild(el("div", "sub", sub));
    kpisEl.appendChild(box);
  }

  addKpi("Cases (total)", String(totalCases), "RPA.in " + pct(withRpaIn, totalCases) + " • RPA.out " + pct(withRpaOut, totalCases));
  addKpi("Média Tempo SO", avgOr === null ? "—" : formatDurationNoSign(avgOr), "—");
  addKpi("Média Tempo Cirurgia", avgSurg === null ? "—" : formatDurationNoSign(avgSurg), "—");
  addKpi("Média Tempo RPA", avgRpa === null ? "—" : formatDurationNoSign(avgRpa), "Previsto preenchido: " + pct(plannedCount, totalCases));
  addKpi("Média Transp→RPA.in", avgToRpaIn === null ? "—" : formatDurationNoSign(avgToRpaIn), "—");
  addKpi("Média Total CC", avgTotalCc === null ? "—" : formatDurationNoSign(avgTotalCc), "Transp.start → RPA.out");
  addKpi("Média Anestesia", avgAnes === null ? "—" : formatDurationNoSign(avgAnes), "—");
  addKpi("Auto closures", String(cases.filter(function (c) { return hasAnyAutoClosures(c.id); }).length), "Cases com fechamento automático");

  tbody.innerHTML = "";
  for (let i = 0; i < state.rooms.length; i++) {
    const room = state.rooms[i];
    const c = getActiveCase(room.id);
    updateCasePhasesFromEvents(c);
    const data = c.data || {};

    const soIn = findFirstEventTime(c.id, "patient_in_or", "in");
    const soOut = findFirstEventTime(c.id, "patient_in_or", "out");
    const surgStart = findFirstEventTime(c.id, "surgery", "start");
    const surgEnd = findFirstEventTime(c.id, "surgery", "end");
    const rpaIn = findFirstEventTime(c.id, "rpa", "in");
    const rpaOut = findFirstEventTime(c.id, "rpa", "out");

    const msSO = computeOrTimeMs(c.id);
    const msCir = computeSurgeryTimeMs(c.id);
    const msR = computeRpaTimeMs(c.id);
    const msToR = computeTotalToRpaInMs(c.id);
    const msCC = computeTotalCcMs(c.id);

    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 cursor-pointer";

    function td(value, clsName) {
      const cell = el("td", (clsName || "") + " py-2 pr-3");
      cell.textContent = value;
      return cell;
    }

    tr.appendChild(td(room.code, "font-black"));
    const st = el("td", "py-2 pr-3");
    st.appendChild(chip(deriveRoomStatus(c.id), "bg-slate-100 border border-slate-200 text-slate-700"));
    tr.appendChild(st);

    const tdPat = el("td", "py-2 pr-3");
    tdPat.appendChild(el("div", "truncate2", shortText(data.fullName, 26)));
    tdPat.appendChild(el("div", "small mono", shortText(data.noticeNumber, 26)));
    tr.appendChild(tdPat);

    const tdProc = el("td", "py-2 pr-3");
    tdProc.appendChild(el("div", "truncate3", shortText(data.procedureName, 34)));
    tdProc.appendChild(el("div", "small", shortText(data.surgeonName, 34)));
    tr.appendChild(tdProc);

    tr.appendChild(td(formatTimeOrDash(soIn), "mono"));
    tr.appendChild(td(formatTimeOrDash(soOut), "mono"));
    tr.appendChild(td(msSO === null ? "—" : formatDurationNoSign(msSO), "mono font-black"));

    tr.appendChild(td(formatTimeOrDash(surgStart), "mono"));
    tr.appendChild(td(formatTimeOrDash(surgEnd), "mono"));
    tr.appendChild(td(msCir === null ? "—" : formatDurationNoSign(msCir), "mono font-black"));

    tr.appendChild(td(formatTimeOrDash(rpaIn), "mono"));
    tr.appendChild(td(formatTimeOrDash(rpaOut), "mono"));
    tr.appendChild(td(msR === null ? "—" : formatDurationNoSign(msR), "mono font-black"));

    tr.appendChild(td(msToR === null ? "—" : formatDurationNoSign(msToR), "mono font-black"));
    tr.appendChild(td(msCC === null ? "—" : formatDurationNoSign(msCC), "mono font-black"));
    tr.appendChild(td(hasAnyAutoClosures(c.id) ? ("Sim (" + countAutoClosures(c.id) + ")") : "Não", ""));

    tr.addEventListener("click", function () {
      currentRoomId = room.id;
      renderRoomDetail(true);
      showRoomDetail();
    });

    tbody.appendChild(tr);
  }

  updated.textContent = "Atualizado: " + formatTimeBR_HHmmss(new Date());
}

function renderReports() {
  const tbody = safeEl("reportsTable");
  if (!tbody) return;
  tbody.innerHTML = "";

  const cases = getAllCasesSorted();
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    const room = state.rooms.find(function (r) { return r.id === c.roomId; });
    const data = c.data || {};

    const soIn = findFirstEventTime(c.id, "patient_in_or", "in");
    const soOut = findFirstEventTime(c.id, "patient_in_or", "out");
    const anesStart = findFirstEventTime(c.id, "anesthesia", "start");
    const anesEnd = findFirstEventTime(c.id, "anesthesia", "end");
    const surgStart = findFirstEventTime(c.id, "surgery", "start");
    const surgEnd = findFirstEventTime(c.id, "surgery", "end");
    const trStart = findFirstEventTime(c.id, "transport_patient", "start");
    const rpaIn = findFirstEventTime(c.id, "rpa", "in");
    const rpaOut = findFirstEventTime(c.id, "rpa", "out");

    const msSO = computeOrTimeMs(c.id);
    const msAn = computeAnesthesiaTimeMs(c.id);
    const msCir = computeSurgeryTimeMs(c.id);
    const msR = computeRpaTimeMs(c.id);
    const msToR = computeTotalToRpaInMs(c.id);
    const msCC = computeTotalCcMs(c.id);

    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50";

    function td(value, clsName) {
      const cell = el("td", (clsName || "") + " py-2 pr-3");
      cell.textContent = value;
      return cell;
    }

    tr.appendChild(td(room ? room.code : "—", "font-black"));
    tr.appendChild(td(c.code, "mono"));
    tr.appendChild(td(String(data.noticeNumber || "").trim() || "—", "mono"));
    tr.appendChild(td(String(data.fullName || "").trim() || "—", ""));
    tr.appendChild(td(String(data.procedureName || "").trim() || "—", ""));
    tr.appendChild(td(String(data.surgeonName || "").trim() || "—", ""));

    tr.appendChild(td(formatTimeOrDash(soIn), "mono"));
    tr.appendChild(td(formatTimeOrDash(soOut), "mono"));
    tr.appendChild(td(msSO === null ? "—" : formatDurationNoSign(msSO), "mono font-black"));

    tr.appendChild(td(formatTimeOrDash(anesStart), "mono"));
    tr.appendChild(td(formatTimeOrDash(anesEnd), "mono"));
    tr.appendChild(td(msAn === null ? "—" : formatDurationNoSign(msAn), "mono font-black"));

    tr.appendChild(td(formatTimeOrDash(surgStart), "mono"));
    tr.appendChild(td(formatTimeOrDash(surgEnd), "mono"));
    tr.appendChild(td(msCir === null ? "—" : formatDurationNoSign(msCir), "mono font-black"));

    tr.appendChild(td(formatTimeOrDash(trStart), "mono"));
    tr.appendChild(td(formatTimeOrDash(rpaIn), "mono"));
    tr.appendChild(td(formatTimeOrDash(rpaOut), "mono"));
    tr.appendChild(td(msR === null ? "—" : formatDurationNoSign(msR), "mono font-black"));

    tr.appendChild(td(msToR === null ? "—" : formatDurationNoSign(msToR), "mono font-black"));
    tr.appendChild(td(msCC === null ? "—" : formatDurationNoSign(msCC), "mono font-black"));

    tr.appendChild(td(hasAnyAutoClosures(c.id) ? ("Sim (" + countAutoClosures(c.id) + ")") : "Não", ""));
    tr.appendChild(td(c.status === "closed" ? "Concluído" : "Ativo", ""));

    tbody.appendChild(tr);
  }
}

/* ---------------- Modal details (simple) ---------------- */
const detailsModal = safeEl("detailsModal");
function openDetailsModal() {
  const c = getActiveCase(currentRoomId);
  renderDetailsModal(c);
  if (detailsModal) detailsModal.classList.remove("hidden");
}
function renderDetailsModal(caseObj) {
  const grid = safeEl("detailsGrid");
  if (!grid) return;
  const d = caseObj.data;
  grid.innerHTML = "";

  function addField(title, id, type, value, span2, mono) {
    const box = el("div", "bg-slate-50 border border-slate-200 rounded-xl p-3" + (span2 ? " col-span-2" : ""));
    box.appendChild(el("div", "text-xs text-slate-500 font-bold uppercase", title));
    const input = document.createElement("input");
    input.type = type;
    input.id = id;
    input.value = value || "";
    input.className = "mt-2 w-full soft-input" + (mono ? " mono" : "");
    box.appendChild(input);
    grid.appendChild(box);
  }

  addField("Data do dia (referência)", "inpRefDate", "date", String(d.referenceDateISO || "").trim(), true, true);
  addField("Horário previsto de início da cirurgia (HH:MM)", "inpPlannedSurgery", "time", String(d.plannedSurgeryTimeHHMM || "").trim(), true, true);
  addField("Nome do paciente", "inpFullName", "text", String(d.fullName || ""), true, false);
  addField("Aviso cirúrgico", "inpNotice", "text", String(d.noticeNumber || ""), false, true);
  addField("Atendimento", "inpAttendance", "text", String(d.attendanceNumber || ""), false, true);
  addField("Procedimento cirúrgico", "inpProcedure", "text", String(d.procedureName || ""), true, false);
  addField("Nome do cirurgião", "inpSurgeon", "text", String(d.surgeonName || ""), true, false);
  addField("Data de nascimento", "inpBirthDate", "date", String(d.birthDate || "").trim(), false, true);
  addField("Alergia", "inpAllergies", "text", String(d.allergies || ""), false, false);
  addField("Peso (kg)", "inpWeight", "text", String(d.weightKg || ""), false, true);
  addField("Altura (cm)", "inpHeight", "text", String(d.heightCm || ""), false, true);
}
function saveDetailsFromModal() {
  const c = getActiveCase(currentRoomId);
  function val(id) { const e = safeEl(id); return e ? String(e.value || "").trim() : ""; }

  c.data.referenceDateISO = val("inpRefDate") || toISODate(new Date());
  c.data.plannedSurgeryTimeHHMM = val("inpPlannedSurgery");
  c.data.fullName = val("inpFullName");
  c.data.noticeNumber = val("inpNotice");
  c.data.attendanceNumber = val("inpAttendance");
  c.data.procedureName = val("inpProcedure");
  c.data.surgeonName = val("inpSurgeon");
  c.data.birthDate = val("inpBirthDate");
  c.data.allergies = val("inpAllergies");
  c.data.weightKg = val("inpWeight");
  c.data.heightCm = val("inpHeight");
  save();
}

/* ---------------- Undo ---------------- */
function undoLastManualEventForActiveCase() {
  const c = getActiveCase(currentRoomId);
  const arr = state.eventsByCaseId[c.id] || [];
  for (let i = arr.length - 1; i >= 0; i--) {
    const e = arr[i];
    if (!e.auto) {
      arr.splice(i, 1);
      save();
      toast("Desfeito: " + e.eventKey + " (" + e.action + ")");
      updateCasePhasesFromEvents(c);
      renderRoomDetail(true);
      renderRooms();
      renderDashboardTv();
      renderReports();
      return;
    }
  }
  toast("Nada para desfazer (nenhum evento manual).");
}

/* ---------------- Clock tick ---------------- */
function tickClockOnly() {
  const d = new Date();
  setTextById("todayTop", formatDateBRFromISO(toISODate(d)));
  setTextById("clockTop", formatTimeBR_HHmmss(d));
  setTextById("todayDateTop", formatDateBRFromISO(toISODate(d)));
  setTextById("clock", formatTimeBR_HHmmss(d));

  const detail = safeEl("viewRoomDetail");
  if (detail && !detail.classList.contains("hidden")) renderRoomDetail(false);

  const dash = safeEl("viewDashboard");
  if (dash && !dash.classList.contains("hidden")) renderDashboardTv();
}


/* ---------------- Export / Import JSON ---------------- */
function exportStateJSON() {
  try {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "setupso-backup-" + toISODate(new Date()) + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast("JSON exportado com sucesso.");
  } catch (err) {
    toast("Erro ao exportar: " + err.message);
  }
}
function importStateJSON(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (!imported || typeof imported !== "object") throw new Error("JSON inválido");
      if (!confirm("Importar este arquivo vai substituir todos os dados atuais. Continuar?")) return;
      Object.keys(state).forEach(function (k) { delete state[k]; });
      Object.assign(state, imported);
      state.rooms = state.rooms || [{ id: "room-01", code: "Sala 3" }];
      state.cases = state.cases || [];
      state.eventsByCaseId = state.eventsByCaseId || {};
      save();
      location.reload();
    } catch (err) {
      toast("Erro ao importar: " + err.message);
    }
  };
  reader.readAsText(file);
}

/* ---------------- Login UI helpers ---------------- */
function showLoginOverlay() {
  const o = safeEl("loginOverlay");
  if (o) o.classList.remove("hidden");
}
function hideLoginOverlay() {
  const o = safeEl("loginOverlay");
  if (o) o.classList.add("hidden");
}
function showLoginError(msg) {
  const e = safeEl("loginError");
  if (!e) return;
  e.textContent = msg;
  e.classList.remove("hidden");
}
function clearLoginError() {
  const e = safeEl("loginError");
  if (e) e.classList.add("hidden");
}
function updateUserBadge() {
  const badge = safeEl("userBadge");
  const btnLogout = safeEl("btnLogout");
  const username = authGetUsername();
  if (username) {
    if (badge) { badge.textContent = "👤 " + username; badge.classList.remove("hidden"); }
    if (btnLogout) btnLogout.classList.remove("hidden");
  } else {
    if (badge) badge.classList.add("hidden");
    if (btnLogout) btnLogout.classList.add("hidden");
  }
}

/* ---------------- Wire + init ---------------- */
function wire() {
  setTextById("buildStamp", APP_VERSION + " • " + BUILD_STAMP);

  const tabRooms = safeEl("tabRooms");
  const tabDash = safeEl("tabDashboard");
  const tabRep = safeEl("tabReports");
  if (tabRooms) tabRooms.addEventListener("click", function () { setSelectedTab("tabRooms"); });
  if (tabDash) tabDash.addEventListener("click", function () { setSelectedTab("tabDashboard"); });
  if (tabRep) tabRep.addEventListener("click", function () { setSelectedTab("tabReports"); });

  const btnBack = safeEl("btnBackToRooms");
  if (btnBack) btnBack.addEventListener("click", function () { setSelectedTab("tabRooms"); renderRooms(); });

  const btnOpen = safeEl("btnDetailsOpen");
  const btnClose = safeEl("btnCloseDetails");
  const btnSave = safeEl("btnSaveDetails");
  if (btnOpen) btnOpen.addEventListener("click", function () { openDetailsModal(); });
  if (btnClose) btnClose.addEventListener("click", function () { if (detailsModal) detailsModal.classList.add("hidden"); });
  if (btnSave) btnSave.addEventListener("click", function () {
    saveDetailsFromModal();
    if (detailsModal) detailsModal.classList.add("hidden");
    toast("Detalhes salvos.");
    renderRoomDetail(true);
    renderRooms();
    renderDashboardTv();
    renderReports();
  });

  if (detailsModal) detailsModal.addEventListener("click", function (e) { if (e.target === detailsModal) detailsModal.classList.add("hidden"); });

  const btnUndo = safeEl("btnUndoManual");
  const btnVoice = safeEl("btnVoice");
  if (btnUndo) btnUndo.addEventListener("click", function () { undoLastManualEventForActiveCase(); });
  if (btnVoice) btnVoice.addEventListener("click", function () { toast("Modo voz (futuro)"); });

  const btnReset = safeEl("btnResetAll");
  if (btnReset) btnReset.addEventListener("click", function () {
    if (!confirm("Limpar todos os dados locais (salas, cases, eventos)?")) return;
    resetState();
    location.reload();
  });

  /* Export / Import */
  const btnExport = safeEl("btnExport");
  if (btnExport) btnExport.addEventListener("click", exportStateJSON);

  const inpImport = safeEl("inpImport");
  if (inpImport) inpImport.addEventListener("change", function (e) {
    importStateJSON(e.target.files && e.target.files[0]);
    e.target.value = "";
  });

  /* Logout */
  const btnLogout = safeEl("btnLogout");
  if (btnLogout) btnLogout.addEventListener("click", function () {
    if (!confirm("Sair da conta? Os dados locais permanecem salvos.")) return;
    authClear();
    updateUserBadge();
    setSaveIndicator("saved");
    toast("Sessão encerrada. Usando modo offline.");
  });

  /* Login overlay: switch between login/register panels */
  const btnShowReg = safeEl("btnShowRegister");
  const btnShowLog = safeEl("btnShowLogin");
  if (btnShowReg) btnShowReg.addEventListener("click", function () {
    clearLoginError();
    safeEl("loginForm").classList.add("hidden");
    safeEl("registerForm").classList.remove("hidden");
  });
  if (btnShowLog) btnShowLog.addEventListener("click", function () {
    clearLoginError();
    safeEl("registerForm").classList.add("hidden");
    safeEl("loginForm").classList.remove("hidden");
  });

  /* Offline mode */
  const btnOffline = safeEl("btnOfflineMode");
  if (btnOffline) btnOffline.addEventListener("click", function () {
    hideLoginOverlay();
    setSaveIndicator("saved");
    toast("Modo offline ativado. Dados salvos localmente.");
  });

  /* Login submit */
  const btnLogin = safeEl("btnLogin");
  if (btnLogin) btnLogin.addEventListener("click", function () {
    clearLoginError();
    const username = (safeEl("inpLoginUser") || {}).value || "";
    const password = (safeEl("inpLoginPass") || {}).value || "";
    if (!username || !password) { showLoginError("Preencha usuário e senha."); return; }
    btnLogin.disabled = true;
    btnLogin.textContent = "Entrando…";
    apiPost("/api/auth/login", { username: username, password: password }).then(function (data) {
      authSave(data.token, data.username);
      updateUserBadge();
      hideLoginOverlay();
      setSaveIndicator("saving");
      loadStateFromServer().then(function (remoteState) {
        if (remoteState && Object.keys(remoteState).length > 0) {
          Object.keys(state).forEach(function (k) { delete state[k]; });
          Object.assign(state, remoteState);
          state.rooms = state.rooms || [{ id: "room-01", code: "Sala 3" }];
          state.cases = state.cases || [];
          state.eventsByCaseId = state.eventsByCaseId || {};
          saveState(state);
        }
        setSaveIndicator("saved");
        setSelectedTab("tabRooms");
        renderRooms();
        renderDashboardTv();
        renderReports();
        toast("Bem-vindo, " + data.username + "!");
      });
    }).catch(function (err) {
      showLoginError(err.message);
      btnLogin.disabled = false;
      btnLogin.textContent = "Entrar";
    });
  });

  /* Register submit */
  const btnReg = safeEl("btnRegister");
  if (btnReg) btnReg.addEventListener("click", function () {
    clearLoginError();
    const username = (safeEl("inpRegUser") || {}).value || "";
    const password = (safeEl("inpRegPass") || {}).value || "";
    if (!username || !password) { showLoginError("Preencha todos os campos."); return; }
    btnReg.disabled = true;
    btnReg.textContent = "Criando conta…";
    apiPost("/api/auth/register", { username: username, password: password }).then(function (data) {
      authSave(data.token, data.username);
      updateUserBadge();
      hideLoginOverlay();
      setSaveIndicator("saved");
      toast("Conta criada! Bem-vindo, " + data.username + "!");
    }).catch(function (err) {
      showLoginError(err.message);
      btnReg.disabled = false;
      btnReg.textContent = "Criar conta";
    });
  });

  updateUserBadge();

  ensureActiveCase(state.rooms[0].id);

  setSelectedTab("tabRooms");
  renderRooms();
  renderDashboardTv();
  renderReports();

  tickClockOnly();
  setInterval(tickClockOnly, 1000);

  /* Show login overlay if not already authenticated */
  if (!isLoggedIn()) {
    showLoginOverlay();
    setSaveIndicator("saved");
  } else {
    setSaveIndicator("saving");
    loadStateFromServer().then(function (remoteState) {
      if (remoteState && Object.keys(remoteState).length > 0) {
        Object.keys(state).forEach(function (k) { delete state[k]; });
        Object.assign(state, remoteState);
        state.rooms = state.rooms || [{ id: "room-01", code: "Sala 3" }];
        state.cases = state.cases || [];
        state.eventsByCaseId = state.eventsByCaseId || {};
        saveState(state);
        renderRooms();
        renderDashboardTv();
        renderReports();
      }
      setSaveIndicator("saved");
    });
  }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
else wire();