// SetupSO — MVP Online — app.js
// Multi-tenant, JWT auth, API-backed state
const APP_VERSION = "MVP-Online";
const BUILD_STAMP = "2026-06-28";

const CLICK_LOCK_MS = 1000;
const API_BASE = "/api";

/* ================================================================ */
/*  Auth / API layer                                                  */
/* ================================================================ */
function getAuthToken() { return localStorage.getItem("setupso_token"); }
function getTenantSlug() { return localStorage.getItem("setupso_tenant"); }
function getLoggedUser() {
  try { return JSON.parse(localStorage.getItem("setupso_user") || "null"); }
  catch { return null; }
}
function getLoggedTenant() {
  try { return JSON.parse(localStorage.getItem("setupso_tenant_info") || "null"); }
  catch { return null; }
}

function setAuth(token, tenant, user, tenantInfo) {
  localStorage.setItem("setupso_token", token);
  localStorage.setItem("setupso_tenant", tenant);
  localStorage.setItem("setupso_user", JSON.stringify(user));
  localStorage.setItem("setupso_tenant_info", JSON.stringify(tenantInfo));
}

function clearAuth() {
  localStorage.removeItem("setupso_token");
  localStorage.removeItem("setupso_tenant");
  localStorage.removeItem("setupso_user");
  localStorage.removeItem("setupso_tenant_info");
}

function isLoggedIn() { return !!getAuthToken(); }

async function apiRequest(method, path, body) {
  const token = getAuthToken();
  const tenant = getTenantSlug();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = "Bearer " + token;
  if (tenant) headers["X-Tenant-Slug"] = tenant;

  const opts = { method: method, headers: headers };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(API_BASE + path, opts);
  if (res.status === 401) {
    clearAuth();
    showLoginScreen();
    throw new Error("Sessão expirada. Faça login novamente.");
  }
  if (!res.ok) {
    const err = await res.json().catch(function () { return { error: "Erro " + res.status }; });
    throw new Error(err.error || "Erro " + res.status);
  }
  return res.json();
}

/* ================================================================ */
/*  Utils                                                             */
/* ================================================================ */
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

/* ================================================================ */
/*  DOM helpers                                                       */
/* ================================================================ */
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

/* ================================================================ */
/*  Events model                                                      */
/* ================================================================ */
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

/* ================================================================ */
/*  In-memory state (API-backed)                                      */
/* ================================================================ */
const state = {
  rooms: [],
  cases: [],
  eventsByCaseId: {}
};

/* Load all rooms, cases and events from the API */
async function loadStateFromAPI() {
  const rooms = await apiRequest("GET", "/rooms");
  state.rooms = rooms.map(function (r) { return { id: String(r.id), code: r.code }; });

  const allCases = await apiRequest("GET", "/cases");
  state.cases = [];
  state.eventsByCaseId = {};

  for (let i = 0; i < allCases.length; i++) {
    const c = allCases[i];
    const cLocal = {
      id: String(c.id),
      roomId: String(c.room_id),
      code: c.code,
      status: c.status,
      patientPhase: c.patient_phase,
      roomPhase: c.room_phase,
      createdAt: c.created_at,
      data: parseDataJson(c.data_json)
    };
    state.cases.push(cLocal);
    const events = c.events || [];
    state.eventsByCaseId[cLocal.id] = events.map(mapEvent);
  }

  for (let i = 0; i < state.rooms.length; i++) {
    const room = state.rooms[i];
    const active = state.cases.filter(function (c) { return c.roomId === room.id && c.status === "active"; })[0];
    if (!active) {
      await ensureActiveCaseRemote(room.id);
    }
  }
}

function parseDataJson(raw) {
  try { return JSON.parse(raw || "{}"); }
  catch { return {}; }
}

function mapEvent(e) {
  return {
    id: String(e.id),
    eventKey: e.event_key,
    action: e.action,
    happenedAt: e.happened_at,
    createdAt: e.created_at,
    auto: !!e.auto
  };
}

