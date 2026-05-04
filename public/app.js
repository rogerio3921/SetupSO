// SetupSO — MVP 3 — app.js
// Online backend + JWT auth + PostgreSQL persistence
// Build: 2026-05-04
'use strict';

const APP_VERSION = "MVP3";
const BUILD_STAMP = "2026-05-04";

/* ============================================================
   API CLIENT
   ============================================================ */

// API base URL: empty string = same origin (works when Express serves the
// frontend). Override via window.API_BASE_URL for standalone dev servers.
var API_BASE = (typeof window !== 'undefined' && window.API_BASE_URL) ? window.API_BASE_URL : '';

var AUTH_STORAGE_KEY = 'setupso_auth_v3';

var AUTH = {
  token: null,
  user: null,
  tenant: null
};

function loadAuth() {
  try {
    var raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      var data = JSON.parse(raw);
      AUTH.token = data.token || null;
      AUTH.user = data.user || null;
      AUTH.tenant = data.tenant || null;
    }
  } catch (e) {
    // ignore
  }
}

function persistAuth() {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
    token: AUTH.token,
    user: AUTH.user,
    tenant: AUTH.tenant
  }));
}

function clearAuth() {
  AUTH.token = null;
  AUTH.user = null;
  AUTH.tenant = null;
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

function apiHeaders() {
  var h = { 'Content-Type': 'application/json' };
  if (AUTH.token) { h['Authorization'] = 'Bearer ' + AUTH.token; }
  return h;
}

function apiFetch(method, path, body) {
  var opts = { method: method, headers: apiHeaders() };
  if (body !== undefined) { opts.body = JSON.stringify(body); }
  return fetch(API_BASE + path, opts).then(function (res) {
    if (res.status === 204) { return null; }
    return res.json().then(function (data) {
      if (!res.ok) {
        var msg = (data && data.error) ? data.error : 'Erro ' + res.status;
        var err = new Error(msg);
        err.status = res.status;
        throw err;
      }
      return data;
    });
  });
}

var apiClient = {
  login: function (username, password, tenant) {
    return apiFetch('POST', '/auth/login', { username: username, password: password, tenant: tenant });
  },
  me: function () {
    return apiFetch('GET', '/auth/me');
  },
  getRooms: function () {
    return apiFetch('GET', '/rooms');
  },
  getActiveCase: function (roomId) {
    return apiFetch('GET', '/rooms/' + roomId + '/active-case');
  },
  getEvents: function (caseId) {
    return apiFetch('GET', '/cases/' + caseId + '/events');
  },
  postEvent: function (caseId, eventKey, action, happenedAt, auto) {
    return apiFetch('POST', '/cases/' + caseId + '/events', {
      eventKey: eventKey,
      action: action,
      happenedAt: happenedAt,
      auto: !!auto
    });
  },
  patchCase: function (caseId, updates) {
    return apiFetch('PATCH', '/cases/' + caseId, updates);
  },
  getAdminUsers: function () {
    return apiFetch('GET', '/admin/users');
  },
  postAdminUser: function (data) {
    return apiFetch('POST', '/admin/users', data);
  },
  patchAdminUser: function (id, data) {
    return apiFetch('PATCH', '/admin/users/' + id, data);
  }
};

/* ============================================================
   OFFLINE CACHE (localStorage for fast reloads)
   ============================================================ */

var STORAGE_KEY = 'setupso_mvp3_cache';
var CLICK_LOCK_MS = 1000;

function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch (e) { return {}; }
}
function saveState(st) { localStorage.setItem(STORAGE_KEY, JSON.stringify(st)); }
function resetState() { localStorage.removeItem(STORAGE_KEY); }

/* ============================================================
   UTILS
   ============================================================ */

