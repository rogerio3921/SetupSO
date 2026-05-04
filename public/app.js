// SetupSO — MVP online — app.js
// Multi-hospital · Autenticação JWT · PostgreSQL
// Build: 2026-05-04

const APP_VERSION = "MVP Online";
const BUILD_STAMP = "2026-05-04";
const CLICK_LOCK_MS = 1000;

// ─── Auth / API helpers ──────────────────────────────────────────────────────

function getToken() { return localStorage.getItem("setupso_token") || ""; }
function getUser() {
  try { return JSON.parse(localStorage.getItem("setupso_user") || "null"); }
  catch { return null; }
}
function logout() {
  localStorage.removeItem("setupso_token");
  localStorage.removeItem("setupso_user");
  window.location.replace("/login.html");
}

async function apiFetch(path, opts) {
  opts = opts || {};
  opts.headers = Object.assign({ "Content-Type": "application/json", "Authorization": "Bearer " + getToken() }, opts.headers || {});
  if (opts.body && typeof opts.body === "object") opts.body = JSON.stringify(opts.body);

  const r = await fetch("/api" + path, opts);

  if (r.status === 401) {
    logout();
    throw new Error("Sessão expirada.");
  }

  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Erro na requisição.");
  return data;
}

// ─── Utils ───────────────────────────────────────────────────────────────────