async function ensureActiveCaseRemote(roomId) {
  try {
    const resp = await apiRequest("POST", "/cases", { roomId: roomId });
    const c = resp.case;
    if (!c) return;
    const cLocal = {
      id: String(c.id),
      roomId: String(c.room_id),
      code: c.code,
      status: c.status,
      patientPhase: c.patient_phase,
      roomPhase: c.room_phase,
      createdAt: c.created_at,
      data: parseDataJson(c.data_json)
    };
    const exists = state.cases.find(function (x) { return x.id === cLocal.id; });
    if (!exists) {
      state.cases.push(cLocal);
      state.eventsByCaseId[cLocal.id] = [];
    }
  } catch (err) {
    console.error("ensureActiveCaseRemote:", err.message);
  }
}

/* ================================================================ */
/*  Cases helpers                                                     */
/* ================================================================ */
function getActiveCase(roomId) {
  return state.cases
    .filter(function (c) { return c.roomId === String(roomId) && c.status === "active"; })
    .sort(function (a, b) { return (a.createdAt || "") < (b.createdAt || "") ? 1 : -1; })[0] || null;
}

/* ================================================================ */
/*  Events helpers                                                    */
/* ================================================================ */
function getEvents(caseId) {
  return (state.eventsByCaseId[String(caseId)] || []).slice()
    .sort(function (a, b) { return new Date(a.happenedAt) - new Date(b.happenedAt); });
}

async function addEvent(caseId, payload) {
  const happenedAt = nowISO();
  const eventData = {
    eventKey: payload.eventKey,
    action: payload.action,
    happenedAt: happenedAt,
    auto: !!payload.auto
  };

  /* Optimistic local update */
  const localEvent = Object.assign({ id: "tmp-" + Date.now(), createdAt: happenedAt }, eventData);
  state.eventsByCaseId[String(caseId)] = state.eventsByCaseId[String(caseId)] || [];
  state.eventsByCaseId[String(caseId)].push(localEvent);

  try {
    const saved = await apiRequest("POST", "/cases/" + caseId + "/events", eventData);
    /* Replace tmp entry with real one from server */
    const arr = state.eventsByCaseId[String(caseId)];
    const idx = arr.findIndex(function (e) { return e.id === localEvent.id; });
    if (idx !== -1) arr.splice(idx, 1, mapEvent(saved));
  } catch (err) {
    /* Rollback optimistic update on failure */
    const arr = state.eventsByCaseId[String(caseId)];
    const idx = arr.findIndex(function (e) { return e.id === localEvent.id; });
    if (idx !== -1) arr.splice(idx, 1);
    toast("Erro ao salvar evento: " + err.message);
  }
}

function findFirstEventTime(caseId, eventKey, action) {
  const ev = (state.eventsByCaseId[String(caseId)] || [])
    .filter(function (e) { return e.eventKey === eventKey && e.action === action; })
    .sort(function (a, b) { return new Date(a.happenedAt) - new Date(b.happenedAt); })[0];
  return ev ? new Date(ev.happenedAt) : null;
}

function isOpen(caseId, eventKey) {
  const t = EVENT_TYPES.find(function (x) { return x.key === eventKey; });
  const ev = (state.eventsByCaseId[String(caseId)] || []).filter(function (e) { return e.eventKey === eventKey; });
  const actions = ev.map(function (e) { return e.action; });
  if (!t) return false;
  if (t.mode === "start_end") return actions.includes("start") && !actions.includes("end");
  if (t.mode === "in_out") return actions.includes("in") && !actions.includes("out");
  return false;
}

function getOpenEventKeys(caseId) {
  return EVENT_TYPES.map(function (t) { return t.key; }).filter(function (k) { return isOpen(caseId, k); });
}

function hasAnyAutoClosures(caseId) {
  return (state.eventsByCaseId[String(caseId)] || []).some(function (e) { return e.auto; });
}

function countAutoClosures(caseId) {
  return (state.eventsByCaseId[String(caseId)] || []).filter(function (e) { return e.auto; }).length;
}

function autoClose(caseId, eventKey) {
  const t = EVENT_TYPES.find(function (x) { return x.key === eventKey; });
  if (!t) return;
  if (!isOpen(caseId, eventKey)) return;
  const action = (t.mode === "start_end") ? "end" : "out";
  addEvent(caseId, { eventKey: eventKey, action: action, auto: true });
}