function uid() { return Math.random().toString(16).slice(2) + '-' + Date.now().toString(16); }
function nowISO() { return new Date().toISOString(); }
function pad2(n) { return String(n).padStart(2, '0'); }
function toISODate(d) { return String(d.getFullYear()) + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function formatDateBRFromISO(isoDate) {
  var m = String(isoDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? (m[3] + '/' + m[2] + '/' + m[1]) : '—';
}
function formatTimeBR_HHmmss(isoOrDate) {
  var d = (isoOrDate instanceof Date) ? isoOrDate : new Date(isoOrDate);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function formatTimeOrDash(dateObj) { return dateObj ? formatTimeBR_HHmmss(dateObj) : '—'; }
function formatDurationNoSign(ms) {
  if (ms === null || ms === undefined || isNaN(ms)) return '—';
  var totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  var h = Math.floor(totalSeconds / 3600);
  var m = Math.floor((totalSeconds % 3600) / 60);
  var s = totalSeconds % 60;
  return pad2(h) + ':' + pad2(m) + ':' + pad2(s);
}
function formatDurationSigned(ms) {
  if (ms === null || ms === undefined || isNaN(ms)) return '—';
  var sign = ms < 0 ? '-' : '+';
  return sign + formatDurationNoSign(Math.abs(ms));
}
function todayAtHHMMUsingISODate(isoDate, hhmm) {
  if (!isoDate || !hhmm) return null;
  var dm = String(isoDate).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  var tm = String(hhmm).trim().match(/^(\d{2}):(\d{2})$/);
  if (!dm || !tm) return null;
  var yyyy = Number(dm[1]), mo = Number(dm[2]) - 1, dd = Number(dm[3]);
  var hh = Number(tm[1]), mm = Number(tm[2]);
  if (hh > 23 || mm > 59) return null;
  return new Date(yyyy, mo, dd, hh, mm, 0, 0);
}
function shortText(s, max) {
  var t = String(s || '').trim();
  if (!t) return '—';
  if (t.length <= max) return t;
  return t.slice(0, Math.max(0, max - 1)) + '…';
}
function safeEl(id) { return document.getElementById(id); }
function setTextById(id, v) {
  var e = safeEl(id);
  if (!e) return;
  e.textContent = (v === null || v === undefined || v === '') ? '—' : String(v);
}

/* ============================================================
   DOM HELPERS
   ============================================================ */

function el(tag, className, txt) {
  var n = document.createElement(tag);
  if (className) n.className = className;
  if (txt !== undefined) n.textContent = txt;
  return n;
}
function chip(textValue, className) {
  var cls = ('chip ' + (className || '')).trim();
  return el('span', cls, textValue);
}

/* ============================================================
   EVENTS MODEL
   ============================================================ */

var EVENT_TYPES = [
  { key: 'anesthesia_team', label: 'Equipe anestesia', mode: 'in_out', seq: 1 },
  { key: 'surgical_team', label: 'Equipe cirúrgica', mode: 'in_out', seq: 2 },
  { key: 'transport_patient', label: 'Transporte paciente', mode: 'start_end', seq: 3 },
  { key: 'admission_cc', label: 'Admissão no CC', mode: 'in_out', seq: 4 },
  { key: 'patient_in_or', label: 'Paciente em SO', mode: 'in_out', seq: 5 },
  { key: 'anesthesia', label: 'Anestesia', mode: 'start_end', seq: 6 },
  { key: 'positioning', label: 'Posicionamento', mode: 'start_end', seq: 7 },
  { key: 'time_out', label: 'Time out', mode: 'start_end', seq: 8 },
  { key: 'surgery', label: 'Cirurgia', mode: 'start_end', seq: 9 },
  { key: 'cme', label: 'CME', mode: 'in_out', seq: 10 },
  { key: 'cleaning', label: 'Limpeza', mode: 'in_out', seq: 11 },
  { key: 'pharmacy', label: 'Farmácia', mode: 'in_out', seq: 12 },
  { key: 'clinical_engineering', label: 'Eng. clínica', mode: 'in_out', seq: 13 },
  { key: 'rpa', label: 'RPA', mode: 'in_out', seq: 14 },
  { key: 'room_setup', label: 'Montagem sala', mode: 'start_end', seq: 15 }
];

function isTeamCard(eventKey) { return eventKey === 'anesthesia_team' || eventKey === 'surgical_team'; }
function actionLabel(action) {
  if (action === 'start') return 'INÍCIO';
  if (action === 'end') return 'FIM';
  if (action === 'in') return 'ENTRADA';
  if (action === 'out') return 'SAÍDA';
  return String(action).toUpperCase();
}

/* ============================================================
   IN-MEMORY STATE
   ============================================================ */

var state = loadState();
state.rooms = state.rooms || [];
state.cases = state.cases || [];
state.eventsByCaseId = state.eventsByCaseId || {};

function save() { saveState(state); }

/* ============================================================
   CASES
   ============================================================ */

function getCaseById(caseId) {
  return state.cases.find(function (c) { return c.id === caseId; }) || null;
}

function getActiveCase(roomId) {
  var active = state.cases
    .filter(function (c) { return c.roomId === roomId && c.status === 'active'; })
    .sort(function (a, b) { return (a.createdAt || '') < (b.createdAt || '') ? 1 : -1; })[0];
  return active || null;
}

function upsertCase(caseObj) {
  var idx = state.cases.findIndex(function (c) { return c.id === caseObj.id; });
  if (idx >= 0) {
    state.cases[idx] = caseObj;
  } else {
    state.cases.push(caseObj);
  }
}

/* ============================================================
   EVENTS (local)
   ============================================================ */

function getEvents(caseId) {
  return (state.eventsByCaseId[caseId] || []).slice()
    .sort(function (a, b) { return new Date(a.happenedAt) - new Date(b.happenedAt); });
}

function addEventLocal(caseId, payload) {
  var happenedAt = payload.happenedAt || nowISO();
  var evt = {
    id: payload.id || uid(),
    eventKey: payload.eventKey,
    action: payload.action,
    happenedAt: happenedAt,
    createdAt: nowISO(),
    auto: !!payload.auto
  };
  state.eventsByCaseId[caseId] = state.eventsByCaseId[caseId] || [];
  state.eventsByCaseId[caseId].push(evt);
  save();
  return evt;
}

// addEvent: optimistic local + async API sync
function addEvent(caseId, payload) {
  var happenedAt = nowISO();
  var eventKey = payload.eventKey;
  var action = payload.action;
  var auto = !!payload.auto;

  // Optimistic local update
  addEventLocal(caseId, { eventKey: eventKey, action: action, happenedAt: happenedAt, auto: auto });

  // Async server sync
  if (AUTH.token) {
    apiClient.postEvent(caseId, eventKey, action, happenedAt, auto)
      .catch(function (err) {
        console.warn('Event sync failed:', err);
        toast('⚠ Evento salvo localmente (sync com servidor falhou).');
      });
  }
}

function findFirstEventTime(caseId, eventKey, action) {
  var ev = (state.eventsByCaseId[caseId] || [])
    .filter(function (e) { return e.eventKey === eventKey && e.action === action; })
    .sort(function (a, b) { return new Date(a.happenedAt) - new Date(b.happenedAt); })[0];
  return ev ? new Date(ev.happenedAt) : null;
}

function isOpen(caseId, eventKey) {
  var t = EVENT_TYPES.find(function (x) { return x.key === eventKey; });
  var ev = (state.eventsByCaseId[caseId] || []).filter(function (e) { return e.eventKey === eventKey; });
  var actions = ev.map(function (e) { return e.action; });
  if (!t) return false;
  if (t.mode === 'start_end') return actions.includes('start') && !actions.includes('end');
  if (t.mode === 'in_out') return actions.includes('in') && !actions.includes('out');
  return false;
}

function getOpenEventKeys(caseId) {
  return EVENT_TYPES.map(function (t) { return t.key; }).filter(function (k) { return isOpen(caseId, k); });
}

function hasAnyAutoClosures(caseId) {
  return (state.eventsByCaseId[caseId] || []).some(function (e) { return e.auto; });
}

function countAutoClosures(caseId) {
  return (state.eventsByCaseId[caseId] || []).filter(function (e) { return e.auto; }).length;
}

function autoClose(caseId, eventKey) {
  var t = EVENT_TYPES.find(function (x) { return x.key === eventKey; });
  if (!t) return;
  if (!isOpen(caseId, eventKey)) return;
  var action = (t.mode === 'start_end') ? 'end' : 'out';
  addEvent(caseId, { eventKey: eventKey, action: action, auto: true });
}

/* ============================================================
   AUTO-CLOSE RULES
   ============================================================ */

function applyAutoClosures(caseId, ctx) {
  var eventKey = ctx.eventKey;
  var action = ctx.action;

  if (eventKey === 'admission_cc' && action === 'in') { autoClose(caseId, 'transport_patient'); }
  if (eventKey === 'patient_in_or' && action === 'in') {
    autoClose(caseId, 'transport_patient');
    autoClose(caseId, 'admission_cc');
  }
  if (eventKey === 'time_out' && action === 'start') { autoClose(caseId, 'positioning'); }
  if (eventKey === 'surgery' && action === 'start') { autoClose(caseId, 'time_out'); }
  if (eventKey === 'cleaning' && action === 'in') {
    autoClose(caseId, 'surgery');
    autoClose(caseId, 'anesthesia');
    autoClose(caseId, 'patient_in_or');
  }
  if (eventKey === 'rpa' && action === 'in') {
    for (var i = 0; i < EVENT_TYPES.length; i++) {
      if (EVENT_TYPES[i].key !== 'rpa') autoClose(caseId, EVENT_TYPES[i].key);
    }
  }
  if (eventKey === 'room_setup' && action === 'start') {
    for (var j = 0; j < EVENT_TYPES.length; j++) {
      if (EVENT_TYPES[j].key !== 'room_setup') autoClose(caseId, EVENT_TYPES[j].key);
    }
  }
}

/* ============================================================
   EVENT UI STATE
   ============================================================ */

function nextActionForEvent(eventType, eventsForKey) {
  var actions = eventsForKey.map(function (e) { return e.action; });
  if (eventType.mode === 'start_end') {
    if (!actions.includes('start')) return 'start';
    if (actions.includes('start') && !actions.includes('end')) return 'end';
    return 'start';
  }
  if (!actions.includes('in')) return 'in';
  if (actions.includes('in') && !actions.includes('out')) return 'out';
  return 'in';
}

function computeEventUIState(eventType, eventsForKey) {
  var actions = eventsForKey.map(function (e) { return e.action; });
  var next = nextActionForEvent(eventType, eventsForKey);
  var validation = { ok: true };
  if (next === 'end' && !actions.includes('start')) validation = { ok: false, reason: 'Não é possível finalizar sem iniciar.' };
  if (next === 'out' && !actions.includes('in')) validation = { ok: false, reason: 'Não é possível registrar saída sem entrada.' };

  var st = 'idle';
  if (eventType.mode === 'start_end') {
    if (actions.includes('start') && !actions.includes('end')) st = 'in_progress';
    else if (actions.includes('start') && actions.includes('end')) st = 'done';
  } else {
    if (actions.includes('in') && !actions.includes('out')) st = 'in_progress';
    else if (actions.includes('in') && actions.includes('out')) st = 'done';
  }
  return { state: st, nextAction: next, nextActionLabel: actionLabel(next), validation: validation };
}

/* ============================================================
   STATUS & PHASES
   ============================================================ */

function deriveRoomStatus(caseId) {
  var priority = [
    { key: 'room_setup', label: 'MONTAGEM' },
    { key: 'cleaning', label: 'LIMPEZA' },
    { key: 'cme', label: 'CME' },
    { key: 'surgery', label: 'CIRURGIA' },
    { key: 'anesthesia', label: 'ANESTESIA' },
    { key: 'patient_in_or', label: 'PACIENTE EM SO' },
    { key: 'admission_cc', label: 'ADMISSÃO' },
    { key: 'transport_patient', label: 'TRANSPORTE' },
    { key: 'rpa', label: 'RPA' }
  ];
  for (var i = 0; i < priority.length; i++) {
    if (isOpen(caseId, priority[i].key)) return priority[i].label;
  }
  return 'EM PREPARO';
}

function updateCasePhasesFromEvents(caseObj) {
  var caseId = caseObj.id;
  var patientOut = findFirstEventTime(caseId, 'patient_in_or', 'out');
  var roomEnd = findFirstEventTime(caseId, 'room_setup', 'end');
  caseObj.patientPhase = patientOut ? 'closed' : 'open';
  caseObj.roomPhase = roomEnd ? 'closed' : 'open';

  if (roomEnd && caseObj.status !== 'closed') {
    caseObj.status = 'closed';

    // Sync status to API
    if (AUTH.token) {
      apiClient.patchCase(caseId, { status: 'closed', patientPhase: 'closed', roomPhase: 'closed' })
        .catch(function (err) { console.warn('Case status sync failed:', err); });
    }

    // Refresh rooms from API to get new active case
    if (AUTH.token) {
      refreshRoomFromApi(caseObj.roomId);
    }
  }
  save();
}

/* ============================================================
   API DATA LOADER
   ============================================================ */

function refreshRoomFromApi(roomId) {
  return apiClient.getActiveCase(roomId)
    .then(function (activeCase) {
      upsertCase(activeCase);
      state.eventsByCaseId[activeCase.id] = state.eventsByCaseId[activeCase.id] || [];
      return apiClient.getEvents(activeCase.id);
    })
    .then(function (events) {
      // Find the case we just upserted
      var c = state.cases.find(function (x) { return x.roomId === roomId && x.status === 'active'; });
      if (c) {
        state.eventsByCaseId[c.id] = events;
      }
      save();
    })
    .catch(function (err) {
      console.warn('refreshRoomFromApi failed:', err);
    });
}

function initFromApi() {
  return apiClient.getRooms()
    .then(function (rooms) {
      state.rooms = rooms.map(function (r) { return { id: r.id, code: r.code }; });
      save();

      var promises = rooms.map(function (room) {
        return apiClient.getActiveCase(room.id)
          .then(function (activeCase) {
            upsertCase(activeCase);
            state.eventsByCaseId[activeCase.id] = state.eventsByCaseId[activeCase.id] || [];
            return apiClient.getEvents(activeCase.id).then(function (events) {
              state.eventsByCaseId[activeCase.id] = events;
            });
          })
          .catch(function (err) {
            console.warn('Failed to load room ' + room.id, err);
          });
      });

      return Promise.all(promises);
    })
    .then(function () {
      save();
      return true;
    });
}

/* ============================================================
   METRICS
   ============================================================ */

function computeSpanMs(startDate, endDate) {
  if (!startDate) return null;
  var end = endDate || new Date();
  return end.getTime() - startDate.getTime();
}
function computeStageDurationMs(caseId, eventKey) {
  var t = EVENT_TYPES.find(function (x) { return x.key === eventKey; });
  if (!t) return null;
  if (t.mode === 'start_end') {
    return computeSpanMs(findFirstEventTime(caseId, eventKey, 'start'), findFirstEventTime(caseId, eventKey, 'end'));
  }
  return computeSpanMs(findFirstEventTime(caseId, eventKey, 'in'), findFirstEventTime(caseId, eventKey, 'out'));
}
function computeOrTimeMs(caseId) { return computeStageDurationMs(caseId, 'patient_in_or'); }
function computeSurgeryTimeMs(caseId) { return computeStageDurationMs(caseId, 'surgery'); }
function computeAnesthesiaTimeMs(caseId) { return computeStageDurationMs(caseId, 'anesthesia'); }
function computeRpaTimeMs(caseId) { return computeStageDurationMs(caseId, 'rpa'); }
function computeTotalToRpaInMs(caseId) {
  return computeSpanMs(findFirstEventTime(caseId, 'transport_patient', 'start'), findFirstEventTime(caseId, 'rpa', 'in'));
}
function computeTotalCcMs(caseId) {
  return computeSpanMs(findFirstEventTime(caseId, 'transport_patient', 'start'), findFirstEventTime(caseId, 'rpa', 'out'));
}
function computeDelays(caseObj) {
  var c = caseObj.data || {};
  var planned = String(c.plannedSurgeryTimeHHMM || '').trim();
  var refISO = String(c.referenceDateISO || '').trim();
  var plannedDate = (refISO && planned) ? todayAtHHMMUsingISODate(refISO, planned) : null;
  if (!plannedDate) return { patient: null, surgTeam: null, anesTeam: null };
  var patientIn = findFirstEventTime(caseObj.id, 'patient_in_or', 'in');
  var surgTeamIn = findFirstEventTime(caseObj.id, 'surgical_team', 'in');
  var anesTeamIn = findFirstEventTime(caseObj.id, 'anesthesia_team', 'in');
  return {
    patient: patientIn ? (patientIn.getTime() - plannedDate.getTime()) : null,
    surgTeam: surgTeamIn ? (surgTeamIn.getTime() - plannedDate.getTime()) : null,
    anesTeam: anesTeamIn ? (anesTeamIn.getTime() - plannedDate.getTime()) : null
  };
}
function avgMs(values) {
  var v = values.filter(function (x) { return x !== null && x !== undefined && !isNaN(x); });
  if (v.length === 0) return null;
  return v.reduce(function (a, b) { return a + b; }, 0) / v.length;
}
function pct(num, den) { return den ? (String(Math.round((num / den) * 100)) + '%') : '0%'; }

/* ============================================================
   TOAST
   ============================================================ */

function toast(msg) {
  var t = safeEl('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.remove('hidden');
  setTimeout(function () { t.classList.add('hidden'); }, 2600);
}

/* ============================================================
   CLICK LOCK
   ============================================================ */

var clickLockUntilByKey = new Map();
function isLocked(key) { return Date.now() < (clickLockUntilByKey.get(key) || 0); }
function lock(key) { clickLockUntilByKey.set(key, Date.now() + CLICK_LOCK_MS); }

/* ============================================================
   NAVIGATION
   ============================================================ */

var currentRoomId = null;

function setSelectedTab(tabId) {
  var tabs = [
    { id: 'tabRooms', view: 'viewRooms' },
    { id: 'tabDashboard', view: 'viewDashboard' },
    { id: 'tabReports', view: 'viewReports' }
  ];
  for (var i = 0; i < tabs.length; i++) {
    var t = tabs[i];
    var btn = safeEl(t.id);
    var view = safeEl(t.view);
    var active = (t.id === tabId);
    if (btn) btn.setAttribute('aria-selected', active ? 'true' : 'false');
    if (view) view.classList.toggle('hidden', !active);
  }
  var detail = safeEl('viewRoomDetail');
  if (detail) detail.classList.add('hidden');
}

function showRoomDetail() {
  var ids = ['viewRooms', 'viewDashboard', 'viewReports'];
  for (var i = 0; i < ids.length; i++) {
    var v = safeEl(ids[i]);
    if (v) v.classList.add('hidden');
  }
  var d = safeEl('viewRoomDetail');
  if (d) d.classList.remove('hidden');
  var tabs = ['tabRooms', 'tabDashboard', 'tabReports'];
  for (var j = 0; j < tabs.length; j++) {
    var b = safeEl(tabs[j]);
    if (b) b.setAttribute('aria-selected', 'false');
  }
}

/* ============================================================
   RENDER: ROOMS
   ============================================================ */

function renderRooms() {
  var grid = safeEl('roomsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  if (!state.rooms || state.rooms.length === 0) {
    grid.appendChild(el('p', 'text-slate-500 text-sm', 'Nenhuma sala encontrada. Verifique a conexão.'));
    return;
  }

  for (var i = 0; i < state.rooms.length; i++) {
    var room = state.rooms[i];
    var c = getActiveCase(room.id);
    if (!c) continue;
    updateCasePhasesFromEvents(c);

    var card = el('div', 'card bg-white border border-slate-200 shadow-sm p-4');
    var wrap = el('div', 'flex flex-wrap items-start justify-between gap-3');
    var left = el('div', 'min-w-0');
    var right = el('div', 'shrink-0 flex flex-col gap-2');

    var top = el('div', 'flex items-center gap-2');
    top.appendChild(el('div', 'text-lg font-black', room.code));
    top.appendChild(chip(deriveRoomStatus(c.id), 'bg-slate-100 border border-slate-200 text-slate-700'));
    top.appendChild(chip(c.code, 'bg-slate-100 border border-slate-200 text-slate-700 mono'));
    left.appendChild(top);

    var info = el('div', 'mt-2 text-sm text-slate-700');
    var p1 = el('div');
    p1.appendChild(el('span', 'text-slate-500 font-bold', 'Paciente: '));
    p1.appendChild(document.createTextNode(String((c.data && c.data.fullName) || '').trim() || '—'));
    info.appendChild(p1);

    var row = el('div', 'mt-1 grid grid-cols-2 gap-2');
    var a = el('div');
    a.appendChild(el('span', 'text-slate-500 font-bold', 'Aviso: '));
    a.appendChild(el('span', 'mono', String((c.data && c.data.noticeNumber) || '').trim() || '—'));
    var b = el('div');
    b.appendChild(el('span', 'text-slate-500 font-bold', 'Cirurgião: '));
    b.appendChild(document.createTextNode(String((c.data && c.data.surgeonName) || '').trim() || '—'));
    row.appendChild(a); row.appendChild(b);
    info.appendChild(row);

    var p2 = el('div', 'mt-1');
    p2.appendChild(el('span', 'text-slate-500 font-bold', 'Procedimento: '));
    p2.appendChild(document.createTextNode(String((c.data && c.data.procedureName) || '').trim() || '—'));
    info.appendChild(p2);
    left.appendChild(info);

    var kpis = el('div', 'mt-3 grid grid-cols-2 gap-2 text-sm');
    var k1 = el('div', 'bg-slate-50 border border-slate-200 rounded-xl p-3');
    k1.appendChild(el('div', 'text-xs text-slate-500 font-bold uppercase', 'Tempo de SO'));
    var msSO = computeOrTimeMs(c.id);
    k1.appendChild(el('div', 'mt-1 mono font-black', msSO === null ? '—' : formatDurationNoSign(msSO)));

    var k2 = el('div', 'bg-slate-50 border border-slate-200 rounded-xl p-3');
    k2.appendChild(el('div', 'text-xs text-slate-500 font-bold uppercase', 'Total (Transp→RPA.in)'));
    var msTR = computeTotalToRpaInMs(c.id);
    k2.appendChild(el('div', 'mt-1 mono font-black', msTR === null ? '—' : formatDurationNoSign(msTR)));

    kpis.appendChild(k1); kpis.appendChild(k2);
    left.appendChild(kpis);

    (function (roomRef) {
      var btn = el('button', 'btn bg-blue-600 text-white px-4 py-2', 'Abrir sala');
      btn.addEventListener('click', function () {
        currentRoomId = roomRef.id;
        // Refresh events from API before showing detail
        var ac = getActiveCase(roomRef.id);
        if (ac && AUTH.token) {
          apiClient.getEvents(ac.id).then(function (events) {
            state.eventsByCaseId[ac.id] = events;
            save();
            renderRoomDetail(true);
            showRoomDetail();
          }).catch(function () {
            renderRoomDetail(true);
            showRoomDetail();
          });
        } else {
          renderRoomDetail(true);
          showRoomDetail();
        }
      });
      right.appendChild(btn);
    })(room);

    wrap.appendChild(left);
    wrap.appendChild(right);
    card.appendChild(wrap);
    grid.appendChild(card);
  }
}

/* ============================================================
   RENDER: ROOM DETAIL
   ============================================================ */

function renderRoomDetail(fullRender) {
  var room = state.rooms.find(function (r) { return r.id === currentRoomId; });
  var c = getActiveCase(currentRoomId);
  if (!c) return;
  updateCasePhasesFromEvents(c);

  if (fullRender) {
    setTextById('roomTitle', (room && room.code) ? room.code : 'Sala');
    setTextById('roomStatus', deriveRoomStatus(c.id));

    var caseLine = safeEl('caseLine');
    if (caseLine) caseLine.textContent = 'Caso: ' + c.code + ' • Proced.: ' + (String((c.data && c.data.procedureName) || '').trim() || '—');

    var patientLine = safeEl('patientLine');
    if (patientLine) patientLine.textContent =
      'Paciente: ' + (String((c.data && c.data.fullName) || '').trim() || '—') +
      ' • Cirurgião: ' + (String((c.data && c.data.surgeonName) || '').trim() || '—');

    setTextById('noticeNumber', String((c.data && c.data.noticeNumber) || '').trim() || '—');
    setTextById('attendanceNumber', String((c.data && c.data.attendanceNumber) || '').trim() || '—');

    var planned = String((c.data && c.data.plannedSurgeryTimeHHMM) || '').trim();
    setTextById('plannedSurgery', planned || '—');

    var delays = computeDelays(c);
    setTextById('delayPatientInOr', delays.patient !== null ? formatDurationSigned(delays.patient) : '—');
    setTextById('delaySurgicalTeam', delays.surgTeam !== null ? formatDurationSigned(delays.surgTeam) : '—');
    setTextById('delayAnesthesiaTeam', delays.anesTeam !== null ? formatDurationSigned(delays.anesTeam) : '—');

    var allergyBanner = safeEl('allergyBanner');
    if (allergyBanner) {
      var has = !!String((c.data && c.data.allergies) || '').trim();
      allergyBanner.classList.toggle('hidden', !has);
      if (has) setTextById('allergyText', String(c.data.allergies || '').trim());
    }

    renderActions(c);
    renderDashboardTv();
    renderReports();
  }

  var msSO = computeOrTimeMs(c.id);
  setTextById('orTime', msSO === null ? '—' : formatDurationNoSign(msSO));
  var total = computeTotalToRpaInMs(c.id);
  setTextById('timelineTotal', total === null ? '—' : formatDurationNoSign(total));
}

/* ============================================================
   RENDER: ACTIONS
   ============================================================ */

function stylesForCard(t, ui) {
  var team = isTeamCard(t.key);
  if (team) {
    if (ui.state === 'in_progress') return { style: 'background:linear-gradient(135deg,#1e40af,#2563eb);border-color:#93c5fd;', text: 'text-white', badge: 'chip bg-white/15 border border-white/20 text-white' };
    if (ui.state === 'done') return { style: 'background:linear-gradient(180deg,#f0f7ff,#e0f2fe);border-color:#93c5fd;', text: 'text-slate-900', badge: 'chip bg-sky-200 text-sky-900' };
    return { style: 'background:linear-gradient(180deg,#f0f7ff,#dbeafe);border-color:#93c5fd;', text: 'text-slate-900', badge: 'chip bg-sky-100 text-sky-900' };
  }
  if (ui.state === 'in_progress') return { style: 'background:linear-gradient(135deg,#1d4ed8,#3b82f6);border-color:#93c5fd;', text: 'text-white', badge: 'chip bg-white/15 border border-white/20 text-white' };
  if (ui.state === 'done') return { style: 'background:linear-gradient(180deg,#ffffff,#e8f2ff);border-color:#bfdbfe;', text: 'text-slate-900', badge: 'chip bg-sky-100 text-sky-800' };
  return { style: 'background:linear-gradient(180deg,#ffffff,#eef6ff);', text: 'text-slate-900', badge: 'chip bg-slate-100 text-slate-700' };
}

function badgeTextForCard(t, ui) {
  if (isTeamCard(t.key)) {
    if (ui.state === 'in_progress') return 'EM SO';
    if (ui.state === 'done') return 'SAÍDA DE SO';
  }
  if (ui.state === 'in_progress') return 'EM ANDAMENTO';
  if (ui.state === 'done') return 'CONCLUÍDO';
  return ui.nextActionLabel;
}

function renderActions(caseObj) {
  var grid = safeEl('actionsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  for (var i = 0; i < EVENT_TYPES.length; i++) {
    var t = EVENT_TYPES[i];
    var evForKey = getEvents(caseObj.id).filter(function (e) { return e.eventKey === t.key; });
    var ui = computeEventUIState(t, evForKey);
    var st = stylesForCard(t, ui);

    var btn = el('button', ('btn btn-xl border shadow-sm ' + st.text).trim());
    btn.setAttribute('style', st.style);

    var rowDiv = el('div', 'flex items-center justify-between gap-2');
    rowDiv.appendChild(el('span', 'truncate', String(t.seq) + '. ' + t.label));
    rowDiv.appendChild(el('span', st.badge, badgeTextForCard(t, ui)));
    btn.appendChild(rowDiv);

    (function (eventType, uiState, eventsForKeyLocal) {
      btn.addEventListener('click', function () {
        var lockKey = 'evt:' + caseObj.id + ':' + eventType.key;
        if (isLocked(lockKey)) { toast('Aguarde 1s (anti-toque duplo).'); return; }
        lock(lockKey);

        if (!uiState.validation.ok) { toast('Bloqueado: ' + uiState.validation.reason); return; }
        var next = nextActionForEvent(eventType, eventsForKeyLocal);

        if (eventType.key === 'cleaning' && next === 'in') {
          if (isOpen(caseObj.id, 'surgery') || isOpen(caseObj.id, 'anesthesia') || isOpen(caseObj.id, 'patient_in_or')) {
            if (!confirm('Ao iniciar Limpeza, Cirurgia, Anestesia e Paciente em SO (se em andamento) serão concluídas automaticamente. Continuar?')) return;
          }
        }
        if (eventType.key === 'rpa' && next === 'in') {
          var open = getOpenEventKeys(caseObj.id).filter(function (k) { return k !== 'rpa'; });
          if (open.length > 0) {
            if (!confirm('Há etapas em andamento. Ao registrar ENTRADA na RPA, todas as etapas em andamento serão concluídas automaticamente. Continuar?')) return;
          }
        }

        applyAutoClosures(caseObj.id, { eventKey: eventType.key, action: next });
        addEvent(caseObj.id, { eventKey: eventType.key, action: next, auto: false });
        updateCasePhasesFromEvents(caseObj);

        toast(eventType.label + ': ' + actionLabel(next) + ' registrado (' + formatTimeBR_HHmmss(new Date()) + ')');

        renderRoomDetail(true);
        renderRooms();
        renderDashboardTv();
        renderReports();
      });
    })(t, ui, evForKey);

    grid.appendChild(btn);
  }
}

/* ============================================================
   RENDER: DASHBOARD TV + REPORTS
   ============================================================ */

function getAllCasesSorted() {
  return state.cases.slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
}

function renderDashboardTv() {
  var kpisEl = safeEl('dashKpis');
  var tbody = safeEl('dashTvTable');
  var updated = safeEl('dashUpdatedAt');
  if (!kpisEl || !tbody || !updated) return;

  var cases = getAllCasesSorted();
  var totalCases = cases.length;

  var avgOr = avgMs(cases.map(function (c) { return computeOrTimeMs(c.id); }));
  var avgSurg = avgMs(cases.map(function (c) { return computeSurgeryTimeMs(c.id); }));
  var avgAnes = avgMs(cases.map(function (c) { return computeAnesthesiaTimeMs(c.id); }));
  var avgToRpaIn = avgMs(cases.map(function (c) { return computeTotalToRpaInMs(c.id); }));
  var avgRpa = avgMs(cases.map(function (c) { return computeRpaTimeMs(c.id); }));
  var avgTotalCc = avgMs(cases.map(function (c) { return computeTotalCcMs(c.id); }));

  var withRpaIn = cases.filter(function (c) { return !!findFirstEventTime(c.id, 'rpa', 'in'); }).length;
  var withRpaOut = cases.filter(function (c) { return !!findFirstEventTime(c.id, 'rpa', 'out'); }).length;
  var plannedCount = cases.filter(function (c) { return !!String((c.data && c.data.plannedSurgeryTimeHHMM) || '').trim(); }).length;

  kpisEl.innerHTML = '';
  function addKpi(label, value, sub) {
    var box = el('div', 'tv-kpi');
    box.appendChild(el('div', 'label', label));
    box.appendChild(el('div', 'value mono', value));
    box.appendChild(el('div', 'sub', sub));
    kpisEl.appendChild(box);
  }

  addKpi('Cases (total)', String(totalCases), 'RPA.in ' + pct(withRpaIn, totalCases) + ' • RPA.out ' + pct(withRpaOut, totalCases));
  addKpi('Média Tempo SO', avgOr === null ? '—' : formatDurationNoSign(avgOr), '—');
  addKpi('Média Tempo Cirurgia', avgSurg === null ? '—' : formatDurationNoSign(avgSurg), '—');
  addKpi('Média Tempo RPA', avgRpa === null ? '—' : formatDurationNoSign(avgRpa), 'Previsto preenchido: ' + pct(plannedCount, totalCases));
  addKpi('Média Transp→RPA.in', avgToRpaIn === null ? '—' : formatDurationNoSign(avgToRpaIn), '—');
  addKpi('Média Total CC', avgTotalCc === null ? '—' : formatDurationNoSign(avgTotalCc), 'Transp.start → RPA.out');
  addKpi('Média Anestesia', avgAnes === null ? '—' : formatDurationNoSign(avgAnes), '—');
  addKpi('Auto closures', String(cases.filter(function (c) { return hasAnyAutoClosures(c.id); }).length), 'Cases com fechamento automático');

  tbody.innerHTML = '';
  for (var i = 0; i < state.rooms.length; i++) {
    var room = state.rooms[i];
    var c = getActiveCase(room.id);
    if (!c) continue;
    updateCasePhasesFromEvents(c);
    var data = c.data || {};

    var soIn = findFirstEventTime(c.id, 'patient_in_or', 'in');
    var soOut = findFirstEventTime(c.id, 'patient_in_or', 'out');
    var surgStart = findFirstEventTime(c.id, 'surgery', 'start');
    var surgEnd = findFirstEventTime(c.id, 'surgery', 'end');
    var rpaIn = findFirstEventTime(c.id, 'rpa', 'in');
    var rpaOut = findFirstEventTime(c.id, 'rpa', 'out');

    var msSO = computeOrTimeMs(c.id);
    var msCir = computeSurgeryTimeMs(c.id);
    var msR = computeRpaTimeMs(c.id);
    var msToR = computeTotalToRpaInMs(c.id);
    var msCC = computeTotalCcMs(c.id);

    var tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 cursor-pointer';

    function td(value, clsName) {
      var cell = el('td', (clsName || '') + ' py-2 pr-3');
      cell.textContent = value;
      return cell;
    }

    tr.appendChild(td(room.code, 'font-black'));
    var stCell = el('td', 'py-2 pr-3');
    stCell.appendChild(chip(deriveRoomStatus(c.id), 'bg-slate-100 border border-slate-200 text-slate-700'));
    tr.appendChild(stCell);

    var tdPat = el('td', 'py-2 pr-3');
    tdPat.appendChild(el('div', 'truncate2', shortText(data.fullName, 26)));
    tdPat.appendChild(el('div', 'small mono', shortText(data.noticeNumber, 26)));
    tr.appendChild(tdPat);

    var tdProc = el('td', 'py-2 pr-3');
    tdProc.appendChild(el('div', 'truncate3', shortText(data.procedureName, 34)));
    tdProc.appendChild(el('div', 'small', shortText(data.surgeonName, 34)));
    tr.appendChild(tdProc);

    tr.appendChild(td(formatTimeOrDash(soIn), 'mono'));
    tr.appendChild(td(formatTimeOrDash(soOut), 'mono'));
    tr.appendChild(td(msSO === null ? '—' : formatDurationNoSign(msSO), 'mono font-black'));
    tr.appendChild(td(formatTimeOrDash(surgStart), 'mono'));
    tr.appendChild(td(formatTimeOrDash(surgEnd), 'mono'));
    tr.appendChild(td(msCir === null ? '—' : formatDurationNoSign(msCir), 'mono font-black'));
    tr.appendChild(td(formatTimeOrDash(rpaIn), 'mono'));
    tr.appendChild(td(formatTimeOrDash(rpaOut), 'mono'));
    tr.appendChild(td(msR === null ? '—' : formatDurationNoSign(msR), 'mono font-black'));
    tr.appendChild(td(msToR === null ? '—' : formatDurationNoSign(msToR), 'mono font-black'));
    tr.appendChild(td(msCC === null ? '—' : formatDurationNoSign(msCC), 'mono font-black'));
    tr.appendChild(td(hasAnyAutoClosures(c.id) ? ('Sim (' + countAutoClosures(c.id) + ')') : 'Não', ''));

    (function (roomRef) {
      tr.addEventListener('click', function () {
        currentRoomId = roomRef.id;
        renderRoomDetail(true);
        showRoomDetail();
      });
    })(room);

    tbody.appendChild(tr);
  }

  updated.textContent = 'Atualizado: ' + formatTimeBR_HHmmss(new Date());
}

function renderReports() {
  var tbody = safeEl('reportsTable');
  if (!tbody) return;
  tbody.innerHTML = '';

  var cases = getAllCasesSorted();
  for (var i = 0; i < cases.length; i++) {
    var c = cases[i];
    var room = state.rooms.find(function (r) { return r.id === c.roomId; });
    var data = c.data || {};

    var soIn = findFirstEventTime(c.id, 'patient_in_or', 'in');
    var soOut = findFirstEventTime(c.id, 'patient_in_or', 'out');
    var anesStart = findFirstEventTime(c.id, 'anesthesia', 'start');
    var anesEnd = findFirstEventTime(c.id, 'anesthesia', 'end');
    var surgStart = findFirstEventTime(c.id, 'surgery', 'start');
    var surgEnd = findFirstEventTime(c.id, 'surgery', 'end');
    var trStart = findFirstEventTime(c.id, 'transport_patient', 'start');
    var rpaIn = findFirstEventTime(c.id, 'rpa', 'in');
    var rpaOut = findFirstEventTime(c.id, 'rpa', 'out');

    var msSO = computeOrTimeMs(c.id);
    var msAn = computeAnesthesiaTimeMs(c.id);
    var msCir = computeSurgeryTimeMs(c.id);
    var msR = computeRpaTimeMs(c.id);
    var msToR = computeTotalToRpaInMs(c.id);
    var msCC = computeTotalCcMs(c.id);

    var tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50';

    function td(value, clsName) {
      var cell = el('td', (clsName || '') + ' py-2 pr-3');
      cell.textContent = value;
      return cell;
    }

    tr.appendChild(td(room ? room.code : '—', 'font-black'));
    tr.appendChild(td(c.code, 'mono'));
    tr.appendChild(td(String(data.noticeNumber || '').trim() || '—', 'mono'));
    tr.appendChild(td(String(data.fullName || '').trim() || '—', ''));
    tr.appendChild(td(String(data.procedureName || '').trim() || '—', ''));
    tr.appendChild(td(String(data.surgeonName || '').trim() || '—', ''));
    tr.appendChild(td(formatTimeOrDash(soIn), 'mono'));
    tr.appendChild(td(formatTimeOrDash(soOut), 'mono'));
    tr.appendChild(td(msSO === null ? '—' : formatDurationNoSign(msSO), 'mono font-black'));
    tr.appendChild(td(formatTimeOrDash(anesStart), 'mono'));
    tr.appendChild(td(formatTimeOrDash(anesEnd), 'mono'));
    tr.appendChild(td(msAn === null ? '—' : formatDurationNoSign(msAn), 'mono font-black'));
    tr.appendChild(td(formatTimeOrDash(surgStart), 'mono'));
    tr.appendChild(td(formatTimeOrDash(surgEnd), 'mono'));
    tr.appendChild(td(msCir === null ? '—' : formatDurationNoSign(msCir), 'mono font-black'));
    tr.appendChild(td(formatTimeOrDash(trStart), 'mono'));
    tr.appendChild(td(formatTimeOrDash(rpaIn), 'mono'));
    tr.appendChild(td(formatTimeOrDash(rpaOut), 'mono'));
    tr.appendChild(td(msR === null ? '—' : formatDurationNoSign(msR), 'mono font-black'));
    tr.appendChild(td(msToR === null ? '—' : formatDurationNoSign(msToR), 'mono font-black'));
    tr.appendChild(td(msCC === null ? '—' : formatDurationNoSign(msCC), 'mono font-black'));
    tr.appendChild(td(hasAnyAutoClosures(c.id) ? ('Sim (' + countAutoClosures(c.id) + ')') : 'Não', ''));
    tr.appendChild(td(c.status === 'closed' ? 'Concluído' : 'Ativo', ''));

    tbody.appendChild(tr);
  }
}

/* ============================================================
   MODAL DETAILS
   ============================================================ */

var detailsModal = null; // initialized in wire()

function openDetailsModal() {
  var c = getActiveCase(currentRoomId);
  if (!c) return;
  renderDetailsModal(c);
  if (detailsModal) detailsModal.classList.remove('hidden');
}

function renderDetailsModal(caseObj) {
  var grid = safeEl('detailsGrid');
  if (!grid) return;
  var d = caseObj.data || {};
  grid.innerHTML = '';

  function addField(title, id, type, value, span2, mono) {
    var box = el('div', 'bg-slate-50 border border-slate-200 rounded-xl p-3' + (span2 ? ' col-span-2' : ''));
    box.appendChild(el('div', 'text-xs text-slate-500 font-bold uppercase', title));
    var input = document.createElement('input');
    input.type = type;
    input.id = id;
    input.value = value || '';
    input.className = 'mt-2 w-full soft-input' + (mono ? ' mono' : '');
    box.appendChild(input);
    grid.appendChild(box);
  }

  addField('Data do dia (referência)', 'inpRefDate', 'date', String(d.referenceDateISO || '').trim(), true, true);
  addField('Horário previsto de início da cirurgia (HH:MM)', 'inpPlannedSurgery', 'time', String(d.plannedSurgeryTimeHHMM || '').trim(), true, true);
  addField('Nome do paciente', 'inpFullName', 'text', String(d.fullName || ''), true, false);
  addField('Aviso cirúrgico', 'inpNotice', 'text', String(d.noticeNumber || ''), false, true);
  addField('Atendimento', 'inpAttendance', 'text', String(d.attendanceNumber || ''), false, true);
  addField('Procedimento cirúrgico', 'inpProcedure', 'text', String(d.procedureName || ''), true, false);
  addField('Nome do cirurgião', 'inpSurgeon', 'text', String(d.surgeonName || ''), true, false);
  addField('Data de nascimento', 'inpBirthDate', 'date', String(d.birthDate || '').trim(), false, true);
  addField('Alergia', 'inpAllergies', 'text', String(d.allergies || ''), false, false);
  addField('Peso (kg)', 'inpWeight', 'text', String(d.weightKg || ''), false, true);
  addField('Altura (cm)', 'inpHeight', 'text', String(d.heightCm || ''), false, true);
}

function saveDetailsFromModal() {
  var c = getActiveCase(currentRoomId);
  if (!c) return;

  function val(id) { var e = safeEl(id); return e ? String(e.value || '').trim() : ''; }

  c.data = c.data || {};
  c.data.referenceDateISO = val('inpRefDate') || toISODate(new Date());
  c.data.plannedSurgeryTimeHHMM = val('inpPlannedSurgery');
  c.data.fullName = val('inpFullName');
  c.data.noticeNumber = val('inpNotice');
  c.data.attendanceNumber = val('inpAttendance');
  c.data.procedureName = val('inpProcedure');
  c.data.surgeonName = val('inpSurgeon');
  c.data.birthDate = val('inpBirthDate');
  c.data.allergies = val('inpAllergies');
  c.data.weightKg = val('inpWeight');
  c.data.heightCm = val('inpHeight');
  save();

  // Sync to API
  if (AUTH.token) {
    apiClient.patchCase(c.id, { data: c.data })
      .catch(function (err) { console.warn('Details sync failed:', err); });
  }
}

/* ============================================================
   UNDO
   ============================================================ */

function undoLastManualEventForActiveCase() {
  var c = getActiveCase(currentRoomId);
  if (!c) return;
  var arr = state.eventsByCaseId[c.id] || [];
  for (var i = arr.length - 1; i >= 0; i--) {
    var e = arr[i];
    if (!e.auto) {
      arr.splice(i, 1);
      save();
      toast('Desfeito: ' + e.eventKey + ' (' + e.action + ')');
      updateCasePhasesFromEvents(c);
      renderRoomDetail(true);
      renderRooms();
      renderDashboardTv();
      renderReports();
      return;
    }
  }
  toast('Nada para desfazer (nenhum evento manual).');
}

/* ============================================================
   CLOCK TICK
   ============================================================ */

function tickClockOnly() {
  var d = new Date();
  setTextById('todayTop', formatDateBRFromISO(toISODate(d)));
  setTextById('clockTop', formatTimeBR_HHmmss(d));
  setTextById('todayDateTop', formatDateBRFromISO(toISODate(d)));
  setTextById('clock', formatTimeBR_HHmmss(d));

  var detail = safeEl('viewRoomDetail');
  if (detail && !detail.classList.contains('hidden')) renderRoomDetail(false);

  var dash = safeEl('viewDashboard');
  if (dash && !dash.classList.contains('hidden')) renderDashboardTv();
}

/* ============================================================
   AUTH UI
   ============================================================ */

function showLoginOverlay() {
  var overlay = safeEl('loginOverlay');
  var app = safeEl('appShell');
  if (overlay) overlay.classList.remove('hidden');
  if (app) app.classList.add('hidden');
}

function hideLoginOverlay() {
  var overlay = safeEl('loginOverlay');
  var app = safeEl('appShell');
  if (overlay) overlay.classList.add('hidden');
  if (app) app.classList.remove('hidden');
}

function updateUserInfoBar() {
  if (!AUTH.user) return;
  var roleLabel = AUTH.user.role === 'admin' ? 'ADMIN' : 'COLABORADOR';
  setTextById('userNameDisplay', AUTH.user.name || AUTH.user.username);
  setTextById('userRoleChip', roleLabel);

  var tenantLine = safeEl('tenantLine');
  if (tenantLine && AUTH.tenant) {
    tenantLine.textContent = (AUTH.tenant.name || AUTH.tenant.slug) + ' • Salas • Dashboard TV • Relatórios (online).';
  }
}

function doLogin() {
  var username = String((safeEl('loginUsername') || {}).value || '').trim();
  var password = String((safeEl('loginPassword') || {}).value || '').trim();
  var tenant = String((safeEl('loginTenant') || {}).value || '').trim();

  var errEl = safeEl('loginError');
  if (errEl) errEl.classList.add('hidden');

  if (!username || !password || !tenant) {
    if (errEl) { errEl.textContent = 'Preencha todos os campos.'; errEl.classList.remove('hidden'); }
    return;
  }

  var btn = safeEl('btnLogin');
  if (btn) { btn.textContent = 'Entrando…'; btn.disabled = true; }

  apiClient.login(username, password, tenant)
    .then(function (data) {
      AUTH.token = data.token;
      AUTH.user = data.user;
      AUTH.tenant = data.tenant;
      persistAuth();

      updateUserInfoBar();

      return initFromApi();
    })
    .then(function () {
      hideLoginOverlay();
      startApp();
    })
    .catch(function (err) {
      if (errEl) {
        errEl.textContent = (err && err.message) ? err.message : 'Erro ao entrar. Verifique as credenciais.';
        errEl.classList.remove('hidden');
      }
    })
    .finally(function () {
      if (btn) { btn.textContent = 'Entrar'; btn.disabled = false; }
    });
}

function doLogout() {
  clearAuth();
  resetState();
  state.rooms = [];
  state.cases = [];
  state.eventsByCaseId = {};
  showLoginOverlay();
}

/* ============================================================
   APP STARTUP
   ============================================================ */

function startApp() {
  setTextById('buildStamp', APP_VERSION + ' • ' + BUILD_STAMP);
  updateUserInfoBar();

  if (state.rooms && state.rooms.length > 0) {
    currentRoomId = state.rooms[0].id;
  }

  setSelectedTab('tabRooms');
  renderRooms();
  renderDashboardTv();
  renderReports();

  tickClockOnly();
  setInterval(tickClockOnly, 1000);
}

/* ============================================================
   WIRE — event listeners
   ============================================================ */

function wire() {
  detailsModal = safeEl('detailsModal');

  // Tab navigation
  var tabRooms = safeEl('tabRooms');
  var tabDash = safeEl('tabDashboard');
  var tabRep = safeEl('tabReports');
  if (tabRooms) tabRooms.addEventListener('click', function () { setSelectedTab('tabRooms'); renderRooms(); });
  if (tabDash) tabDash.addEventListener('click', function () { setSelectedTab('tabDashboard'); renderDashboardTv(); });
  if (tabRep) tabRep.addEventListener('click', function () { setSelectedTab('tabReports'); renderReports(); });

  var btnBack = safeEl('btnBackToRooms');
  if (btnBack) btnBack.addEventListener('click', function () { setSelectedTab('tabRooms'); renderRooms(); });

  // Details modal
  var btnOpen = safeEl('btnDetailsOpen');
  var btnClose = safeEl('btnCloseDetails');
  var btnSave = safeEl('btnSaveDetails');
  if (btnOpen) btnOpen.addEventListener('click', function () { openDetailsModal(); });
  if (btnClose) btnClose.addEventListener('click', function () { if (detailsModal) detailsModal.classList.add('hidden'); });
  if (btnSave) btnSave.addEventListener('click', function () {
    saveDetailsFromModal();
    if (detailsModal) detailsModal.classList.add('hidden');
    toast('Detalhes salvos.');
    renderRoomDetail(true);
    renderRooms();
    renderDashboardTv();
    renderReports();
  });
  if (detailsModal) {
    detailsModal.addEventListener('click', function (e) {
      if (e.target === detailsModal) detailsModal.classList.add('hidden');
    });
  }

  // Undo / voice
  var btnUndo = safeEl('btnUndoManual');
  var btnVoice = safeEl('btnVoice');
  if (btnUndo) btnUndo.addEventListener('click', function () { undoLastManualEventForActiveCase(); });
  if (btnVoice) btnVoice.addEventListener('click', function () { toast('Modo voz (futuro).'); });

  // Reset (clear local cache)
  var btnReset = safeEl('btnResetAll');
  if (btnReset) btnReset.addEventListener('click', function () {
    if (!confirm('Limpar cache local e recarregar dados do servidor?')) return;
    resetState();
    location.reload();
  });

  // Login form
  var btnLogin = safeEl('btnLogin');
  if (btnLogin) btnLogin.addEventListener('click', function () { doLogin(); });
  var loginPwd = safeEl('loginPassword');
  if (loginPwd) loginPwd.addEventListener('keydown', function (e) { if (e.key === 'Enter') doLogin(); });

  // Logout
  var btnLogout = safeEl('btnLogout');
  if (btnLogout) btnLogout.addEventListener('click', function () {
    if (confirm('Deseja sair da sua conta?')) doLogout();
  });

  // ── Auth check on load ────────────────────────────────────
  loadAuth();

  if (!AUTH.token) {
    showLoginOverlay();
    return;
  }

  // Token exists — verify it's still valid then load data
  apiClient.me()
    .then(function (data) {
      // Refresh user/tenant info from token verification
      AUTH.user = data.user;
      AUTH.tenant = data.tenant;
      persistAuth();
      updateUserInfoBar();
      return initFromApi();
    })
    .then(function () {
      hideLoginOverlay();
      startApp();
    })
    .catch(function () {
      // Token expired or invalid
      clearAuth();
      showLoginOverlay();
    });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', wire);
} else {
  wire();
}
