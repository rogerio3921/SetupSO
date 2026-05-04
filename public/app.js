// SetupSO — MVP Online — app.js
// Build: 2026-05-04
"use strict";

const APP_VERSION = "MVP Online";
const BUILD_STAMP  = "2026-05-04";
const CLICK_LOCK_MS = 1000;

// ─── Auth state (in-memory; survives page as sessionStorage) ─────────────────
const SESSION_KEY = "setupso_session";

function getSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); }
  catch { return null; }
}
function setSession(s) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
function clearSession() { sessionStorage.removeItem(SESSION_KEY); }

// ─── Slug helpers ─────────────────────────────────────────────────────────────
/** Canonical hospital slug: lowercase, digits, hyphens only */
function slugify(raw) {
  return String(raw || "").trim().toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$|^[a-z0-9]$/;

function validateSlug(slug) {
  if (!slug) return "Informe o identificador do hospital.";
  if (!SLUG_RE.test(slug)) {
    return "Use apenas letras minúsculas, números e hífens. Ex.: hospital-central";
  }
  return null;
}

// ─── API helpers ──────────────────────────────────────────────────────────────
function apiHeaders(tenantSlug) {
  const s = getSession();
  const h = { "Content-Type": "application/json" };
  if (s && s.token)       h["Authorization"]  = "Bearer " + s.token;
  if (tenantSlug || (s && s.tenantSlug)) h["X-Tenant"] = tenantSlug || s.tenantSlug;
  return h;
}

async function apiFetch(method, url, body, tenantSlug) {
  const opts = {
    method,
    headers: apiHeaders(tenantSlug),
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const data = await res.json().catch(function() { return {}; });
  return { ok: res.ok, status: res.status, data };
}

// ─── Utils ────────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16); }
function pad2(n) { return String(n).padStart(2, "0"); }
function toISODate(d) { return String(d.getFullYear()) + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
function formatDateBRFromISO(isoDate) {
  var m = String(isoDate || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? (m[3] + "/" + m[2] + "/" + m[1]) : "—";
}
function formatTimeBR_HHmmss(isoOrDate) {
  var d = (isoOrDate instanceof Date) ? isoOrDate : new Date(isoOrDate);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function formatTimeOrDash(v) { return v ? formatTimeBR_HHmmss(v) : "—"; }
function formatDurationNoSign(ms) {
  if (ms === null || ms === undefined || isNaN(ms)) return "—";
  var total = Math.floor(Math.max(0, ms) / 1000);
  var h = Math.floor(total / 3600);
  var m = Math.floor((total % 3600) / 60);
  var s = total % 60;
  return pad2(h) + ":" + pad2(m) + ":" + pad2(s);
}
function formatDurationSigned(ms) {
  if (ms === null || ms === undefined || isNaN(ms)) return "—";
  return (ms < 0 ? "-" : "+") + formatDurationNoSign(Math.abs(ms));
}
function shortText(s, max) {
  s = String(s || "").trim();
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}
function safeEl(id) { return document.getElementById(id); }
function setTextById(id, v) { var e = safeEl(id); if (e) e.textContent = v; }
function el(tag, cls, txt) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt !== undefined) e.textContent = txt;
  return e;
}
function chip(text, cls) {
  var s = el("span", "chip " + (cls || ""));
  s.textContent = text;
  return s;
}

// ─── Event types (same as MVP 2) ─────────────────────────────────────────────
var EVENT_TYPES = [
  { key: "anesthesia_team",  label: "Equipe anestesia",   mode: "in_out",    seq: 1  },
  { key: "surgical_team",    label: "Equipe cirúrgica",   mode: "in_out",    seq: 2  },
  { key: "transport_patient",label: "Transporte paciente",mode: "start_end", seq: 3  },
  { key: "admission_cc",     label: "Admissão no CC",     mode: "in_out",    seq: 4  },
  { key: "patient_in_or",    label: "Paciente em SO",     mode: "in_out",    seq: 5  },
  { key: "anesthesia",       label: "Anestesia",          mode: "start_end", seq: 6  },
  { key: "positioning",      label: "Posicionamento",     mode: "start_end", seq: 7  },
  { key: "time_out",         label: "Time out",           mode: "start_end", seq: 8  },
  { key: "surgery",          label: "Cirurgia",           mode: "start_end", seq: 9  },
  { key: "cme",              label: "CME",                mode: "in_out",    seq: 10 },
  { key: "cleaning",         label: "Limpeza",            mode: "in_out",    seq: 11 },
  { key: "pharmacy",         label: "Farmácia",           mode: "in_out",    seq: 12 },
  { key: "clinical_engineering", label: "Eng. clínica",  mode: "in_out",    seq: 13 },
  { key: "rpa",              label: "RPA",                mode: "in_out",    seq: 14 },
  { key: "room_setup",       label: "Montagem sala",      mode: "start_end", seq: 15 },
];

function isTeamCard(key) { return key === "anesthesia_team" || key === "surgical_team"; }
function actionLabel(a) { return a === "in" ? "Entrada" : a === "out" ? "Saída" : a === "start" ? "Início" : "Fim"; }

// ─── In-memory data (refreshed from API) ─────────────────────────────────────
var rooms = [];          // from GET /api/rooms
var caseByRoomId = {};   // roomId → case object
var eventsByCaseId = {}; // caseId → event[]

// ─── Click lock ───────────────────────────────────────────────────────────────
var clickLockUntilByKey = new Map();
function isLocked(key) { return Date.now() < (clickLockUntilByKey.get(key) || 0); }
function lock(key) { clickLockUntilByKey.set(key, Date.now() + CLICK_LOCK_MS); }

// ─── Current room ─────────────────────────────────────────────────────────────
var currentRoomId = null;

// ─── Toast ────────────────────────────────────────────────────────────────────
var _toastTimer = null;
function toast(msg) {
  var t = safeEl("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function() { t.classList.add("hidden"); }, 3000);
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function setSelectedTab(tabId) {
  ["tabRooms", "tabDashboard", "tabReports"].forEach(function(id) {
    var b = safeEl(id);
    if (b) b.setAttribute("aria-selected", id === tabId ? "true" : "false");
  });
  ["viewRooms", "viewDashboard", "viewReports", "viewRoomDetail"].forEach(function(id) {
    var v = safeEl(id);
    if (v) v.classList.add("hidden");
  });
  var map = {
    tabRooms: "viewRooms",
    tabDashboard: "viewDashboard",
    tabReports: "viewReports",
  };
  if (map[tabId]) {
    var s = safeEl(map[tabId]);
    if (s) s.classList.remove("hidden");
  }
}
function showRoomDetail() {
  ["viewRooms", "viewDashboard", "viewReports"].forEach(function(id) {
    var v = safeEl(id); if (v) v.classList.add("hidden");
  });
  var d = safeEl("viewRoomDetail");
  if (d) d.classList.remove("hidden");
}

// ─── Status helpers ───────────────────────────────────────────────────────────
function getEvents(caseId) { return eventsByCaseId[caseId] || []; }

function getEventTimes(caseId, key) {
  var evs = getEvents(caseId).filter(function(e) { return e.event_key === key; });
  var inEv  = evs.find(function(e) { return e.action === "in"    || e.action === "start"; });
  var outEv = evs.find(function(e) { return e.action === "out"   || e.action === "end";   });
  return {
    inTime:  inEv  ? new Date(inEv.happened_at)  : null,
    outTime: outEv ? new Date(outEv.happened_at) : null,
  };
}

function isOpen(caseId, key) {
  var t = getEventTimes(caseId, key);
  return t.inTime && !t.outTime;
}

function deriveRoomStatus(caseId) {
  var priority = [
    { key: "room_setup", label: "MONTAGEM" },
    { key: "cleaning",   label: "LIMPEZA" },
    { key: "cme",        label: "CME" },
    { key: "surgery",    label: "CIRURGIA" },
    { key: "anesthesia", label: "ANESTESIA" },
    { key: "patient_in_or", label: "PACIENTE EM SO" },
    { key: "admission_cc",  label: "ADMISSÃO" },
    { key: "transport_patient", label: "TRANSPORTE" },
    { key: "rpa",        label: "RPA" },
  ];
  for (var i = 0; i < priority.length; i++) {
    if (isOpen(caseId, priority[i].key)) return priority[i].label;
  }
  return "EM PREPARO";
}

// ─── Timing computations ─────────────────────────────────────────────────────
function computeOrTimeMs(caseId) {
  var t = getEventTimes(caseId, "patient_in_or");
  if (!t.inTime) return null;
  var end = t.outTime || new Date();
  return end - t.inTime;
}
function computeSurgeryTimeMs(caseId) {
  var t = getEventTimes(caseId, "surgery");
  if (!t.inTime) return null;
  return (t.outTime || new Date()) - t.inTime;
}
function computeAnesthesiaTimeMs(caseId) {
  var t = getEventTimes(caseId, "anesthesia");
  if (!t.inTime) return null;
  return (t.outTime || new Date()) - t.inTime;
}
function computeRpaTimeMs(caseId) {
  var t = getEventTimes(caseId, "rpa");
  if (!t.inTime) return null;
  return (t.outTime || new Date()) - t.inTime;
}
function computeTotalToRpaInMs(caseId) {
  var transp = getEventTimes(caseId, "transport_patient");
  var rpa    = getEventTimes(caseId, "rpa");
  if (!transp.inTime || !rpa.inTime) return null;
  return rpa.inTime - transp.inTime;
}
function computeTotalCcMs(caseId) {
  var transp = getEventTimes(caseId, "transport_patient");
  var rpa    = getEventTimes(caseId, "rpa");
  if (!transp.inTime) return null;
  var end = rpa.outTime || new Date();
  return end - transp.inTime;
}
function hasAnyAutoClosures(caseId) {
  return getEvents(caseId).some(function(e) { return e.auto; });
}
function countAutoClosures(caseId) {
  return getEvents(caseId).filter(function(e) { return e.auto; }).length;
}
function computeDelays(c) {
  var data  = c.data || {};
  var today = data.referenceDate || toISODate(new Date());
  function planned(hhmm) {
    if (!hhmm) return null;
    var dm = today.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    var tm = hhmm.match(/^(\d{2}):(\d{2})$/);
    if (!dm || !tm) return null;
    return new Date(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]), Number(tm[1]), Number(tm[2]));
  }
  var pat = getEventTimes(c.id, "patient_in_or").inTime;
  var surg = getEventTimes(c.id, "surgical_team").inTime;
  var anes = getEventTimes(c.id, "anesthesia_team").inTime;
  return {
    patientInOr: (pat && data.plannedSurgeryTime) ? (pat - planned(data.plannedSurgeryTime)) : null,
    surgicalTeam: (surg && data.plannedSurgeryTime) ? (surg - planned(data.plannedSurgeryTime)) : null,
    anesthesiaTeam: (anes && data.plannedAnesthesiaTime) ? (anes - planned(data.plannedAnesthesiaTime)) : null,
  };
}

// ─── API calls ────────────────────────────────────────────────────────────────
async function loadRooms() {
  var r = await apiFetch("GET", "/api/rooms");
  if (r.ok) rooms = r.data;
  else rooms = [];
}

async function loadActiveCase(roomId) {
  var r = await apiFetch("GET", "/api/rooms/" + roomId + "/active-case");
  if (r.ok) {
    caseByRoomId[roomId] = r.data;
    await loadEvents(r.data.id);
  }
}

async function loadEvents(caseId) {
  var r = await apiFetch("GET", "/api/cases/" + caseId + "/events");
  if (r.ok) eventsByCaseId[caseId] = r.data;
}

async function saveEventToApi(caseId, payload) {
  var r = await apiFetch("POST", "/api/cases/" + caseId + "/events", payload);
  if (r.ok) {
    var list = eventsByCaseId[caseId] || [];
    list.push(r.data);
    eventsByCaseId[caseId] = list;
  }
  return r;
}

async function undoLastManualFromApi(caseId) {
  var r = await apiFetch("DELETE", "/api/cases/" + caseId + "/events/last-manual");
  if (r.ok) await loadEvents(caseId);
  return r;
}

async function saveCaseDataToApi(caseId, data) {
  return await apiFetch("PATCH", "/api/cases/" + caseId, { data });
}

// ─── Render: Rooms ────────────────────────────────────────────────────────────
function renderRooms() {
  var grid = safeEl("roomsGrid");
  if (!grid) return;
  grid.innerHTML = "";

  if (!rooms.length) {
    grid.appendChild(el("p", "text-sm text-slate-500", "Nenhuma sala cadastrada para este hospital."));
    return;
  }

  rooms.forEach(function(room) {
    var c = caseByRoomId[room.id];
    var data = (c && c.data) ? c.data : {};
    var caseId = c ? c.id : null;

    var card = el("div", "card bg-white border border-slate-200 shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow");
    card.addEventListener("click", function() {
      currentRoomId = room.id;
      renderRoomDetail(true);
      showRoomDetail();
    });

    var top = el("div", "flex items-center justify-between gap-2");
    var status = caseId ? deriveRoomStatus(caseId) : "—";
    top.appendChild(el("div", "font-black text-lg", room.code));
    top.appendChild(chip(status, "bg-slate-100 border border-slate-200 text-slate-700"));
    card.appendChild(top);

    var info = el("div", "mt-2 text-sm text-slate-700");
    var p1 = el("div");
    p1.appendChild(el("span", "text-slate-500 font-bold", "Paciente: "));
    p1.appendChild(document.createTextNode(String(data.fullName || "").trim() || "—"));
    info.appendChild(p1);

    if (caseId) {
      var ms = computeOrTimeMs(caseId);
      var p2 = el("div", "mt-1");
      p2.appendChild(el("span", "text-slate-500 font-bold", "Tempo SO: "));
      p2.appendChild(el("span", "mono font-black", ms !== null ? formatDurationNoSign(ms) : "—"));
      info.appendChild(p2);
    }
    card.appendChild(info);
    grid.appendChild(card);
  });
}

// ─── Render: Room Detail ──────────────────────────────────────────────────────
var detailsModal = null;

function renderRoomDetail(fullRender) {
  var room = rooms.find(function(r) { return r.id === currentRoomId; });
  if (!room) return;
  var c    = caseByRoomId[room.id];
  if (!c) return;
  var data = c.data || {};

  if (fullRender) {
    setTextById("roomTitle", room.code);
    setTextById("roomStatus", deriveRoomStatus(c.id));
    setTextById("caseLine", "Case #" + c.id);

    var patParts = [];
    if (data.fullName) patParts.push(data.fullName);
    if (data.procedure) patParts.push(data.procedure);
    setTextById("patientLine", patParts.join(" · ") || "—");

    setTextById("noticeNumber",     data.noticeNumber     || "—");
    setTextById("attendanceNumber", data.attendanceNumber || "—");
    setTextById("plannedSurgery",   data.plannedSurgeryTime || "—");

    var delays = computeDelays(c);
    setTextById("delayPatientInOr",   delays.patientInOr   !== null ? formatDurationSigned(delays.patientInOr)   : "—");
    setTextById("delaySurgicalTeam",  delays.surgicalTeam  !== null ? formatDurationSigned(delays.surgicalTeam)  : "—");
    setTextById("delayAnesthesiaTeam",delays.anesthesiaTeam!== null ? formatDurationSigned(delays.anesthesiaTeam): "—");

    var has = String(data.allergies || "").trim().length > 0;
    var banner = safeEl("allergyBanner");
    if (banner) banner.classList.toggle("hidden", !has);
    if (has) setTextById("allergyText", String(data.allergies || "").trim());

    renderActions(c);
    renderDashboardTv();
    renderReports();
  }

  var msSO = computeOrTimeMs(c.id);
  setTextById("orTime", msSO !== null ? formatDurationNoSign(msSO) : "—");
  var total = computeTotalToRpaInMs(c.id);
  setTextById("timelineTotal", total !== null ? formatDurationNoSign(total) : "—");
}

// ─── Render: Actions ─────────────────────────────────────────────────────────
function renderActions(c) {
  var grid = safeEl("actionsGrid");
  if (!grid) return;
  grid.innerHTML = "";

  var evs = getEvents(c.id);

  EVENT_TYPES.forEach(function(et) {
    var relevant = evs.filter(function(e) { return e.event_key === et.key; });
    var hasIn  = relevant.some(function(e) { return e.action === "in"    || e.action === "start"; });
    var hasOut = relevant.some(function(e) { return e.action === "out"   || e.action === "end";   });
    var open   = hasIn && !hasOut;

    var card = el("div", "card border border-slate-200 bg-white shadow-sm p-3");

    var titleRow = el("div", "flex items-center justify-between gap-2");
    titleRow.appendChild(el("div", "text-sm font-black", et.label));
    if (open) titleRow.appendChild(chip("EM ANDAMENTO", "bg-green-100 text-green-800 border border-green-200"));
    card.appendChild(titleRow);

    var btns = el("div", "mt-2 flex gap-2");

    if (et.mode === "in_out") {
      if (!hasIn) {
        var b = el("button", "btn bg-blue-600 text-white px-3 py-1.5 text-sm", "Entrada");
        b.addEventListener("click", function() { handleAction(c, et.key, "in"); });
        btns.appendChild(b);
      } else if (!hasOut) {
        var b2 = el("button", "btn bg-slate-800 text-white px-3 py-1.5 text-sm", "Saída");
        b2.addEventListener("click", function() { handleAction(c, et.key, "out"); });
        btns.appendChild(b2);
      } else {
        btns.appendChild(el("span", "text-xs text-slate-400 font-bold", "Concluído"));
      }
    } else {
      if (!hasIn) {
        var b3 = el("button", "btn bg-blue-600 text-white px-3 py-1.5 text-sm", "Início");
        b3.addEventListener("click", function() { handleAction(c, et.key, "start"); });
        btns.appendChild(b3);
      } else if (!hasOut) {
        var b4 = el("button", "btn bg-slate-800 text-white px-3 py-1.5 text-sm", "Fim");
        b4.addEventListener("click", function() { handleAction(c, et.key, "end"); });
        btns.appendChild(b4);
      } else {
        btns.appendChild(el("span", "text-xs text-slate-400 font-bold", "Concluído"));
      }
    }
    card.appendChild(btns);

    // Durations
    if (hasIn) {
      var t = getEventTimes(c.id, et.key);
      var dur = el("div", "mt-1 text-xs text-slate-500 font-bold mono");
      if (t.inTime) dur.textContent += actionLabel("in") + " " + formatTimeBR_HHmmss(t.inTime);
      if (t.outTime) dur.textContent += " → " + formatTimeBR_HHmmss(t.outTime);
      card.appendChild(dur);
    }

    grid.appendChild(card);
  });

  // Recent events list
  var ul = safeEl("recentEvents");
  if (ul) {
    ul.innerHTML = "";
    var recent = (getEvents(c.id) || []).slice().reverse().slice(0, 20);
    recent.forEach(function(e) {
      var li = el("li", "flex items-center justify-between gap-2 border-b border-slate-100 pb-1");
      var lbl = EVENT_TYPES.find(function(t) { return t.key === e.event_key; });
      var left = el("span", "font-bold text-slate-800", (lbl ? lbl.label : e.event_key) + " — " + actionLabel(e.action));
      var right = el("span", "mono text-xs text-slate-500", formatTimeBR_HHmmss(new Date(e.happened_at)));
      if (e.auto) {
        right.textContent += " (auto)";
        right.classList.add("italic");
      }
      li.appendChild(left);
      li.appendChild(right);
      ul.appendChild(li);
    });
  }

  // Durations
  var durList = safeEl("durationsList");
  if (durList) {
    durList.innerHTML = "";
    EVENT_TYPES.forEach(function(et) {
      var t = getEventTimes(c.id, et.key);
      if (!t.inTime || !t.outTime) return;
      var ms = t.outTime - t.inTime;
      var li = el("li", "flex items-center justify-between gap-2");
      li.appendChild(el("span", "text-slate-600", et.label));
      li.appendChild(el("span", "mono font-black", formatDurationNoSign(ms)));
      durList.appendChild(li);
    });
  }
}

function handleAction(c, eventKey, action) {
  var lockKey = c.id + "_" + eventKey + "_" + action;
  if (isLocked(lockKey)) return;
  lock(lockKey);

  var payload = {
    event_key:   eventKey,
    action:      action,
    happened_at: new Date().toISOString(),
    auto:        false,
  };

  saveEventToApi(c.id, payload).then(function(r) {
    if (!r.ok) { toast("Erro ao salvar evento."); return; }
    renderRoomDetail(true);
    renderRooms();
    renderDashboardTv();
    toast(eventKey + " — " + actionLabel(action) + " registrado.");
  });
}

// ─── Render: Dashboard TV ─────────────────────────────────────────────────────
function renderDashboardTv() {
  var tbody = safeEl("dashTvTable");
  if (!tbody) return;
  tbody.innerHTML = "";

  rooms.forEach(function(room) {
    var c = caseByRoomId[room.id];
    if (!c) return;
    var data = c.data || {};

    var msSO  = computeOrTimeMs(c.id);
    var msCir = computeSurgeryTimeMs(c.id);
    var msR   = computeRpaTimeMs(c.id);
    var msToR = computeTotalToRpaInMs(c.id);
    var msCC  = computeTotalCcMs(c.id);

    var tSO  = getEventTimes(c.id, "patient_in_or");
    var tCir = getEventTimes(c.id, "surgery");
    var tRpa = getEventTimes(c.id, "rpa");
    var tTrans = getEventTimes(c.id, "transport_patient");

    var tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 cursor-pointer";

    function td(val, cls) {
      var t = el("td", "py-2 pr-3 " + (cls || ""));
      t.textContent = val;
      return t;
    }

    tr.appendChild(td(room.code, "font-black"));

    var st = el("td", "py-2 pr-3");
    st.appendChild(chip(deriveRoomStatus(c.id), "bg-slate-100 border border-slate-200 text-slate-700"));
    tr.appendChild(st);

    var tdPat = el("td", "py-2 pr-3");
    tdPat.appendChild(el("div", "truncate2", shortText(data.fullName, 26)));
    tdPat.appendChild(el("div", "small mono", data.noticeNumber || "—"));
    tr.appendChild(tdPat);

    var tdProc = el("td", "py-2 pr-3");
    tdProc.appendChild(el("div", "truncate3", shortText(data.procedure, 30)));
    tdProc.appendChild(el("div", "small truncate2", shortText(data.surgeon, 24)));
    tr.appendChild(tdProc);

    tr.appendChild(td(formatTimeOrDash(tSO.inTime), "mono"));
    tr.appendChild(td(formatTimeOrDash(tSO.outTime), "mono"));
    tr.appendChild(td(msSO !== null ? formatDurationNoSign(msSO) : "—", "mono font-black"));

    tr.appendChild(td(formatTimeOrDash(tCir.inTime), "mono"));
    tr.appendChild(td(formatTimeOrDash(tCir.outTime), "mono"));
    tr.appendChild(td(msCir !== null ? formatDurationNoSign(msCir) : "—", "mono font-black"));

    tr.appendChild(td(formatTimeOrDash(tRpa.inTime), "mono"));
    tr.appendChild(td(formatTimeOrDash(tRpa.outTime), "mono"));
    tr.appendChild(td(msR !== null ? formatDurationNoSign(msR) : "—", "mono font-black"));

    tr.appendChild(td(msToR !== null ? formatDurationNoSign(msToR) : "—", "mono font-black"));
    tr.appendChild(td(msCC  !== null ? formatDurationNoSign(msCC)  : "—", "mono font-black"));
    tr.appendChild(td(hasAnyAutoClosures(c.id) ? ("Sim (" + countAutoClosures(c.id) + ")") : "Não", ""));

    tr.addEventListener("click", function() {
      currentRoomId = room.id;
      renderRoomDetail(true);
      showRoomDetail();
    });

    tbody.appendChild(tr);
  });

  setTextById("dashUpdatedAt", "Atualizado: " + formatTimeBR_HHmmss(new Date()));
}

// ─── Render: Reports ─────────────────────────────────────────────────────────
function renderReports() {
  var tbody = safeEl("reportsTable");
  if (!tbody) return;
  tbody.innerHTML = "";

  rooms.forEach(function(room) {
    var c = caseByRoomId[room.id];
    if (!c) return;
    var data = c.data || {};

    var tSO    = getEventTimes(c.id, "patient_in_or");
    var tAnes  = getEventTimes(c.id, "anesthesia");
    var tCir   = getEventTimes(c.id, "surgery");
    var tTrans = getEventTimes(c.id, "transport_patient");
    var tRpa   = getEventTimes(c.id, "rpa");

    var msSO   = computeOrTimeMs(c.id);
    var msAnes = computeAnesthesiaTimeMs(c.id);
    var msCir  = computeSurgeryTimeMs(c.id);
    var msR    = computeRpaTimeMs(c.id);
    var msToR  = computeTotalToRpaInMs(c.id);
    var msCC   = computeTotalCcMs(c.id);

    var tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50";

    function td(v, cls) {
      var t = el("td", "py-2 pr-3 text-xs " + (cls || ""));
      t.textContent = v;
      return t;
    }

    tr.appendChild(td(room.code, "font-black"));
    tr.appendChild(td("#" + c.id, "mono"));
    tr.appendChild(td(data.noticeNumber     || "—", "mono"));
    tr.appendChild(td(data.fullName         || "—"));
    tr.appendChild(td(data.procedure        || "—"));
    tr.appendChild(td(data.surgeon          || "—"));

    tr.appendChild(td(formatTimeOrDash(tSO.inTime),  "mono"));
    tr.appendChild(td(formatTimeOrDash(tSO.outTime), "mono"));
    tr.appendChild(td(msSO !== null  ? formatDurationNoSign(msSO)  : "—", "mono font-black"));

    tr.appendChild(td(formatTimeOrDash(tAnes.inTime),  "mono"));
    tr.appendChild(td(formatTimeOrDash(tAnes.outTime), "mono"));
    tr.appendChild(td(msAnes !== null ? formatDurationNoSign(msAnes) : "—", "mono font-black"));

    tr.appendChild(td(formatTimeOrDash(tCir.inTime),  "mono"));
    tr.appendChild(td(formatTimeOrDash(tCir.outTime), "mono"));
    tr.appendChild(td(msCir !== null  ? formatDurationNoSign(msCir)  : "—", "mono font-black"));

    tr.appendChild(td(formatTimeOrDash(tTrans.inTime), "mono"));
    tr.appendChild(td(formatTimeOrDash(tRpa.inTime),   "mono"));
    tr.appendChild(td(formatTimeOrDash(tRpa.outTime),  "mono"));
    tr.appendChild(td(msR !== null    ? formatDurationNoSign(msR)    : "—", "mono font-black"));

    tr.appendChild(td(msToR !== null  ? formatDurationNoSign(msToR)  : "—", "mono font-black"));
    tr.appendChild(td(msCC  !== null  ? formatDurationNoSign(msCC)   : "—", "mono font-black"));

    tr.appendChild(td(hasAnyAutoClosures(c.id) ? "Sim" : "Não"));
    tr.appendChild(td(c.status || "—"));

    tbody.appendChild(tr);
  });
}

// ─── Details modal ────────────────────────────────────────────────────────────
var DETAIL_FIELDS = [
  { id: "fullName",           label: "Nome completo",         type: "text" },
  { id: "noticeNumber",       label: "Nº aviso",              type: "text" },
  { id: "attendanceNumber",   label: "Nº atendimento",        type: "text" },
  { id: "procedure",          label: "Procedimento",          type: "text" },
  { id: "surgeon",            label: "Cirurgião",             type: "text" },
  { id: "anesthesiologist",   label: "Anestesista",           type: "text" },
  { id: "referenceDate",      label: "Data do dia",           type: "date" },
  { id: "plannedSurgeryTime", label: "Previsto (cirurgia)",   type: "time" },
  { id: "plannedAnesthesiaTime", label: "Previsto (anestesia)",type:"time" },
  { id: "birthDate",          label: "Nascimento",            type: "date" },
  { id: "age",                label: "Idade",                 type: "number" },
  { id: "weightKg",           label: "Peso (kg)",             type: "number" },
  { id: "heightCm",           label: "Altura (cm)",           type: "number" },
  { id: "allergies",          label: "Alergias",              type: "text" },
];

function openDetailsModal() {
  var room = rooms.find(function(r) { return r.id === currentRoomId; });
  if (!room) return;
  var c    = caseByRoomId[room.id];
  if (!c) return;
  var data = c.data || {};
  var grid = safeEl("detailsGrid");
  if (!grid) return;
  grid.innerHTML = "";

  DETAIL_FIELDS.forEach(function(f) {
    var wrap = el("div");
    var lbl  = el("label", "block text-xs font-black text-slate-600 mb-1", f.label);
    lbl.setAttribute("for", "det_" + f.id);
    var inp  = el("input", "soft-input w-full");
    inp.id   = "det_" + f.id;
    inp.type = f.type;
    inp.value = data[f.id] !== undefined ? String(data[f.id]) : "";
    wrap.appendChild(lbl);
    wrap.appendChild(inp);
    grid.appendChild(wrap);
  });

  if (detailsModal) detailsModal.classList.remove("hidden");
}

function saveDetailsFromModal() {
  var room = rooms.find(function(r) { return r.id === currentRoomId; });
  if (!room) return;
  var c    = caseByRoomId[room.id];
  if (!c) return;
  var data = Object.assign({}, c.data || {});

  DETAIL_FIELDS.forEach(function(f) {
    var inp = safeEl("det_" + f.id);
    if (!inp) return;
    var v = inp.value;
    if (f.type === "number") v = v === "" ? "" : Number(v);
    data[f.id] = v;
  });

  c.data = data;
  saveCaseDataToApi(c.id, data).then(function(r) {
    if (!r.ok) toast("Erro ao salvar detalhes no servidor.");
  });
}

// ─── Undo ─────────────────────────────────────────────────────────────────────
async function undoLastManualEventForActiveCase() {
  var room = rooms.find(function(r) { return r.id === currentRoomId; });
  if (!room) return;
  var c = caseByRoomId[room.id];
  if (!c) return;

  var r = await undoLastManualFromApi(c.id);
  if (!r.ok) { toast("Nada para desfazer ou erro."); return; }

  await loadActiveCase(room.id);
  renderRoomDetail(true);
  renderRooms();
  renderDashboardTv();
  renderReports();
  toast("Último evento manual desfeito.");
}

// ─── Clock ────────────────────────────────────────────────────────────────────
function tickClockOnly() {
  var d = new Date();
  setTextById("todayTop",     formatDateBRFromISO(toISODate(d)));
  setTextById("clockTop",     formatTimeBR_HHmmss(d));
  setTextById("todayDateTop", formatDateBRFromISO(toISODate(d)));
  setTextById("clock",        formatTimeBR_HHmmss(d));

  var detail = safeEl("viewRoomDetail");
  if (detail && !detail.classList.contains("hidden")) renderRoomDetail(false);

  var dash = safeEl("viewDashboard");
  if (dash && !dash.classList.contains("hidden")) renderDashboardTv();
}

// ─── Login screen logic ───────────────────────────────────────────────────────
function showError(fieldId, errId, msg) {
  var inp = safeEl(fieldId);
  var err = safeEl(errId);
  if (inp) inp.classList.add("error");
  if (err) { err.textContent = msg; err.classList.remove("hidden"); }
}
function clearError(fieldId, errId) {
  var inp = safeEl(fieldId);
  var err = safeEl(errId);
  if (inp) inp.classList.remove("error");
  if (err) { err.textContent = ""; err.classList.add("hidden"); }
}
function clearAllErrors() {
  [
    ["inpHospital",    "errHospital"],
    ["inpIdentifier",  "errIdentifier"],
    ["inpPassword",    "errPassword"],
  ].forEach(function(p) { clearError(p[0], p[1]); });
  var g = safeEl("errGlobal");
  if (g) { g.textContent = ""; g.classList.add("hidden"); }
}

function showGlobalError(msg) {
  var g = safeEl("errGlobal");
  if (g) { g.textContent = msg; g.classList.remove("hidden"); }
}

function wireLogin() {
  var inpHospital   = safeEl("inpHospital");
  var inpIdentifier = safeEl("inpIdentifier");
  var inpPassword   = safeEl("inpPassword");
  var form          = safeEl("loginForm");
  var slugPreview   = safeEl("slugPreview");
  var btnLogin      = safeEl("btnLogin");

  if (!form) return;

  // Live slug preview
  if (inpHospital && slugPreview) {
    inpHospital.addEventListener("input", function() {
      var s = slugify(inpHospital.value);
      if (s && s !== inpHospital.value.trim().toLowerCase()) {
        slugPreview.textContent = "Slug canônico: " + s;
      } else if (s) {
        slugPreview.textContent = "Slug: " + s;
      } else {
        slugPreview.textContent = "";
      }
      clearError("inpHospital", "errHospital");
    });
  }

  if (inpIdentifier) {
    inpIdentifier.addEventListener("input", function() { clearError("inpIdentifier", "errIdentifier"); });
  }
  if (inpPassword) {
    inpPassword.addEventListener("input", function() { clearError("inpPassword", "errPassword"); });
  }

  form.addEventListener("submit", async function(e) {
    e.preventDefault();
    clearAllErrors();

    var rawHospital   = String(inpHospital   ? inpHospital.value   : "").trim();
    var rawIdentifier = String(inpIdentifier ? inpIdentifier.value : "").trim();
    var rawPassword   = String(inpPassword   ? inpPassword.value   : "");

    // Client-side validation
    var slug = slugify(rawHospital);
    var slugErr = validateSlug(slug);
    var hasErr = false;

    if (slugErr) {
      showError("inpHospital", "errHospital", slugErr);
      hasErr = true;
    }
    if (!rawIdentifier) {
      showError("inpIdentifier", "errIdentifier", "Informe o usuário ou código.");
      hasErr = true;
    }
    if (!rawPassword) {
      showError("inpPassword", "errPassword", "Informe a senha.");
      hasErr = true;
    }
    if (hasErr) return;

    if (btnLogin) { btnLogin.textContent = "Entrando…"; btnLogin.disabled = true; }

    try {
      var r = await apiFetch("POST", "/auth/login", {
        hospital:   slug,
        identifier: rawIdentifier,
        password:   rawPassword,
      });

      if (r.ok) {
        setSession({
          token:      r.data.token,
          user:       r.data.user,
          tenantSlug: r.data.tenant.slug,
          tenantName: r.data.tenant.name,
        });
        await showApp();
      } else {
        var err  = r.data.error || "Erro ao fazer login.";
        var field = r.data.field;
        if (field === "hospital")   showError("inpHospital",   "errHospital",   err);
        else if (field === "identifier") showError("inpIdentifier", "errIdentifier", err);
        else if (field === "password")   showError("inpPassword",   "errPassword",   err);
        else showGlobalError(err);
      }
    } catch (ex) {
      showGlobalError("Não foi possível conectar ao servidor. Verifique sua conexão.");
    } finally {
      if (btnLogin) { btnLogin.textContent = "Entrar"; btnLogin.disabled = false; }
    }
  });
}

// ─── App initialisation (after login) ────────────────────────────────────────
async function showApp() {
  var s = getSession();
  if (!s) { showLoginScreen(); return; }

  // Update header
  setTextById("headerTenant", s.tenantName || s.tenantSlug);
  setTextById("headerUser",   (s.user && s.user.username) || "");

  // Show app, hide login
  var login = safeEl("screenLogin");
  var appScreen = safeEl("screenApp");
  if (login) login.classList.add("hidden");
  if (appScreen) appScreen.classList.remove("hidden");

  // Load data
  await loadRooms();
  if (rooms.length > 0) {
    currentRoomId = rooms[0].id;
    await Promise.all(rooms.map(function(room) { return loadActiveCase(room.id); }));
  }

  setSelectedTab("tabRooms");
  renderRooms();
  renderDashboardTv();
  renderReports();

  setTextById("buildStamp", APP_VERSION + " · " + BUILD_STAMP);

  tickClockOnly();
  setInterval(tickClockOnly, 1000);
}

function showLoginScreen() {
  var login = safeEl("screenLogin");
  var appScreen = safeEl("screenApp");
  if (login) login.classList.remove("hidden");
  if (appScreen) appScreen.classList.add("hidden");
}

// ─── Wire app navigation ──────────────────────────────────────────────────────
function wireApp() {
  detailsModal = safeEl("detailsModal");

  var tabRooms = safeEl("tabRooms");
  var tabDash  = safeEl("tabDashboard");
  var tabRep   = safeEl("tabReports");
  if (tabRooms) tabRooms.addEventListener("click", function() { setSelectedTab("tabRooms"); });
  if (tabDash)  tabDash.addEventListener("click",  function() { setSelectedTab("tabDashboard"); });
  if (tabRep)   tabRep.addEventListener("click",   function() { setSelectedTab("tabReports"); });

  var btnBack = safeEl("btnBackToRooms");
  if (btnBack) btnBack.addEventListener("click", function() {
    setSelectedTab("tabRooms");
    renderRooms();
  });

  var btnOpen  = safeEl("btnDetailsOpen");
  var btnClose = safeEl("btnCloseDetails");
  var btnSave  = safeEl("btnSaveDetails");
  if (btnOpen) btnOpen.addEventListener("click", openDetailsModal);
  if (btnClose) btnClose.addEventListener("click", function() {
    if (detailsModal) detailsModal.classList.add("hidden");
  });
  if (btnSave) btnSave.addEventListener("click", function() {
    saveDetailsFromModal();
    if (detailsModal) detailsModal.classList.add("hidden");
    toast("Detalhes salvos.");
    renderRoomDetail(true);
    renderRooms();
    renderDashboardTv();
    renderReports();
  });

  if (detailsModal) {
    detailsModal.addEventListener("click", function(e) {
      if (e.target === detailsModal) detailsModal.classList.add("hidden");
    });
  }

  var btnUndo  = safeEl("btnUndoManual");
  var btnVoice = safeEl("btnVoice");
  if (btnUndo)  btnUndo.addEventListener("click",  undoLastManualEventForActiveCase);
  if (btnVoice) btnVoice.addEventListener("click", function() { toast("Modo voz (futuro)"); });

  var btnLogout = safeEl("btnLogout");
  if (btnLogout) btnLogout.addEventListener("click", function() {
    clearSession();
    showLoginScreen();
  });
}

// ─── Entry point ─────────────────────────────────────────────────────────────
function init() {
  wireLogin();
  wireApp();

  var s = getSession();
  if (s && s.token) {
    showApp();
  } else {
    showLoginScreen();
  }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