/* ================================================================ */
/*  Rules                                                             */
/* ================================================================ */
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

/* ================================================================ */
/*  Event UI state                                                    */
/* ================================================================ */
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

/* ================================================================ */
/*  Status & phases                                                   */
/* ================================================================ */
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

async function updateCasePhasesFromEvents(caseObj) {
  const caseId = caseObj.id;
  const patientOut = findFirstEventTime(caseId, "patient_in_or", "out");
  const roomEnd = findFirstEventTime(caseId, "room_setup", "end");

  const newPatientPhase = patientOut ? "closed" : "open";
  const newRoomPhase = roomEnd ? "closed" : "open";
  const newStatus = (roomEnd && caseObj.status !== "closed") ? "closed" : caseObj.status;

  const changed = (
    caseObj.patientPhase !== newPatientPhase ||
    caseObj.roomPhase !== newRoomPhase ||
    caseObj.status !== newStatus
  );

  caseObj.patientPhase = newPatientPhase;
  caseObj.roomPhase = newRoomPhase;

  if (roomEnd && caseObj.status !== "closed") {
    caseObj.status = "closed";
    try {
      await apiRequest("PATCH", "/cases/" + caseId, { roomPhase: "closed", patientPhase: newPatientPhase, status: "closed" });
    } catch (err) {
      console.error("updateCasePhases patch:", err.message);
    }
    const roomId = caseObj.roomId;
    const existsActive = state.cases.some(function (c) { return c.roomId === roomId && c.status === "active" && c.id !== caseObj.id; });
    if (!existsActive) {
      await ensureActiveCaseRemote(roomId);
    }
  } else if (changed) {
    try {
      await apiRequest("PATCH", "/cases/" + caseId, { roomPhase: newRoomPhase, patientPhase: newPatientPhase, status: caseObj.status });
    } catch (err) {
      console.error("updateCasePhases patch:", err.message);
    }
  }
}

/* ================================================================ */
/*  Metrics                                                           */
/* ================================================================ */
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

/* ================================================================ */
/*  Toast                                                             */
/* ================================================================ */
let _toastTimer = null;
function toast(msg) {
  const t = safeEl("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.remove("hidden");
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function () { t.classList.add("hidden"); }, 2600);
}

/* ================================================================ */
/*  Click lock                                                        */
/* ================================================================ */
const clickLockUntilByKey = new Map();
function isLocked(key) { return Date.now() < (clickLockUntilByKey.get(key) || 0); }
function lock(key) { clickLockUntilByKey.set(key, Date.now() + CLICK_LOCK_MS); }

/* ================================================================ */
/*  Navigation                                                        */
/* ================================================================ */
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

/* ================================================================ */
/*  Current room                                                      */
/* ================================================================ */
let currentRoomId = null;

/* ================================================================ */
/*  Render: Rooms                                                     */
/* ================================================================ */
function renderRooms() {
  const grid = safeEl("roomsGrid");
  if (!grid) return;
  grid.innerHTML = "";

  for (let i = 0; i < state.rooms.length; i++) {
    const room = state.rooms[i];
    const c = getActiveCase(room.id);
    if (!c) continue;

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
    (function (roomId) {
      btn.addEventListener("click", function () {
        currentRoomId = roomId;
        renderRoomDetail(true);
        showRoomDetail();
      });
    })(room.id);
    right.appendChild(btn);

    wrap.appendChild(left);
    wrap.appendChild(right);
    card.appendChild(wrap);
    grid.appendChild(card);
  }
}

