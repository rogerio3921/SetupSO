import React, { useEffect, useRef, useState } from 'react';
import { Mic, Settings, AlertTriangle, Check } from 'lucide-react';
import { useSpeechRecognition } from '../voice/useSpeechRecognition';
import { speak, estimateSpeechMs } from '../voice/speak';
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

interface VoiceSettings {
  enabled: boolean;
  requireWakeWord: boolean;
  wakeWord: string;
  spokenFeedback: boolean;
  requireVerb: boolean;
  confirmEndActions: boolean;
  sensitivity: number;
}

type ResultStatus = 'ok' | 'blocked' | 'unmatched' | 'room' | 'need-room' | 'confirm';

interface LastResult {
  status: ResultStatus;
  heard: string;
  detail?: string;
  match?: CommandMatch;
  at: number;
}

const STORAGE_KEY = 'setupso:voice:settings';

const DEFAULT_SETTINGS: VoiceSettings = {
  enabled: false,
  requireWakeWord: true,
  wakeWord: 'setup',
  spokenFeedback: true,
  requireVerb: true,
  confirmEndActions: false,
  sensitivity: 0.72,
};

function loadSettings(): VoiceSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<VoiceSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

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
  const [lastResult, setLastResult] = useState<LastResult | null>(null);
  const [ptt, setPtt] = useState(false);

  const suppressRef = useRef(false); // true while our own TTS is playing
  const pttActiveRef = useRef(false);
  const pendingRef = useRef<{ key: string; match: CommandMatch; roomId: string; at: number } | null>(null);
  const lastRunRef = useRef<{ key: string; at: number } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* ignore quota / private mode */
    }
  }, [settings]);

  const update = (patch: Partial<VoiceSettings>) => setSettings((s) => ({ ...s, ...patch }));

  // --- command handling (kept in a ref so the recognizer always calls fresh logic)
  const handleFinalRef = useRef<(alts: string[]) => void>(() => undefined);

  handleFinalRef.current = (alts: string[]) => {
    if (!settings.enabled || suppressRef.current) return;
    const primary = alts[0] ?? '';

    const say = (text: string) => {
      if (!settings.spokenFeedback) return;
      suppressRef.current = true;
      speak(text);
      window.setTimeout(() => {
        suppressRef.current = false;
      }, estimateSpeechMs(text));
    };

    const execute = async (roomId: string, match: CommandMatch) => {
      const key = `${roomId}:${match.stageKey}:${match.action}`;
      lastRunRef.current = { key, at: Date.now() };
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
        say(`${match.stageLabel}, ${match.actionLabel} registrado às ${now.getHours()} e ${now.getMinutes()}`);
      } catch {
        setLastResult({ status: 'blocked', heard: primary, detail: 'Falha ao registrar', match, at: Date.now() });
        say('Falha ao registrar o evento');
      }
    };

    // 1) room switch — "sala 2" (independent of wake word)
    for (const alt of alts) {
      const roomCmd = detectRoomCommand(alt);
      if (!roomCmd) continue;
      const target = findRoomByToken(rooms, roomCmd.query);
      if (target) {
        onSelectRoom(target.id);
        setLastResult({ status: 'room', heard: primary, detail: `Sala ${target.code} selecionada`, at: Date.now() });
        say(`Sala ${target.code} selecionada`);
      } else {
        setLastResult({ status: 'unmatched', heard: primary, detail: `Sala "${roomCmd.query}" não encontrada`, at: Date.now() });
        say('Sala não encontrada');
      }
      return;
    }

    const requireWake = settings.requireWakeWord && !pttActiveRef.current;

    // 2) pending confirmation of an end/out action
    const pending = pendingRef.current;
    if (pending && Date.now() - pending.at < 15000 && alts.some(isAffirmation)) {
      pendingRef.current = null;
      void execute(pending.roomId, pending.match);
      return;
    }

    // 3) parse the command across ASR alternatives
    let match: CommandMatch | null = null;
    let wokeUp = !requireWake;
    for (const alt of alts) {
      let phrase = alt;
      if (requireWake) {
        const w = stripWakeWord(alt, settings.wakeWord);
        if (!w.matched) continue;
        wokeUp = true;
        phrase = w.rest;
      }
      const m = matchCommand(phrase, stages, {
        threshold: settings.sensitivity,
        requireVerb: settings.requireVerb,
      });
      if (m) {
        match = m;
        break;
      }
    }

    if (!match) {
      if (wokeUp) {
        setLastResult({ status: 'unmatched', heard: primary, at: Date.now() });
        say('Não entendi o comando');
      }
      return;
    }

    // 4) resolve which room the command applies to
    const withCase = rooms.filter((r) => r.caseId);
    let target = rooms.find((r) => r.id === selectedRoomId && r.caseId) || null;
    if (!target) {
      if (withCase.length === 1) {
        onSelectRoom(withCase[0].id);
        setLastResult({ status: 'need-room', heard: primary, detail: `Abri a sala ${withCase[0].code}. Repita o comando.`, at: Date.now() });
        say(`Abri a sala ${withCase[0].code}. Repita o comando.`);
        return;
      }
      setLastResult({
        status: 'need-room',
        heard: primary,
        detail: withCase.length === 0 ? 'Nenhuma sala com cirurgia em andamento.' : 'Várias salas ativas. Diga, por exemplo, "sala 2".',
        at: Date.now(),
      });
      say(withCase.length === 0 ? 'Nenhuma sala com cirurgia em andamento' : 'Diga a sala. Por exemplo, sala 2');
      return;
    }

    // 5) validate the transition
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
      say(`${match.actionLabel} de ${match.stageLabel} indisponível`);
      return;
    }

    // 6) debounce identical command
    const key = `${target.id}:${match.stageKey}:${match.action}`;
    if (lastRunRef.current && lastRunRef.current.key === key && Date.now() - lastRunRef.current.at < 8000) {
      return;
    }

    // 7) optional spoken confirmation for end/out
    if (settings.confirmEndActions && (match.action === 'end' || match.action === 'out')) {
      pendingRef.current = { key, match, roomId: target.id, at: Date.now() };
      setLastResult({
        status: 'confirm',
        heard: primary,
        detail: `Confirmar ${match.actionLabel} de ${match.stageLabel}? Diga "confirmar".`,
        match,
        at: Date.now(),
      });
      say(`Confirmar ${match.actionLabel} de ${match.stageLabel}? Diga confirmar.`);
      return;
    }

    void execute(target.id, match);
  };

  const onFinal = useRef((alts: string[]) => handleFinalRef.current(alts)).current;

  const { supported, listening, interim, error, online } = useSpeechRecognition({
    enabled: settings.enabled,
    onFinal,
  });

  // --- derived display values
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
            no computador.
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {error === 'mic-denied' && (
              <div className="flex gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>
                  Permissão de microfone negada. Clique no cadeado ao lado do endereço, permita o
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

            <p className="text-[10px] text-slate-400 leading-relaxed">
              Ex.: <b>“{settings.wakeWord}, início da cirurgia”</b> ·{' '}
              <b>“{settings.wakeWord}, fim anestesia”</b> ·{' '}
              <b>“{settings.wakeWord}, entrada limpeza”</b> · <b>“sala 2”</b>
            </p>
          </div>
        )}

        {/* Settings drawer */}
        {showSettings && supported && (
          <div className="border-t border-slate-200 p-4 space-y-3 bg-slate-50">
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
              Confirmação falada
              <input
                type="checkbox"
                checked={settings.spokenFeedback}
                onChange={(e) => update({ spokenFeedback: e.target.checked })}
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
