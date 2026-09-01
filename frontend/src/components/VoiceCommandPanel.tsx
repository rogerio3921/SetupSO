import React, { useEffect, useRef, useState } from 'react';
import { Mic, Settings, AlertTriangle, Check, Trash2, ClipboardCopy } from 'lucide-react';
import { useSpeechRecognition } from '../voice/useSpeechRecognition';
import { speak, isSpeaking, estimateSpeechMs } from '../voice/speak';
import {
  matchCommand,
  detectRoomCommand,
  stripWakeWord,
  isAffirmation,
  normalize,
  GrammarStage,
  CommandMatch,
  VoiceAction,
} from '../voice/commandGrammar';

export interface VoiceRoom {
  id: string;
  code: string;
  name?: string;
  caseId?: string;
}

interface Props {
  stages: GrammarStage[];
  rooms: VoiceRoom[];
  selectedRoomId: string | null;
  onSelectRoom: (id: string) => void;
  checkAction: (
    caseId: string,
    stageKey: string,
    action: VoiceAction,
  ) => { allowed: boolean; reason?: string };
  runAction: (roomId: string, stageKey: string, action: VoiceAction) => Promise<void> | void;
}

interface CustomPhrase {
  id: string;
  phrase: string;
  stageKey: string;
  action: VoiceAction;
}

interface VoiceSettings {
  enabled: boolean;
  requireWakeWord: boolean;
  wakeWord: string;
  spokenFeedback: boolean; // fala a confirmação de um comando executado
  announceUnrecognized: boolean; // fala "não entendi"
  requireVerb: boolean;
  confirmEndActions: boolean;
  sensitivity: number;
  settleMs: number; // espera você terminar de falar + janela morta após um comando
  customPhrases: CustomPhrase[];
}

type ResultStatus = 'ok' | 'blocked' | 'unmatched' | 'room' | 'need-room' | 'confirm';

interface LastResult {
  status: ResultStatus;
  heard: string;
  detail?: string;
  match?: CommandMatch;
  at: number;
}

interface LogEntry {
  t: number;
  raw: string;
  outcome: string;
}

const STORAGE_KEY = 'setupso:voice:settings';

const DEFAULT_SETTINGS: VoiceSettings = {
  enabled: false,
  requireWakeWord: true,
  wakeWord: 'setup',
  spokenFeedback: true,
  announceUnrecognized: false,
  requireVerb: true,
  confirmEndActions: false,
  sensitivity: 0.72,
  settleMs: 1100,
  customPhrases: [],
};

function loadSettings(): VoiceSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<VoiceSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      customPhrases: Array.isArray(parsed.customPhrases) ? parsed.customPhrases : [],
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const actionLabelOf = (a: VoiceAction) =>
  a === 'start' ? 'início' : a === 'end' ? 'fim' : a === 'in' ? 'entrada' : 'saída';

const actionsForKind = (kind: GrammarStage['kind']): { value: VoiceAction; label: string }[] =>
  kind === 'start_end'
    ? [
        { value: 'start', label: 'início' },
        { value: 'end', label: 'fim' },
      ]
    : [
        { value: 'in', label: 'entrada' },
        { value: 'out', label: 'saída' },
      ];

function findRoomByToken(rooms: VoiceRoom[], token: string): VoiceRoom | undefined {
  const t = token.replace(/^0+/, '') || token;
  return rooms.find((r) => {
    const c = normalize(r.code).replace(/\s/g, '');
    return c === token || c.endsWith(token) || c.replace(/^0+/, '').endsWith(t) || c.includes(token);
  });
}