/* ================================================================ */
/*  Render: Room detail                                               */
/* ================================================================ */
function renderRoomDetail(fullRender) {
  const room = state.rooms.find(function (r) { return r.id === currentRoomId; });
  const c = getActiveCase(currentRoomId);
  if (!c) return;

  if (fullRender) {
    setTextById("roomTitle", (room && room.code) ? room.code : "Sala");
    setTextById("roomStatus", deriveRoomStatus(c.id));

    const caseLine = safeEl("caseLine");
    if (caseLine) caseLine.textContent = "Caso: " + c.code + " · Proced.: " + (String(c.data.procedureName || "").trim() || "—");

    const patientLine = safeEl("patientLine");
    if (patientLine) patientLine.textContent =
      "Paciente: " + (String(c.data.fullName || "").trim() || "—") +
      " · Cirurgião: " + (String(c.data.surgeonName || "").trim() || "—");

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

/* ================================================================ */
/*  Render: Actions                                                   */
/* ================================================================ */
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
        addEvent(caseObj.id, { eventKey: eventType.key, action: next, auto: false }).then(function () {
          updateCasePhasesFromEvents(caseObj).then(function () {
            renderRoomDetail(true);
            renderRooms();
            renderDashboardTv();
            renderReports();
          });
        });

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

/* ================================================================ */
/*  Dashboard TV + Reports                                            */
/* ================================================================ */
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

  addKpi("Cases (total)", String(totalCases), "RPA.in " + pct(withRpaIn, totalCases) + " · RPA.out " + pct(withRpaOut, totalCases));
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
    if (!c) continue;
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

    (function (roomId) {
      tr.addEventListener("click", function () {
        currentRoomId = roomId;
        renderRoomDetail(true);
        showRoomDetail();
      });
    })(room.id);

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

/* ================================================================ */
/*  Modal details                                                     */
/* ================================================================ */
const detailsModal = safeEl("detailsModal");

function openDetailsModal() {
  const c = getActiveCase(currentRoomId);
  if (!c) return;
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

async function saveDetailsFromModal() {
  const c = getActiveCase(currentRoomId);
  if (!c) return;
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

  try {
    await apiRequest("PATCH", "/cases/" + c.id, { data: c.data });
  } catch (err) {
    toast("Erro ao salvar detalhes: " + err.message);
  }
}

/* ================================================================ */
/*  Undo                                                              */
/* ================================================================ */
async function undoLastManualEventForActiveCase() {
  const c = getActiveCase(currentRoomId);
  if (!c) return;
  const arr = state.eventsByCaseId[String(c.id)] || [];

  for (let i = arr.length - 1; i >= 0; i--) {
    const e = arr[i];
    if (!e.auto) {
      const removed = arr.splice(i, 1)[0];
      toast("Desfeito: " + removed.eventKey + " (" + removed.action + ")");
      if (!String(removed.id).startsWith("tmp-")) {
        try {
          await apiRequest("DELETE", "/events/" + removed.id);
        } catch (err) {
          arr.splice(i, 0, removed);
          toast("Erro ao desfazer: " + err.message);
          return;
        }
      }
      await updateCasePhasesFromEvents(c);
      renderRoomDetail(true);
      renderRooms();
      renderDashboardTv();
      renderReports();
      return;
    }
  }
  toast("Nada para desfazer (nenhum evento manual).");
}

/* ================================================================ */
/*  Clock tick                                                        */
/* ================================================================ */
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

/* ================================================================ */
/*  Login screen                                                      */
/* ================================================================ */
function showLoginScreen() {
  const login = safeEl("loginScreen");
  const app = safeEl("mainApp");
  if (login) login.classList.remove("hidden");
  if (app) app.classList.add("hidden");
}

function showMainApp() {
  const login = safeEl("loginScreen");
  const app = safeEl("mainApp");
  if (login) login.classList.add("hidden");
  if (app) app.classList.remove("hidden");
}

function wireLoginScreen() {
  const form = safeEl("loginForm");
  const errEl = safeEl("loginError");
  const btn = safeEl("loginBtn");

  function showErr(msg) {
    if (!errEl) return;
    errEl.textContent = msg;
    errEl.classList.remove("hidden");
  }
  function clearErr() {
    if (errEl) errEl.classList.add("hidden");
  }

  if (!form) return;
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    clearErr();

    const tenant = (safeEl("loginTenant") && safeEl("loginTenant").value || "").trim();
    const usernameOrCode = (safeEl("loginUsernameOrCode") && safeEl("loginUsernameOrCode").value || "").trim();
    const password = (safeEl("loginPassword") && safeEl("loginPassword").value || "");

    if (!tenant || !usernameOrCode || !password) {
      showErr("Preencha todos os campos.");
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = "Entrando…"; }

    try {
      const res = await fetch(API_BASE + "/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant: tenant, usernameOrCode: usernameOrCode, password: password })
      });

      const data = await res.json();
      if (!res.ok) {
        showErr(data.error || "Erro ao fazer login.");
        return;
      }

      setAuth(data.token, data.tenant.slug, data.user, data.tenant);
      await initMainApp();
    } catch (err) {
      showErr("Não foi possível conectar ao servidor.");
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "Entrar"; }
    }
  });
}