function pad2(n) { return String(n).padStart(2, "0"); }
function toISODate(d) { return String(d.getFullYear()) + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
function formatDateBRFromISO(isoDate) {
  const m = String(isoDate || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? (m[3] + "/" + m[2] + "/" + m[1]) : "—";
}
function formatTimeBR_HHmmss(isoOrDate) {
  const d = (isoOrDate instanceof Date) ? isoOrDate : new Date(isoOrDate);
  if (isNaN(d.getTime())) return "—";
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

// ─── DOM helpers ─────────────────────────────────────────────────────────────

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

// ─── Events model ─────────────────────────────────────────────────────────────

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

// ─── State (em memória, carregado da API) ────────────────────────────────────

const state = {
  rooms: [],
  // caseByRoomId[roomId] = { case, events }
  caseByRoomId: {}
};

// Sala e case ativos no momento
let currentRoomId = null;

// ─── API calls ────────────────────────────────────────────────────────────────

async function loadRooms() {
  const data = await apiFetch("/rooms");
  state.rooms = data.rooms || [];
}

async function loadActiveCase(roomId) {
  const data = await apiFetch("/rooms/" + roomId + "/active-case");
  state.caseByRoomId[roomId] = { case: data.case, events: data.events || [] };
  return state.caseByRoomId[roomId];
}

async function postEvent(caseId, payload) {
  return apiFetch("/cases/" + caseId + "/events", { method: "POST", body: payload });
}

async function deleteEvent(caseId, eventId) {
  return apiFetch("/cases/" + caseId + "/events/" + eventId, { method: "DELETE" });
}

async function patchCase(caseId, body) {
  return apiFetch("/cases/" + caseId, { method: "PATCH", body: body });
}

async function loadAllCases() {
  const data = await apiFetch("/cases");
  return data.cases || [];
}

// ─── Event helpers ────────────────────────────────────────────────────────────

function getEvents(roomId) {
  const s = state.caseByRoomId[roomId];
  return (s && s.events) ? s.events.slice().sort(function (a, b) { return new Date(a.happenedAt) - new Date(b.happenedAt); }) : [];
}
function getEventsForCase(caseEvents) {
  return (caseEvents || []).slice().sort(function (a, b) { return new Date(a.happenedAt) - new Date(b.happenedAt); });
}

function findFirstEventTime(events, eventKey, action) {
  const ev = events
    .filter(function (e) { return e.eventKey === eventKey && e.action === action; })
    .sort(function (a, b) { return new Date(a.happenedAt) - new Date(b.happenedAt); })[0];
  return ev ? new Date(ev.happenedAt) : null;
}
function isOpen(events, eventKey) {
  const t = EVENT_TYPES.find(function (x) { return x.key === eventKey; });
  const ev = events.filter(function (e) { return e.eventKey === eventKey; });
  const actions = ev.map(function (e) { return e.action; });
  if (!t) return false;
  if (t.mode === "start_end") return actions.includes("start") && !actions.includes("end");
  if (t.mode === "in_out") return actions.includes("in") && !actions.includes("out");
  return false;
}
function getOpenEventKeys(events) {
  return EVENT_TYPES.map(function (t) { return t.key; }).filter(function (k) { return isOpen(events, k); });
}
function hasAnyAutoClosures(events) { return events.some(function (e) { return e.auto; }); }
function countAutoClosures(events) { return events.filter(function (e) { return e.auto; }).length; }

// ─── Auto-closures (calculadas localmente antes de enviar para API) ───────────

function getAutoClosurePayloads(events, ctx) {
  const eventKey = ctx.eventKey;
  const action = ctx.action;
  const toClose = [];

  function mustClose(key) {
    if (isOpen(events, key)) toClose.push(key);
  }

  if (eventKey === "admission_cc" && action === "in") mustClose("transport_patient");
  if (eventKey === "patient_in_or" && action === "in") { mustClose("transport_patient"); mustClose("admission_cc"); }
  if (eventKey === "time_out" && action === "start") mustClose("positioning");
  if (eventKey === "surgery" && action === "start") mustClose("time_out");
  if (eventKey === "cleaning" && action === "in") {
    mustClose("surgery"); mustClose("anesthesia"); mustClose("patient_in_or");
  }
  if (eventKey === "rpa" && action === "in") {
    for (let i = 0; i < EVENT_TYPES.length; i++) {
      if (EVENT_TYPES[i].key !== "rpa") mustClose(EVENT_TYPES[i].key);
    }
  }
  if (eventKey === "room_setup" && action === "start") {
    for (let i = 0; i < EVENT_TYPES.length; i++) {
      if (EVENT_TYPES[i].key !== "room_setup") mustClose(EVENT_TYPES[i].key);
    }
  }

  return toClose.map(function (key) {
    const t = EVENT_TYPES.find(function (x) { return x.key === key; });
    const act = t && t.mode === "start_end" ? "end" : "out";
    return { eventKey: key, action: act, auto: true };
  });
}

// ─── Event UI state ──────────────────────────────────────────────────────────

function nextActionForEvent(eventType, eventsForKey) {
  const actions = eventsForKey.map(function (e) { return e.action; });
  if (eventType.mode === "start_end") {
    if (!actions.includes("start")) return "start";
    if (actions.includes("start") && !actions.includes("end")) return "end";
    return "start";
  }
  if (eventType.mode === "in_out") {
    if (!actions.includes("in")) return "in";
    if (actions.includes("in") && !actions.includes("out")) return "out";
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

// ─── Metrics ─────────────────────────────────────────────────────────────────

function computeSpanMs(startDate, endDate) {
  if (!startDate) return null;
  const end = endDate || new Date();
  return end.getTime() - startDate.getTime();
}
function computeStageDurationMs(events, eventKey) {
  const t = EVENT_TYPES.find(function (x) { return x.key === eventKey; });
  if (!t) return null;
  if (t.mode === "start_end") {
    const s = findFirstEventTime(events, eventKey, "start");
    const e = findFirstEventTime(events, eventKey, "end");
    return computeSpanMs(s, e);
  }
  const si = findFirstEventTime(events, eventKey, "in");
  const so = findFirstEventTime(events, eventKey, "out");
  return computeSpanMs(si, so);
}
function computeOrTimeMs(events) { return computeStageDurationMs(events, "patient_in_or"); }
function computeSurgeryTimeMs(events) { return computeStageDurationMs(events, "surgery"); }
function computeAnesthesiaTimeMs(events) { return computeStageDurationMs(events, "anesthesia"); }
function computeRpaTimeMs(events) { return computeStageDurationMs(events, "rpa"); }
function computeTotalToRpaInMs(events) {
  const startAt = findFirstEventTime(events, "transport_patient", "start");
  const endAt = findFirstEventTime(events, "rpa", "in");
  return computeSpanMs(startAt, endAt);
}
function computeTotalCcMs(events) {
  const startAt = findFirstEventTime(events, "transport_patient", "start");
  const endAt = findFirstEventTime(events, "rpa", "out");
  return computeSpanMs(startAt, endAt);
}
function computeDelays(caseObj, events) {
  const d = caseObj.data || {};
  const planned = String(d.plannedSurgeryTimeHHMM || "").trim();
  const refISO = String(d.referenceDateISO || "").trim();
  const plannedDate = (refISO && planned) ? todayAtHHMMUsingISODate(refISO, planned) : null;
  if (!plannedDate) return { patient: null, surgTeam: null, anesTeam: null };

  const patientIn = findFirstEventTime(events, "patient_in_or", "in");
  const surgTeamIn = findFirstEventTime(events, "surgical_team", "in");
  const anesTeamIn = findFirstEventTime(events, "anesthesia_team", "in");

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

function deriveRoomStatus(events) {
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
    if (isOpen(events, priority[i].key)) return priority[i].label;
  }
  return "EM PREPARO";
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function toast(msg) {
  const t = safeEl("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.remove("hidden");
  setTimeout(function () { t.classList.add("hidden"); }, 2600);
}

// ─── Click lock ───────────────────────────────────────────────────────────────

const clickLockUntilByKey = new Map();
function isLocked(key) { return Date.now() < (clickLockUntilByKey.get(key) || 0); }
function lock(key) { clickLockUntilByKey.set(key, Date.now() + CLICK_LOCK_MS); }

// ─── Navigation ───────────────────────────────────────────────────────────────

function setSelectedTab(tabId) {
  const tabs = [
    { id: "tabRooms", view: "viewRooms" },
    { id: "tabDashboard", view: "viewDashboard" },
    { id: "tabReports", view: "viewReports" },
    { id: "tabAdmin", view: "viewAdmin" }
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
  const ids = ["viewRooms", "viewDashboard", "viewReports", "viewAdmin"];
  for (let i = 0; i < ids.length; i++) {
    const v = safeEl(ids[i]);
    if (v) v.classList.add("hidden");
  }
  const d = safeEl("viewRoomDetail");
  if (d) d.classList.remove("hidden");
  ["tabRooms", "tabDashboard", "tabReports", "tabAdmin"].forEach(function (id) {
    const b = safeEl(id);
    if (b) b.setAttribute("aria-selected", "false");
  });
}

// ─── Render: Rooms ────────────────────────────────────────────────────────────

function renderRooms() {
  const grid = safeEl("roomsGrid");
  if (!grid) return;
  grid.innerHTML = "";

  if (state.rooms.length === 0) {
    grid.appendChild(el("div", "text-sm text-slate-400 p-4", "Nenhuma sala cadastrada."));
    return;
  }

  for (let i = 0; i < state.rooms.length; i++) {
    const room = state.rooms[i];
    const cs = state.caseByRoomId[room.id];
    const caseObj = cs && cs.case;
    const events = cs ? getEventsForCase(cs.events) : [];

    const card = el("div", "card bg-white border border-slate-200 shadow-sm p-4");
    const wrap = el("div", "flex flex-wrap items-start justify-between gap-3");
    const left = el("div", "min-w-0");
    const right = el("div", "shrink-0 flex flex-col gap-2");

    const top = el("div", "flex items-center gap-2");
    top.appendChild(el("div", "text-lg font-black", room.code));
    if (caseObj) {
      top.appendChild(chip(deriveRoomStatus(events), "bg-slate-100 border border-slate-200 text-slate-700"));
      top.appendChild(chip(caseObj.code, "bg-slate-100 border border-slate-200 text-slate-700 mono"));
    } else {
      top.appendChild(chip("Carregando…", "bg-slate-100 border border-slate-200 text-slate-400"));
    }
    left.appendChild(top);

    if (caseObj) {
      const data = caseObj.data || {};
      const info = el("div", "mt-2 text-sm text-slate-700");
      const p1 = el("div");
      p1.appendChild(el("span", "text-slate-500 font-bold", "Paciente: "));
      p1.appendChild(document.createTextNode(String(data.fullName || "").trim() || "—"));
      info.appendChild(p1);

      const row = el("div", "mt-1 grid grid-cols-2 gap-2");
      const a = el("div");
      a.appendChild(el("span", "text-slate-500 font-bold", "Aviso: "));
      a.appendChild(el("span", "mono", String(data.noticeNumber || "").trim() || "—"));
      const b = el("div");
      b.appendChild(el("span", "text-slate-500 font-bold", "Cirurgião: "));
      b.appendChild(document.createTextNode(String(data.surgeonName || "").trim() || "—"));
      row.appendChild(a); row.appendChild(b);
      info.appendChild(row);

      const p2 = el("div", "mt-1");
      p2.appendChild(el("span", "text-slate-500 font-bold", "Procedimento: "));
      p2.appendChild(document.createTextNode(String(data.procedureName || "").trim() || "—"));
      info.appendChild(p2);
      left.appendChild(info);

      const kpis = el("div", "mt-3 grid grid-cols-2 gap-2 text-sm");
      const k1 = el("div", "bg-slate-50 border border-slate-200 rounded-xl p-3");
      k1.appendChild(el("div", "text-xs text-slate-500 font-bold uppercase", "Tempo de SO"));
      const msSO = computeOrTimeMs(events);
      k1.appendChild(el("div", "mt-1 mono font-black", msSO === null ? "—" : formatDurationNoSign(msSO)));

      const k2 = el("div", "bg-slate-50 border border-slate-200 rounded-xl p-3");
      k2.appendChild(el("div", "text-xs text-slate-500 font-bold uppercase", "Total (Transp→RPA.in)"));
      const msTR = computeTotalToRpaInMs(events);
      k2.appendChild(el("div", "mt-1 mono font-black", msTR === null ? "—" : formatDurationNoSign(msTR)));

      kpis.appendChild(k1); kpis.appendChild(k2);
      left.appendChild(kpis);
    }

    const btn = el("button", "btn bg-blue-600 text-white px-4 py-2", "Abrir sala");
    btn.addEventListener("click", (function (rId) {
      return async function () {
        currentRoomId = rId;
        if (!state.caseByRoomId[rId]) {
          try { await loadActiveCase(rId); }
          catch (err) { toast("Erro ao carregar sala: " + err.message); return; }
        }
        renderRoomDetail(true);
        showRoomDetail();
      };
    })(room.id));
    right.appendChild(btn);

    wrap.appendChild(left);
    wrap.appendChild(right);
    card.appendChild(wrap);
    grid.appendChild(card);
  }
}

// ─── Render: Room detail ──────────────────────────────────────────────────────

function renderRoomDetail(fullRender) {
  const room = state.rooms.find(function (r) { return r.id === currentRoomId; });
  const cs = state.caseByRoomId[currentRoomId];
  if (!cs) return;

  const caseObj = cs.case;
  const events = getEventsForCase(cs.events);

  if (fullRender) {
    setTextById("roomTitle", (room && room.code) ? room.code : "Sala");
    setTextById("roomStatus", deriveRoomStatus(events));

    const caseLine = safeEl("caseLine");
    if (caseLine) caseLine.textContent = "Caso: " + caseObj.code + " • Proced.: " + (String((caseObj.data || {}).procedureName || "").trim() || "—");

    const patientLine = safeEl("patientLine");
    if (patientLine) patientLine.textContent =
      "Paciente: " + (String((caseObj.data || {}).fullName || "").trim() || "—") +
      " • Cirurgião: " + (String((caseObj.data || {}).surgeonName || "").trim() || "—");

    setTextById("noticeNumber", String((caseObj.data || {}).noticeNumber || "").trim() || "—");
    setTextById("attendanceNumber", String((caseObj.data || {}).attendanceNumber || "").trim() || "—");
    setTextById("plannedSurgery", String((caseObj.data || {}).plannedSurgeryTimeHHMM || "").trim() || "—");

    const delays = computeDelays(caseObj, events);
    setTextById("delayPatientInOr", delays.patient !== null ? formatDurationSigned(delays.patient) : "—");
    setTextById("delaySurgicalTeam", delays.surgTeam !== null ? formatDurationSigned(delays.surgTeam) : "—");
    setTextById("delayAnesthesiaTeam", delays.anesTeam !== null ? formatDurationSigned(delays.anesTeam) : "—");

    const allergyBanner = safeEl("allergyBanner");
    if (allergyBanner) {
      const has = !!String((caseObj.data || {}).allergies || "").trim();
      allergyBanner.classList.toggle("hidden", !has);
      if (has) setTextById("allergyText", String((caseObj.data || {}).allergies || "").trim());
    }

    renderActions(caseObj, events);
    renderRecentEvents(events);
    renderDashboardTv();
  }

  const msSO = computeOrTimeMs(events);
  setTextById("orTime", msSO === null ? "—" : formatDurationNoSign(msSO));
  const total = computeTotalToRpaInMs(events);
  setTextById("timelineTotal", total === null ? "—" : formatDurationNoSign(total));
}

// ─── Render: Recent events ────────────────────────────────────────────────────

function renderRecentEvents(events) {
  // Durations list
  const dl = safeEl("durationsList");
  if (dl) {
    dl.innerHTML = "";
    const stageKeys = [
      "transport_patient", "admission_cc", "patient_in_or", "anesthesia",
      "positioning", "time_out", "surgery", "cleaning", "rpa"
    ];
    stageKeys.forEach(function (key) {
      const t = EVENT_TYPES.find(function (x) { return x.key === key; });
      if (!t) return;
      const ms = computeStageDurationMs(events, key);
      if (ms === null) return;
      const li = el("li", "flex items-center justify-between gap-2 text-xs");
      li.appendChild(el("span", "text-slate-600", t.label));
      li.appendChild(el("span", "mono font-black", formatDurationNoSign(ms)));
      dl.appendChild(li);
    });
  }

  // Recent events list
  const ul = safeEl("recentEvents");
  if (!ul) return;
  ul.innerHTML = "";

  const sorted = events.slice().sort(function (a, b) { return new Date(b.happenedAt) - new Date(a.happenedAt); });
  const recent = sorted.slice(0, 20);

  for (let i = 0; i < recent.length; i++) {
    const e = recent[i];
    const t = EVENT_TYPES.find(function (x) { return x.key === e.eventKey; });
    const label = t ? t.label : e.eventKey;
    const li = el("li", "flex items-center justify-between gap-2 text-xs border-b border-slate-100 pb-1");

    const left = el("span", "flex items-center gap-2");
    left.appendChild(chip(actionLabel(e.action), e.auto ? "bg-amber-100 text-amber-900" : "bg-blue-100 text-blue-900"));
    left.appendChild(el("span", "text-slate-700 font-bold", label));
    if (e.auto) left.appendChild(chip("auto", "bg-amber-50 text-amber-700 border border-amber-200"));

    const right = el("span", "text-right text-slate-500");
    const byLine = e.createdByName ? " · " + e.createdByName : "";
    right.appendChild(el("span", "mono", formatTimeBR_HHmmss(new Date(e.happenedAt))));
    right.appendChild(el("span", "block text-slate-400", byLine));

    li.appendChild(left);
    li.appendChild(right);
    ul.appendChild(li);
  }
}

// ─── Render: Actions ──────────────────────────────────────────────────────────

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

function renderActions(caseObj, events) {
  const grid = safeEl("actionsGrid");
  if (!grid) return;
  grid.innerHTML = "";

  for (let i = 0; i < EVENT_TYPES.length; i++) {
    const t = EVENT_TYPES[i];
    const evForKey = events.filter(function (e) { return e.eventKey === t.key; });
    const ui = computeEventUIState(t, evForKey);
    const st = stylesForCard(t, ui);

    const btn = el("button", ("btn btn-xl border shadow-sm " + st.text).trim());
    btn.setAttribute("style", st.style);

    const row = el("div", "flex items-center justify-between gap-2");
    row.appendChild(el("span", "truncate", String(t.seq) + ". " + t.label));
    row.appendChild(el("span", st.badge, badgeTextForCard(t, ui)));
    btn.appendChild(row);

    (function (eventType, uiState, eventsForKeyLocal) {
      btn.addEventListener("click", async function () {
        const lockKey = "evt:" + caseObj.id + ":" + eventType.key;
        if (isLocked(lockKey)) { toast("Aguarde 1s (anti-toque duplo)."); return; }
        lock(lockKey);

        if (!uiState.validation.ok) { toast("Bloqueado: " + uiState.validation.reason); return; }
        const next = nextActionForEvent(eventType, eventsForKeyLocal);

        const cs = state.caseByRoomId[currentRoomId];
        const currentEvents = cs ? getEventsForCase(cs.events) : [];

        if (eventType.key === "cleaning" && next === "in") {
          if (isOpen(currentEvents, "surgery") || isOpen(currentEvents, "anesthesia") || isOpen(currentEvents, "patient_in_or")) {
            if (!confirm("Ao iniciar Limpeza, Cirurgia, Anestesia e Paciente em SO (se em andamento) serão concluídas automaticamente. Continuar?")) return;
          }
        }

        if (eventType.key === "rpa" && next === "in") {
          const open = getOpenEventKeys(currentEvents).filter(function (k) { return k !== "rpa"; });
          if (open.length > 0) {
            if (!confirm("Há etapas em andamento. Ao registrar ENTRADA na RPA, todas as etapas em andamento serão concluídas automaticamente. Continuar?")) return;
          }
        }

        // Calcular auto-closures e enviar todos para a API
        const autoPayloads = getAutoClosurePayloads(currentEvents, { eventKey: eventType.key, action: next });

        try {
          // Enviar auto-closures primeiro
          for (let ai = 0; ai < autoPayloads.length; ai++) {
            const { data } = await apiFetch("/cases/" + caseObj.id + "/events", {
              method: "POST",
              body: autoPayloads[ai]
            });
            if (cs) cs.events.push(data && data.event ? data.event : autoPayloads[ai]);
          }

          // Enviar evento principal
          const resp = await apiFetch("/cases/" + caseObj.id + "/events", {
            method: "POST",
            body: { eventKey: eventType.key, action: next, auto: false }
          });

          if (cs && resp.event) cs.events.push(resp.event);

          toast(eventType.label + ": " + actionLabel(next) + " registrado (" + formatTimeBR_HHmmss(new Date()) + ")");

          // Recarregar caso do servidor para ter estado consistente
          await loadActiveCase(currentRoomId);

          renderRoomDetail(true);
          renderRooms();
        } catch (err) {
          toast("Erro ao registrar evento: " + err.message);
        }
      });
    })(t, ui, evForKey);

    grid.appendChild(btn);
  }
}

// ─── Render: Dashboard TV ─────────────────────────────────────────────────────

function renderDashboardTv() {
  const kpisEl = safeEl("dashKpis");
  const tbody = safeEl("dashTvTable");
  const updated = safeEl("dashUpdatedAt");
  if (!kpisEl || !tbody || !updated) return;

  // Coletar todos os cases/events carregados
  const allData = state.rooms.map(function (room) {
    const cs = state.caseByRoomId[room.id];
    return { room: room, caseObj: cs && cs.case, events: cs ? getEventsForCase(cs.events) : [] };
  }).filter(function (d) { return d.caseObj; });

  const totalCases = allData.length;
  const avgOr = avgMs(allData.map(function (d) { return computeOrTimeMs(d.events); }));
  const avgSurg = avgMs(allData.map(function (d) { return computeSurgeryTimeMs(d.events); }));
  const avgAnes = avgMs(allData.map(function (d) { return computeAnesthesiaTimeMs(d.events); }));
  const avgToRpaIn = avgMs(allData.map(function (d) { return computeTotalToRpaInMs(d.events); }));
  const avgRpa = avgMs(allData.map(function (d) { return computeRpaTimeMs(d.events); }));
  const avgTotalCc = avgMs(allData.map(function (d) { return computeTotalCcMs(d.events); }));

  const withRpaIn = allData.filter(function (d) { return !!findFirstEventTime(d.events, "rpa", "in"); }).length;
  const withRpaOut = allData.filter(function (d) { return !!findFirstEventTime(d.events, "rpa", "out"); }).length;
  const plannedCount = allData.filter(function (d) { return !!String(((d.caseObj.data || {}).plannedSurgeryTimeHHMM) || "").trim(); }).length;

  kpisEl.innerHTML = "";
  function addKpi(label, value, sub) {
    const box = el("div", "tv-kpi");
    box.appendChild(el("div", "label", label));
    box.appendChild(el("div", "value mono", value));
    box.appendChild(el("div", "sub", sub));
    kpisEl.appendChild(box);
  }

  addKpi("Cases (ativo)", String(totalCases), "RPA.in " + pct(withRpaIn, totalCases) + " • RPA.out " + pct(withRpaOut, totalCases));
  addKpi("Média Tempo SO", avgOr === null ? "—" : formatDurationNoSign(avgOr), "—");
  addKpi("Média Tempo Cirurgia", avgSurg === null ? "—" : formatDurationNoSign(avgSurg), "—");
  addKpi("Média Tempo RPA", avgRpa === null ? "—" : formatDurationNoSign(avgRpa), "Previsto preenchido: " + pct(plannedCount, totalCases));
  addKpi("Média Transp→RPA.in", avgToRpaIn === null ? "—" : formatDurationNoSign(avgToRpaIn), "—");
  addKpi("Média Total CC", avgTotalCc === null ? "—" : formatDurationNoSign(avgTotalCc), "Transp.start → RPA.out");
  addKpi("Média Anestesia", avgAnes === null ? "—" : formatDurationNoSign(avgAnes), "—");
  addKpi("Auto closures", String(allData.filter(function (d) { return hasAnyAutoClosures(d.events); }).length), "Cases com fechamento automático");

  tbody.innerHTML = "";
  for (let i = 0; i < allData.length; i++) {
    const { room, caseObj, events } = allData[i];
    const data = caseObj.data || {};

    const soIn = findFirstEventTime(events, "patient_in_or", "in");
    const soOut = findFirstEventTime(events, "patient_in_or", "out");
    const surgStart = findFirstEventTime(events, "surgery", "start");
    const surgEnd = findFirstEventTime(events, "surgery", "end");
    const rpaIn = findFirstEventTime(events, "rpa", "in");
    const rpaOut = findFirstEventTime(events, "rpa", "out");

    const msSO = computeOrTimeMs(events);
    const msCir = computeSurgeryTimeMs(events);
    const msR = computeRpaTimeMs(events);
    const msToR = computeTotalToRpaInMs(events);
    const msCC = computeTotalCcMs(events);

    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 cursor-pointer";

    function td(value, clsName) {
      const cell = el("td", (clsName || "") + " py-2 pr-3");
      cell.textContent = value;
      return cell;
    }

    tr.appendChild(td(room.code, "font-black"));
    const stCell = el("td", "py-2 pr-3");
    stCell.appendChild(chip(deriveRoomStatus(events), "bg-slate-100 border border-slate-200 text-slate-700"));
    tr.appendChild(stCell);

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
    tr.appendChild(td(hasAnyAutoClosures(events) ? ("Sim (" + countAutoClosures(events) + ")") : "Não", ""));

    tr.addEventListener("click", (function (rId) {
      return function () {
        currentRoomId = rId;
        renderRoomDetail(true);
        showRoomDetail();
      };
    })(room.id));

    tbody.appendChild(tr);
  }

  updated.textContent = "Atualizado: " + formatTimeBR_HHmmss(new Date());
}

// ─── Render: Reports ─────────────────────────────────────────────────────────

async function renderReports() {
  const tbody = safeEl("reportsTable");
  if (!tbody) return;
  tbody.innerHTML = "";

  let cases = [];
  try {
    cases = await loadAllCases();
  } catch (err) {
    tbody.innerHTML = "<tr><td class='text-slate-400 py-3' colspan='24'>Erro ao carregar relatórios: " + err.message + "</td></tr>";
    return;
  }

  if (cases.length === 0) {
    tbody.innerHTML = "<tr><td class='text-slate-400 py-3' colspan='24'>Nenhum case registrado.</td></tr>";
    return;
  }

  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];

    // Buscar eventos do case
    let caseEvents = [];
    try {
      const evData = await apiFetch("/cases/" + c.id + "/events");
      caseEvents = evData.events || [];
    } catch (_e) {}

    const events = getEventsForCase(caseEvents);
    const data = c.data || {};

    const soIn = findFirstEventTime(events, "patient_in_or", "in");
    const soOut = findFirstEventTime(events, "patient_in_or", "out");
    const anesStart = findFirstEventTime(events, "anesthesia", "start");
    const anesEnd = findFirstEventTime(events, "anesthesia", "end");
    const surgStart = findFirstEventTime(events, "surgery", "start");
    const surgEnd = findFirstEventTime(events, "surgery", "end");
    const trStart = findFirstEventTime(events, "transport_patient", "start");
    const rpaIn = findFirstEventTime(events, "rpa", "in");
    const rpaOut = findFirstEventTime(events, "rpa", "out");

    const msSO = computeOrTimeMs(events);
    const msAn = computeAnesthesiaTimeMs(events);
    const msCir = computeSurgeryTimeMs(events);
    const msR = computeRpaTimeMs(events);
    const msToR = computeTotalToRpaInMs(events);
    const msCC = computeTotalCcMs(events);

    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50";

    function td(value, clsName) {
      const cell = el("td", (clsName || "") + " py-2 pr-3");
      cell.textContent = value;
      return cell;
    }

    tr.appendChild(td(c.room_code || "—", "font-black"));
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

    tr.appendChild(td(c.created_by_name || "—", "text-slate-500"));
    tr.appendChild(td(hasAnyAutoClosures(events) ? ("Sim (" + countAutoClosures(events) + ")") : "Não", ""));
    tr.appendChild(td(c.status === "closed" ? "Concluído" : "Ativo", ""));

    tbody.appendChild(tr);
  }
}

// ─── Render: Admin ────────────────────────────────────────────────────────────

async function renderAdmin() {
  const tbody = safeEl("usersTable");
  if (!tbody) return;
  tbody.innerHTML = "<tr><td colspan='5' class='text-slate-400 py-3'>Carregando…</td></tr>";

  try {
    const data = await apiFetch("/admin/users");
    tbody.innerHTML = "";
    const users = data.users || [];

    if (users.length === 0) {
      tbody.innerHTML = "<tr><td colspan='5' class='text-slate-400 py-3'>Nenhum usuário.</td></tr>";
      return;
    }

    users.forEach(function (u) {
      const tr = el("tr", "hover:bg-slate-50");

      function td(v, cls) {
        const cell = el("td", (cls || "") + " py-2 pr-3");
        cell.textContent = v;
        return cell;
      }

      tr.appendChild(td(u.name, "font-bold"));
      tr.appendChild(td(u.username, "mono text-slate-600"));
      tr.appendChild(td(u.role === "admin" ? "Admin" : "Colaborador", ""));
      const stCell = el("td", "py-2 pr-3");
      stCell.appendChild(chip(u.active ? "Ativo" : "Inativo", u.active ? "bg-emerald-100 text-emerald-900" : "bg-slate-100 text-slate-500"));
      tr.appendChild(stCell);

      const actCell = el("td", "py-2 pr-3");
      const toggleBtn = el("button", "btn bg-white border border-slate-200 px-2 py-1 text-xs text-slate-700", u.active ? "Desativar" : "Ativar");
      toggleBtn.addEventListener("click", async function () {
        try {
          await apiFetch("/admin/users/" + u.id, { method: "PATCH", body: { active: !u.active } });
          renderAdmin();
        } catch (err) {
          toast("Erro: " + err.message);
        }
      });
      actCell.appendChild(toggleBtn);
      tr.appendChild(actCell);

      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = "<tr><td colspan='5' class='text-rose-500 py-3'>Erro: " + err.message + "</td></tr>";
  }
}

// ─── Modal details ────────────────────────────────────────────────────────────

const detailsModal = safeEl("detailsModal");

function openDetailsModal() {
  const cs = state.caseByRoomId[currentRoomId];
  if (!cs) return;
  renderDetailsModal(cs.case);
  if (detailsModal) detailsModal.classList.remove("hidden");
}
function renderDetailsModal(caseObj) {
  const grid = safeEl("detailsGrid");
  if (!grid) return;
  const d = caseObj.data || {};
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
  const cs = state.caseByRoomId[currentRoomId];
  if (!cs) return;

  function val(id) { const e = safeEl(id); return e ? String(e.value || "").trim() : ""; }

  const data = {
    referenceDateISO: val("inpRefDate") || toISODate(new Date()),
    plannedSurgeryTimeHHMM: val("inpPlannedSurgery"),
    fullName: val("inpFullName"),
    noticeNumber: val("inpNotice"),
    attendanceNumber: val("inpAttendance"),
    procedureName: val("inpProcedure"),
    surgeonName: val("inpSurgeon"),
    birthDate: val("inpBirthDate"),
    allergies: val("inpAllergies"),
    weightKg: val("inpWeight"),
    heightCm: val("inpHeight")
  };

  const resp = await patchCase(cs.case.id, { data: data });
  cs.case.data = resp.case.data;
}

// ─── Undo ─────────────────────────────────────────────────────────────────────

async function undoLastManualEvent() {
  const cs = state.caseByRoomId[currentRoomId];
  if (!cs) return;

  const sorted = cs.events.slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  const lastManual = sorted.find(function (e) { return !e.auto; });

  if (!lastManual) { toast("Nada para desfazer (nenhum evento manual)."); return; }

  try {
    await deleteEvent(cs.case.id, lastManual.id);
    cs.events = cs.events.filter(function (e) { return e.id !== lastManual.id; });
    toast("Desfeito: " + lastManual.eventKey + " (" + lastManual.action + ")");
    renderRoomDetail(true);
    renderRooms();
  } catch (err) {
    toast("Erro ao desfazer: " + err.message);
  }
}

// ─── Clock tick ───────────────────────────────────────────────────────────────

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

// ─── Wire + init ──────────────────────────────────────────────────────────────

async function init() {
  // Verificar autenticação
  const token = getToken();
  if (!token) {
    window.location.replace("/login.html");
    return;
  }

  try {
    await apiFetch("/auth/me");
  } catch (_e) {
    window.location.replace("/login.html");
    return;
  }

  const user = getUser();
  if (user) {
    setTextById("userChip", user.name || user.username);
    // Mostrar aba admin apenas para admins
    if (user.role === "admin") {
      const tabAdmin = safeEl("tabAdmin");
      if (tabAdmin) tabAdmin.classList.remove("hidden");
    }
  }

  setTextById("buildStamp", APP_VERSION + " • " + BUILD_STAMP);

  // Ocultar overlay de loading
  const overlay = safeEl("loadingOverlay");
  if (overlay) { overlay.style.opacity = "0"; setTimeout(function () { overlay.style.display = "none"; }, 300); }
  const content = safeEl("appContent");
  if (content) content.style.display = "";

  // Tabs
  const tabRooms = safeEl("tabRooms");
  const tabDash = safeEl("tabDashboard");
  const tabRep = safeEl("tabReports");
  const tabAdmin = safeEl("tabAdmin");
  if (tabRooms) tabRooms.addEventListener("click", function () { setSelectedTab("tabRooms"); renderRooms(); });
  if (tabDash) tabDash.addEventListener("click", function () { setSelectedTab("tabDashboard"); renderDashboardTv(); });
  if (tabRep) tabRep.addEventListener("click", function () { setSelectedTab("tabReports"); renderReports(); });
  if (tabAdmin) tabAdmin.addEventListener("click", function () { setSelectedTab("tabAdmin"); renderAdmin(); });

  // Back to rooms
  const btnBack = safeEl("btnBackToRooms");
  if (btnBack) btnBack.addEventListener("click", function () { setSelectedTab("tabRooms"); renderRooms(); });

  // Details modal
  const btnOpen = safeEl("btnDetailsOpen");
  const btnClose = safeEl("btnCloseDetails");
  const btnSave = safeEl("btnSaveDetails");
  if (btnOpen) btnOpen.addEventListener("click", function () { openDetailsModal(); });
  if (btnClose) btnClose.addEventListener("click", function () { if (detailsModal) detailsModal.classList.add("hidden"); });
  if (btnSave) btnSave.addEventListener("click", async function () {
    try {
      await saveDetailsFromModal();
      if (detailsModal) detailsModal.classList.add("hidden");
      toast("Detalhes salvos.");
      renderRoomDetail(true);
      renderRooms();
      renderDashboardTv();
    } catch (err) {
      toast("Erro ao salvar: " + err.message);
    }
  });
  if (detailsModal) detailsModal.addEventListener("click", function (e) { if (e.target === detailsModal) detailsModal.classList.add("hidden"); });

  // Undo
  const btnUndo = safeEl("btnUndoManual");
  if (btnUndo) btnUndo.addEventListener("click", function () { undoLastManualEvent(); });

  // Logout
  const btnLogout = safeEl("btnLogout");
  if (btnLogout) btnLogout.addEventListener("click", function () { if (confirm("Sair do sistema?")) logout(); });

  // Refresh rooms
  const btnRefresh = safeEl("btnRefreshRooms");
  if (btnRefresh) btnRefresh.addEventListener("click", async function () {
    try {
      await loadRooms();
      for (let i = 0; i < state.rooms.length; i++) {
        await loadActiveCase(state.rooms[i].id);
      }
      renderRooms();
    } catch (err) { toast("Erro ao atualizar: " + err.message); }
  });

  // Refresh reports
  const btnRefreshRep = safeEl("btnRefreshReports");
  if (btnRefreshRep) btnRefreshRep.addEventListener("click", function () { renderReports(); });

  // Admin: new user modal
  const btnNewUser = safeEl("btnNewUser");
  const newUserModal = safeEl("newUserModal");
  const btnCloseNewUser = safeEl("btnCloseNewUser");
  const btnCreateUser = safeEl("btnCreateUser");

  if (btnNewUser && newUserModal) {
    btnNewUser.addEventListener("click", function () { newUserModal.classList.remove("hidden"); });
  }
  if (btnCloseNewUser && newUserModal) {
    btnCloseNewUser.addEventListener("click", function () { newUserModal.classList.add("hidden"); });
  }
  if (btnCreateUser) {
    btnCreateUser.addEventListener("click", async function () {
      const errEl = safeEl("newUserError");
      function showErr(msg) { if (errEl) { errEl.textContent = msg; errEl.classList.remove("hidden"); } }
      function hideErr() { if (errEl) errEl.classList.add("hidden"); }
      hideErr();

      const name = safeEl("inpNewName") ? safeEl("inpNewName").value.trim() : "";
      const username = safeEl("inpNewUsername") ? safeEl("inpNewUsername").value.trim() : "";
      const password = safeEl("inpNewPassword") ? safeEl("inpNewPassword").value : "";
      const role = safeEl("inpNewRole") ? safeEl("inpNewRole").value : "collaborator";

      if (!name || !username || !password) { showErr("Preencha todos os campos obrigatórios."); return; }

      try {
        await apiFetch("/admin/users", { method: "POST", body: { name, username, password, role } });
        newUserModal.classList.add("hidden");
        toast("Usuário criado com sucesso.");
        renderAdmin();
      } catch (err) {
        showErr(err.message);
      }
    });
  }

  // Carregar dados iniciais
  try {
    await loadRooms();
    for (let i = 0; i < state.rooms.length; i++) {
      await loadActiveCase(state.rooms[i].id);
    }
    if (state.rooms.length > 0) currentRoomId = state.rooms[0].id;
  } catch (err) {
    console.error("Erro ao carregar dados:", err);
  }

  setSelectedTab("tabRooms");
  renderRooms();
  renderDashboardTv();

  tickClockOnly();
  setInterval(tickClockOnly, 1000);

  // Auto-refresh a cada 30s
  setInterval(async function () {
    try {
      for (let i = 0; i < state.rooms.length; i++) {
        await loadActiveCase(state.rooms[i].id);
      }
      const detail = safeEl("viewRoomDetail");
      if (detail && !detail.classList.contains("hidden")) renderRoomDetail(true);
      renderRooms();
    } catch (_e) {}
  }, 30000);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