export default function VoiceCommandPanel({
  stages,
  rooms,
  selectedRoomId,
  onSelectRoom,
  checkAction,
  runAction,
}: Props) {
  const [settings, setSettings] = useState<VoiceSettings>(loadSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [lastResult, setLastResult] = useState<LastResult | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [ptt, setPtt] = useState(false);
  const [copied, setCopied] = useState(false);

  // Formulário "ensinar comando"
  const [npPhrase, setNpPhrase] = useState('');
  const [npStage, setNpStage] = useState('');
  const [npAction, setNpAction] = useState<VoiceAction>('start');

  const suppressRef = useRef(false); // true enquanto o app está falando
  const suppressTimerRef = useRef<number | undefined>(undefined);
  const pttActiveRef = useRef(false);
  const pendingRef = useRef<{ key: string; match: CommandMatch; roomId: string; at: number } | null>(null);
  const lastRunRef = useRef<{ key: string; at: number } | null>(null);
  const lastActionAtRef = useRef(0);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* quota / modo privado */
    }
  }, [settings]);

  useEffect(() => {
    if (!npStage && stages.length) setNpStage(stages[0].key);
  }, [stages, npStage]);

  useEffect(() => {
    const stage = stages.find((s) => s.key === npStage);
    if (!stage) return;
    const opts = actionsForKind(stage.kind);
    if (!opts.some((o) => o.value === npAction)) setNpAction(opts[0].value);
  }, [npStage, npAction, stages]);

  const update = (patch: Partial<VoiceSettings>) => setSettings((s) => ({ ...s, ...patch }));

  const pushLog = (raw: string, outcome: string) =>
    setLog((l) => [{ t: Date.now(), raw, outcome }, ...l].slice(0, 40));

  // --- lógica de comando (num ref: o reconhecedor sempre chama a versão atual)
  const handleFinalRef = useRef<(candidates: string[]) => void>(() => undefined);

  handleFinalRef.current = (candidates: string[]) => {
    if (!settings.enabled) return;
    const raw = candidates.join(' | ');

    if (suppressRef.current) {
      pushLog(raw, 'ignorado: resposta em andamento');
      return;
    }
    if (Date.now() - lastActionAtRef.current < settings.settleMs) {
      pushLog(raw, 'ignorado: janela pós-comando');
      return;
    }

    const primary = candidates[0] ?? '';

    const say = (text: string) => {
      suppressRef.current = true;
      window.clearTimeout(suppressTimerRef.current);
      speak(text, {
        onEnd: () => {
          if (!isSpeaking()) {
            window.setTimeout(() => {
              suppressRef.current = false;
            }, 300);
          }
        },
      });
      suppressTimerRef.current = window.setTimeout(() => {
        suppressRef.current = false;
      }, estimateSpeechMs(text) + 1800);
    };

    const matchCustom = (phrase: string): CommandMatch | null => {
      const norm = normalize(phrase);
      if (!norm) return null;
      for (const cp of settings.customPhrases) {
        const p = normalize(cp.phrase);
        if (!p) continue;
        const hit = norm === p || norm.includes(p) || (p.length >= 4 && p.includes(norm));
        if (!hit) continue;
        const stage = stages.find((s) => s.key === cp.stageKey);
        if (!stage) continue;
        return {
          stageKey: cp.stageKey,
          stageLabel: stage.label,
          action: cp.action,
          actionLabel: actionLabelOf(cp.action),
          score: 1,
        };
      }
      return null;
    };

    const execute = async (roomId: string, match: CommandMatch) => {
      const key = `${roomId}:${match.stageKey}:${match.action}`;
      lastRunRef.current = { key, at: Date.now() };
      lastActionAtRef.current = Date.now();
      const now = new Date();
      const hhmm = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setLastResult({
        status: 'ok',
        heard: primary,
        detail: `${cap(match.actionLabel)} registrado às ${hhmm}`,
        match,
        at: Date.now(),
      });
      try {
        await runAction(roomId, match.stageKey, match.action);
        if (settings.spokenFeedback) {
          say(`${match.stageLabel}, ${match.actionLabel} às ${now.getHours()} e ${now.getMinutes()}`);
        }
      } catch {
        setLastResult({ status: 'blocked', heard: primary, detail: 'Falha ao registrar', match, at: Date.now() });
        if (settings.spokenFeedback) say('Falha ao registrar o evento');
      }
    };

    // 1) troca de sala — "sala 2" (independe da palavra de ativação)
    for (const alt of candidates) {
      const roomCmd = detectRoomCommand(alt);
      if (!roomCmd) continue;
      const target = findRoomByToken(rooms, roomCmd.query);
      if (target) {
        onSelectRoom(target.id);
        setLastResult({ status: 'room', heard: primary, detail: `Sala ${target.code} selecionada`, at: Date.now() });
        pushLog(raw, `sala -> ${target.code}`);
        if (settings.spokenFeedback) say(`Sala ${target.code} selecionada`);
      } else {
        setLastResult({ status: 'unmatched', heard: primary, detail: `Sala "${roomCmd.query}" não encontrada`, at: Date.now() });
        pushLog(raw, `sala "${roomCmd.query}" não encontrada`);
      }
      return;
    }

    const requireWake = settings.requireWakeWord && !pttActiveRef.current;

    // 2) confirmação pendente de uma ação de fim/saída
    const pending = pendingRef.current;
    if (pending && Date.now() - pending.at < 15000 && candidates.some(isAffirmation)) {
      pendingRef.current = null;
      pushLog(raw, 'confirmação aceita');
      void execute(pending.roomId, pending.match);
      return;
    }

    // 3) interpretar o comando
    let match: CommandMatch | null = null;
    let wokeUp = !requireWake;
    for (const alt of candidates) {
      let phrase = alt;
      if (requireWake) {
        const w = stripWakeWord(alt, settings.wakeWord);
        if (!w.matched) continue;
        wokeUp = true;
        phrase = w.rest;
      }
      match =
        matchCustom(phrase) ||
        matchCommand(phrase, stages, {
          threshold: settings.sensitivity,
          requireVerb: settings.requireVerb,
        });
      if (match) break;
    }

    if (!match) {
      if (wokeUp) {
        setLastResult({ status: 'unmatched', heard: primary, at: Date.now() });
        pushLog(raw, 'não reconhecido');
        if (settings.announceUnrecognized) say('Não entendi');
      } else {
        pushLog(raw, 'sem palavra de ativação');
      }
      return;
    }

    // 4) qual sala recebe o comando
    const withCase = rooms.filter((r) => r.caseId);
    const target = rooms.find((r) => r.id === selectedRoomId && r.caseId) || null;
    if (!target) {
      if (withCase.length === 1) {
        onSelectRoom(withCase[0].id);
        setLastResult({ status: 'need-room', heard: primary, detail: `Abri a sala ${withCase[0].code}. Repita o comando.`, at: Date.now() });
        pushLog(raw, `abriu sala ${withCase[0].code}, aguardando repetição`);
        if (settings.spokenFeedback) say(`Abri a sala ${withCase[0].code}. Repita o comando.`);
        return;
      }
      const detail =
        withCase.length === 0
          ? 'Nenhuma sala com cirurgia em andamento.'
          : 'Várias salas ativas. Diga, por exemplo, "sala 2".';
      setLastResult({ status: 'need-room', heard: primary, detail, at: Date.now() });
      pushLog(raw, `sem sala alvo (${withCase.length} ativas)`);
      if (settings.spokenFeedback) {
        say(withCase.length === 0 ? 'Nenhuma sala com cirurgia em andamento' : 'Diga a sala. Por exemplo, sala 2');
      }
      return;
    }

    // 5) validar a transição
    const check = target.caseId
      ? checkAction(target.caseId, match.stageKey, match.action)
      : { allowed: false, reason: 'Sala sem cirurgia' };
    if (!check.allowed) {
      setLastResult({
        status: 'blocked',
        heard: primary,
        detail: `${cap(match.actionLabel)} de ${match.stageLabel}: ${check.reason ?? 'indisponível'}`,
        match,
        at: Date.now(),
      });
      pushLog(raw, `bloqueado: ${match.stageLabel}/${match.action} — ${check.reason ?? 'indisponível'}`);
      if (settings.spokenFeedback) say(`${match.actionLabel} de ${match.stageLabel} indisponível`);
      return;
    }

    // 6) evitar comando repetido
    const key = `${target.id}:${match.stageKey}:${match.action}`;
    if (lastRunRef.current && lastRunRef.current.key === key && Date.now() - lastRunRef.current.at < 8000) {
      pushLog(raw, 'ignorado: comando repetido');
      return;
    }

    // 7) confirmação falada opcional para fim/saída
    if (settings.confirmEndActions && (match.action === 'end' || match.action === 'out')) {
      pendingRef.current = { key, match, roomId: target.id, at: Date.now() };
      setLastResult({
        status: 'confirm',
        heard: primary,
        detail: `Confirmar ${match.actionLabel} de ${match.stageLabel}? Diga "confirmar".`,
        match,
        at: Date.now(),
      });
      pushLog(raw, `aguardando confirmação: ${match.stageLabel}/${match.action}`);
      say(`Confirmar ${match.actionLabel} de ${match.stageLabel}? Diga confirmar.`);
      return;
    }

    pushLog(raw, `executado: ${match.stageLabel}/${match.action} (${Math.round(match.score * 100)}%)`);
    void execute(target.id, match);
  };

  const onFinal = useRef((c: string[]) => handleFinalRef.current(c)).current;

  const { supported, listening, interim, error, online } = useSpeechRecognition({
    enabled: settings.enabled,
    aggregateMs: settings.settleMs,
    onFinal,
  });

  // --- valores derivados para exibição
  const withCase = rooms.filter((r) => r.caseId);
  const selected = rooms.find((r) => r.id === selectedRoomId && r.caseId);
  const targetLabel = selected
    ? `${selected.code}${selected.name ? ` — ${selected.name}` : ''}`
    : withCase.length === 1
    ? `${withCase[0].code} (será aberta)`
    : withCase.length === 0
    ? 'nenhuma sala ativa'
    : 'diga "sala N"';

  const statusLine = !supported
    ? 'Navegador sem suporte'
    : !settings.enabled
    ? 'Toque no botão para ativar'
    : error === 'mic-denied'
    ? 'Microfone bloqueado'
    : error === 'network' || !online
    ? 'Aguardando conexão'
    : listening
    ? 'Pronto — diga a palavra de ativação'
    : 'Iniciando reconhecimento…';

  const resultStyle: Record<ResultStatus, string> = {
    ok: 'bg-green-50 border-green-300 text-green-800',
    blocked: 'bg-amber-50 border-amber-300 text-amber-800',
    unmatched: 'bg-slate-50 border-slate-300 text-slate-600',
    room: 'bg-blue-50 border-blue-300 text-blue-800',
    'need-room': 'bg-amber-50 border-amber-300 text-amber-800',
    confirm: 'bg-indigo-50 border-indigo-300 text-indigo-800',
  };

  const copyLog = () => {
    const text = log
      .map((e) => `${new Date(e.t).toLocaleTimeString('pt-BR')}  ${e.raw}  =>  ${e.outcome}`)
      .join('\n');
    try {
      navigator.clipboard?.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const addCustomPhrase = () => {
    const phrase = npPhrase.trim();
    if (!phrase || !npStage) return;
    update({
      customPhrases: [
        ...settings.customPhrases,
        { id: `${Date.now()}`, phrase, stageKey: npStage, action: npAction },
      ],
    });
    setNpPhrase('');
  };

  const npStageObj = stages.find((s) => s.key === npStage);

  return (
    <div className="fixed bottom-4 right-4 z-40 w-[330px] max-w-[calc(100vw-2rem)]">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 bg-slate-900 text-white">
          <Mic size={18} className={listening ? 'text-green-400' : 'text-slate-400'} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black leading-none">Comando de voz</p>
            <p className="text-[11px] text-slate-300 mt-1 truncate">{statusLine}</p>
          </div>
          <button
            type="button"
            aria-label={settings.enabled ? 'Desativar' : 'Ativar'}
            onClick={() => update({ enabled: !settings.enabled })}
            disabled={!supported}
            className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-40 ${
              settings.enabled ? 'bg-green-500' : 'bg-slate-600'
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${
                settings.enabled ? 'left-5' : 'left-0.5'
              }`}
            />
          </button>
          <button
            type="button"
            aria-label="Configurações"
            onClick={() => setShowSettings((s) => !s)}
            className="p-1 hover:bg-white/10 rounded"
          >
            <Settings size={16} />
          </button>
        </div>

        {/* Body */}
        {!supported ? (
          <div className="p-4 text-sm text-red-600">
            Este navegador não suporta reconhecimento de voz. Use o Google Chrome ou o Microsoft Edge
            (no computador ou no Android). No iPhone/iPad não funciona.
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {error === 'mic-denied' && (
              <div className="flex gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>
                  Permissão de microfone negada. Toque no cadeado ao lado do endereço, permita o
                  microfone e reative aqui.
                </span>
              </div>
            )}
            {(error === 'network' || !online) && settings.enabled && (
              <div className="flex gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>Sem conexão. O reconhecimento de voz precisa de internet.</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  listening ? 'bg-green-500 animate-pulse' : 'bg-slate-300'
                }`}
              />
              <span className="text-xs font-bold text-slate-600">
                {!settings.enabled ? 'Desativado' : listening ? 'Ouvindo…' : 'Iniciando…'}
              </span>
              {settings.enabled && settings.requireWakeWord && (
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                  palavra: “{settings.wakeWord}”
                </span>
              )}
            </div>

            {interim && <p className="text-xs italic text-slate-400 truncate">“{interim}”</p>}

            <div className="text-[11px] text-slate-500">
              Sala alvo: <span className="font-bold text-slate-700">{targetLabel}</span>
            </div>

            {lastResult && (
              <div className={`rounded-lg border p-2.5 text-xs ${resultStyle[lastResult.status]}`}>
                <div className="flex items-center gap-1.5 font-black">
                  {lastResult.status === 'ok' ? <Check size={13} /> : <Mic size={13} />}
                  {lastResult.match
                    ? `${lastResult.match.stageLabel} · ${lastResult.match.actionLabel}`
                    : lastResult.status === 'room'
                    ? 'Troca de sala'
                    : 'Comando não reconhecido'}
                </div>
                {lastResult.detail && <p className="mt-0.5">{lastResult.detail}</p>}
                {lastResult.heard && (
                  <p className="mt-0.5 opacity-60 truncate">
                    ouvido: “{lastResult.heard}”
                    {lastResult.match ? ` (${Math.round(lastResult.match.score * 100)}%)` : ''}
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              onPointerDown={() => {
                pttActiveRef.current = true;
                setPtt(true);
              }}
              onPointerUp={() => {
                pttActiveRef.current = false;
                setPtt(false);
              }}
              onPointerLeave={() => {
                pttActiveRef.current = false;
                setPtt(false);
              }}
              disabled={!settings.enabled}
              className={`w-full py-2 rounded-lg text-xs font-black transition-all disabled:opacity-40 ${
                ptt ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {ptt ? 'Pode falar o comando…' : 'Segurar para falar (sem palavra de ativação)'}
            </button>

            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>
                Ex.: <b>“{settings.wakeWord}, início da cirurgia”</b> · <b>“sala 2”</b>
              </span>
              <button
                type="button"
                onClick={() => setShowLog((s) => !s)}
                className="font-bold text-slate-500 hover:text-slate-700 whitespace-nowrap ml-2"
              >
                {showLog ? 'ocultar registro' : `registro (${log.length})`}
              </button>
            </div>

            {showLog && (
              <div className="rounded-lg border border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-200">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide">
                    O que o microfone ouviu
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={copyLog}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-800"
                    >
                      <ClipboardCopy size={11} />
                      {copied ? 'copiado' : 'copiar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setLog([])}
                      className="text-[10px] font-bold text-slate-400 hover:text-slate-700"
                    >
                      limpar
                    </button>
                  </div>
                </div>
                <div className="max-h-40 overflow-y-auto divide-y divide-slate-100">
                  {log.length === 0 ? (
                    <p className="text-[11px] text-slate-400 p-2">Nada registrado ainda.</p>
                  ) : (
                    log.map((e) => (
                      <div key={e.t} className="px-2 py-1.5 text-[11px]">
                        <span className="text-slate-400">
                          {new Date(e.t).toLocaleTimeString('pt-BR')}
                        </span>{' '}
                        <span className="text-slate-800">“{e.raw}”</span>
                        <span className="block text-slate-500">→ {e.outcome}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Configurações */}
        {showSettings && supported && (
          <div className="border-t border-slate-200 p-4 space-y-3 bg-slate-50 max-h-[60vh] overflow-y-auto">
            <label className="flex items-center justify-between text-xs font-bold text-slate-700">
              Exigir palavra de ativação
              <input
                type="checkbox"
                checked={settings.requireWakeWord}
                onChange={(e) => update({ requireWakeWord: e.target.checked })}
              />
            </label>
            <label className="block text-xs font-bold text-slate-700">
              Palavra de ativação
              <input
                type="text"
                value={settings.wakeWord}
                onChange={(e) => update({ wakeWord: e.target.value.toLowerCase() })}
                className="mt-1 w-full px-2 py-1.5 border border-slate-300 rounded text-sm font-normal"
              />
            </label>
            <label className="flex items-center justify-between text-xs font-bold text-slate-700">
              Confirmação falada (comando OK)
              <input
                type="checkbox"
                checked={settings.spokenFeedback}
                onChange={(e) => update({ spokenFeedback: e.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>
                Falar quando não entender
                <span className="block font-normal text-[10px] text-slate-400">
                  desligado: só mostra na tela, sem voz
                </span>
              </span>
              <input
                type="checkbox"
                checked={settings.announceUnrecognized}
                onChange={(e) => update({ announceUnrecognized: e.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>
                Exigir verbo no comando
                <span className="block font-normal text-[10px] text-slate-400">
                  desligado: aceita “time out” sem dizer “início”
                </span>
              </span>
              <input
                type="checkbox"
                checked={settings.requireVerb}
                onChange={(e) => update({ requireVerb: e.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>
                Confirmar “fim/saída” por voz
                <span className="block font-normal text-[10px] text-slate-400">
                  pede “confirmar” antes de registrar
                </span>
              </span>
              <input
                type="checkbox"
                checked={settings.confirmEndActions}
                onChange={(e) => update({ confirmEndActions: e.target.checked })}
              />
            </label>
            <label className="block text-xs font-bold text-slate-700">
              Tempo de resposta: {(settings.settleMs / 1000).toFixed(1)}s
              <input
                type="range"
                min={700}
                max={2500}
                step={100}
                value={settings.settleMs}
                onChange={(e) => update({ settleMs: Number(e.target.value) })}
                className="mt-1 w-full"
              />
              <span className="block font-normal text-[10px] text-slate-400">
                espera você terminar de falar antes de processar
              </span>
            </label>
            <label className="block text-xs font-bold text-slate-700">
              Sensibilidade: {Math.round(settings.sensitivity * 100)}%
              <input
                type="range"
                min={60}
                max={85}
                value={Math.round(settings.sensitivity * 100)}
                onChange={(e) => update({ sensitivity: Number(e.target.value) / 100 })}
                className="mt-1 w-full"
              />
              <span className="block font-normal text-[10px] text-slate-400">
                menor = aceita mais variações (mais falsos positivos)
              </span>
            </label>

            {/* Ensinar comandos */}
            <div className="pt-2 border-t border-slate-200">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-wide mb-2">
                Ensinar comandos
              </p>
              {settings.customPhrases.length > 0 && (
                <div className="space-y-1 mb-2">
                  {settings.customPhrases.map((cp) => {
                    const stage = stages.find((s) => s.key === cp.stageKey);
                    return (
                      <div
                        key={cp.id}
                        className="flex items-center gap-2 text-[11px] bg-white border border-slate-200 rounded px-2 py-1"
                      >
                        <span className="flex-1 truncate">
                          “{cp.phrase}” → <b>{stage?.label ?? cp.stageKey}</b> · {actionLabelOf(cp.action)}
                        </span>
                        <button
                          type="button"
                          aria-label="Remover"
                          onClick={() =>
                            update({
                              customPhrases: settings.customPhrases.filter((c) => c.id !== cp.id),
                            })
                          }
                          className="text-slate-400 hover:text-red-600"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              <input
                type="text"
                value={npPhrase}
                onChange={(e) => setNpPhrase(e.target.value)}
                placeholder='frase falada, ex.: "começa a cirurgia"'
                className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs mb-1.5"
              />
              <div className="flex gap-1.5">
                <select
                  value={npStage}
                  onChange={(e) => setNpStage(e.target.value)}
                  className="flex-1 min-w-0 px-1.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                >
                  {stages.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <select
                  value={npAction}
                  onChange={(e) => setNpAction(e.target.value as VoiceAction)}
                  className="px-1.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                >
                  {actionsForKind(npStageObj?.kind ?? 'start_end').map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addCustomPhrase}
                  className="px-3 py-1.5 rounded bg-slate-800 text-white text-xs font-bold"
                >
                  +
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => speak('Comando de voz ativo')}
              className="w-full py-1.5 rounded bg-slate-800 text-white text-xs font-bold"
            >
              Testar voz
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