/* ================================================================ */
/*  Main app init                                                     */
/* ================================================================ */
async function initMainApp() {
  showMainApp();

  const user = getLoggedUser();
  const tenantInfo = getLoggedTenant();

  setTextById("buildStamp", APP_VERSION + " · " + BUILD_STAMP);
  setTextById("headerHospitalName", tenantInfo ? tenantInfo.name : "—");
  setTextById("headerUserName", user ? user.name : "—");
  const roleEl = safeEl("headerUserRole");
  if (roleEl && user) roleEl.textContent = user.role === "admin" ? "admin" : "colaborador";

  if (state.rooms.length === 0) {
    try {
      await loadStateFromAPI();
    } catch (err) {
      toast("Erro ao carregar dados: " + err.message);
    }
  }

  if (state.rooms.length === 0) {
    const grid = safeEl("roomsGrid");
    if (grid) grid.innerHTML = "<p class='text-slate-500 text-sm'>Nenhuma sala cadastrada neste hospital.</p>";
  } else {
    currentRoomId = state.rooms[0].id;
  }

  setSelectedTab("tabRooms");
  renderRooms();
  renderDashboardTv();
  renderReports();

  tickClockOnly();
}

/* ================================================================ */
/*  Wire + init                                                       */
/* ================================================================ */
function wire() {
  wireLoginScreen();

  /* Tabs */
  const tabRooms = safeEl("tabRooms");
  const tabDash = safeEl("tabDashboard");
  const tabRep = safeEl("tabReports");
  if (tabRooms) tabRooms.addEventListener("click", function () { setSelectedTab("tabRooms"); });
  if (tabDash) tabDash.addEventListener("click", function () { setSelectedTab("tabDashboard"); });
  if (tabRep) tabRep.addEventListener("click", function () { setSelectedTab("tabReports"); });

  /* Back button */
  const btnBack = safeEl("btnBackToRooms");
  if (btnBack) btnBack.addEventListener("click", function () { setSelectedTab("tabRooms"); renderRooms(); });

  /* Details modal */
  const btnOpen = safeEl("btnDetailsOpen");
  const btnClose = safeEl("btnCloseDetails");
  const btnSave = safeEl("btnSaveDetails");
  if (btnOpen) btnOpen.addEventListener("click", function () { openDetailsModal(); });
  if (btnClose) btnClose.addEventListener("click", function () { if (detailsModal) detailsModal.classList.add("hidden"); });
  if (btnSave) btnSave.addEventListener("click", async function () {
    await saveDetailsFromModal();
    if (detailsModal) detailsModal.classList.add("hidden");
    toast("Detalhes salvos.");
    renderRoomDetail(true);
    renderRooms();
    renderDashboardTv();
    renderReports();
  });
  if (detailsModal) detailsModal.addEventListener("click", function (e) { if (e.target === detailsModal) detailsModal.classList.add("hidden"); });

  /* Undo + Voice */
  const btnUndo = safeEl("btnUndoManual");
  const btnVoice = safeEl("btnVoice");
  if (btnUndo) btnUndo.addEventListener("click", function () { undoLastManualEventForActiveCase(); });
  if (btnVoice) btnVoice.addEventListener("click", function () { toast("Modo voz (futuro)"); });

  /* Logout */
  const btnLogout = safeEl("btnLogout");
  if (btnLogout) btnLogout.addEventListener("click", function () {
    if (!confirm("Deseja sair?")) return;
    clearAuth();
    state.rooms = [];
    state.cases = [];
    state.eventsByCaseId = {};
    showLoginScreen();
  });

  /* Clock tick every second */
  setInterval(tickClockOnly, 1000);

  /* Check auth state on load */
  if (isLoggedIn()) {
    initMainApp();
  } else {
    showLoginScreen();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", wire);
} else {
  wire();
}
