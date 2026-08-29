// Intent parsing for voice commands.
//
// Input: a raw transcript string ("SetupSO, início da cirurgia").
// Output: { stageKey, action } that maps 1:1 onto the timeline buttons in
// SetupSala (recordEvent / handleStageAction).

export interface GrammarStage {
  key: string;
  label: string;
  kind: 'start_end' | 'in_out';
}

export type VoiceAction = 'start' | 'end' | 'in' | 'out';

export interface CommandMatch {
  stageKey: string;
  stageLabel: string;
  action: VoiceAction;
  actionLabel: string; // "início" | "fim" | "entrada" | "saída"
  score: number; // 0..1 confidence of the phrase match
}

export interface RoomCommand {
  kind: 'room';
  query: string; // normalized room token, e.g. "2" or "b"
}

const START_VERBS = [
  'inicio', 'iniciar', 'iniciada', 'iniciado', 'inicia', 'iniciamos', 'iniciei',
  'comecar', 'comeca', 'comecou', 'comeco', 'abrir', 'abre', 'abriu', 'partiu', 'start',
];
const END_VERBS = [
  'fim', 'finalizar', 'finalizada', 'finalizado', 'finaliza', 'terminar', 'termina',
  'terminou', 'encerrar', 'encerra', 'encerrou', 'acabou', 'acabar', 'concluir',
  'conclui', 'concluida', 'concluido', 'fechar', 'fecha', 'fechou', 'stop',
];
const IN_VERBS = ['entrada', 'entrou', 'entra', 'entrar', 'chegou', 'chegada', 'chega'];
const OUT_VERBS = ['saida', 'saiu', 'sai', 'sair', 'saindo'];

const ALL_VERBS = new Set<string>([...START_VERBS, ...END_VERBS, ...IN_VERBS, ...OUT_VERBS]);

// Extra spoken forms per stage key, on top of the server-provided label.
const STAGE_ALIASES: Record<string, string[]> = {
  transport_patient: ['transporte', 'transporte paciente', 'transporte do paciente', 'transportar paciente'],
  admission_cc: ['admissao', 'admissao pre cc', 'pre cc', 'pre operatorio', 'admissao no pre cc'],
  patient_in_or: [
    'paciente em so', 'paciente na sala', 'paciente na so', 'paciente em sala',
    'paciente sala operatoria', 'paciente em sala operatoria', 'paciente na sala operatoria',
  ],
  anesthesia_team: ['equipe anestesica', 'equipe anestesia', 'equipe de anestesia', 'anestesista'],
  surgical_team: ['equipe cirurgica', 'equipe cirurgia', 'equipe de cirurgia'],
  anesthesia: ['anestesia'],
  positioning: ['posicionamento', 'posicionar paciente', 'posicionar o paciente'],
  time_out: ['time out', 'timeout', 'pausa cirurgica', 'checklist cirurgico', 'tempo out'],
  surgery: ['cirurgia', 'operacao', 'procedimento cirurgico', 'a cirurgia'],
  cme: ['cme', 'central de material', 'central de materiais'],
  cleaning: ['limpeza', 'higienizacao', 'higiene da sala', 'limpeza da sala', 'limpeza terminal'],
  pharmacy: ['farmacia'],
  clinical_engineering: ['engenharia clinica', 'eng clinica', 'engenharia'],
  rpa: ['rpa', 'recuperacao pos anestesica', 'sala de recuperacao', 'sala de recuperacao pos anestesica'],
  room_setup: ['montagem sala', 'montagem da sala', 'preparo da sala', 'setup da sala', 'montar sala', 'arrumar sala'],
};

const STOP_WORDS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'no', 'na', 'nos', 'nas', 'a', 'o', 'os', 'as',
  'e', 'em', 'pra', 'para', 'ao', 'the', 'um', 'uma',
]);

const NUMBER_WORDS: Record<string, string> = {
  zero: '0', um: '1', uma: '1', dois: '2', duas: '2', tres: '3', quatro: '4',
  cinco: '5', seis: '6', sete: '7', oito: '8', nove: '9', dez: '10',
  onze: '11', doze: '12', treze: '13', quatorze: '14', catorze: '14', quinze: '15',
};

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** normalize + drop filler words, so "equipe de anestesia" === "equipe anestesia". */
function canon(text: string): string {
  return normalize(text)
    .split(' ')
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t))
    .join(' ');
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(
        prev[j] + 1,
        prev[j - 1] + 1,
        diag + (a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1),
      );
      diag = tmp;
    }
  }
  return prev[n];
}

function similarity(a: string, b: string): number {
  if (!a.length && !b.length) return 1;
  if (!a.length || !b.length) return 0;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}

/** Best similarity of `alias` against the phrase as a whole or any token window. */
function phraseSimilarity(phrase: string, alias: string): number {
  const pTok = phrase.split(' ').filter(Boolean);
  const aTok = alias.split(' ').filter(Boolean);
  if (!pTok.length || !aTok.length) return 0;

  let best = similarity(phrase, alias);

  for (const w of [aTok.length, aTok.length + 1, aTok.length - 1]) {
    if (w <= 0 || w > pTok.length) continue;
    for (let i = 0; i + w <= pTok.length; i++) {
      best = Math.max(best, similarity(pTok.slice(i, i + w).join(' '), alias));
    }
  }

  const aSet = new Set(aTok);
  const overlap = pTok.filter((t) => aSet.has(t)).length / aTok.length;
  best = Math.max(best, overlap * 0.94);

  return best;
}

function detectActionGroup(tokens: string[]): 'start' | 'end' | 'in' | 'out' | null {
  const has = (list: string[]) => tokens.some((t) => list.includes(t));
  if (has(END_VERBS)) return 'end';
  if (has(OUT_VERBS)) return 'out';
  if (has(IN_VERBS)) return 'in';
  if (has(START_VERBS)) return 'start';
  return null;
}

const ACTION_LABEL: Record<VoiceAction, string> = {
  start: 'início',
  end: 'fim',
  in: 'entrada',
  out: 'saída',
};

export interface MatchOptions {
  threshold?: number; // minimum phrase score, default 0.72
  requireVerb?: boolean; // if false, a bare stage name counts as start/in
}

/** Try to read "sala 2" / "sala b" out of the transcript. */
export function detectRoomCommand(rawText: string): RoomCommand | null {
  const norm = normalize(rawText);
  const m = norm.match(/\bsala\s+([a-z0-9]+)\b/);
  if (!m) return null;
  const raw = m[1];
  return { kind: 'room', query: NUMBER_WORDS[raw] || raw };
}

export function matchCommand(
  rawText: string,
  stages: GrammarStage[],
  opts: MatchOptions = {},
): CommandMatch | null {
  const threshold = opts.threshold ?? 0.72;
  const requireVerb = opts.requireVerb ?? true;

  const norm = normalize(rawText);
  if (!norm || !stages.length) return null;

  const tokens = norm.split(' ');
  let group = detectActionGroup(tokens);
  if (!group) {
    if (requireVerb) return null;
    group = 'start';
  }

  const subject = canon(norm)
    .split(' ')
    .filter((t) => !ALL_VERBS.has(t))
    .join(' ');
  if (!subject) return null;

  let best: { stage: GrammarStage; score: number } | null = null;
  for (const stage of stages) {
    const aliases = [canon(stage.label), ...(STAGE_ALIASES[stage.key] || []).map(canon)].filter(Boolean);
    let score = 0;
    for (const alias of aliases) score = Math.max(score, phraseSimilarity(subject, alias));
    if (!best || score > best.score) best = { stage, score };
  }
  if (!best || best.score < threshold) return null;

  let action: VoiceAction;
  if (best.stage.kind === 'start_end') {
    action = group === 'end' || group === 'out' ? 'end' : 'start';
  } else {
    action = group === 'end' || group === 'out' ? 'out' : 'in';
  }

  return {
    stageKey: best.stage.key,
    stageLabel: best.stage.label,
    action,
    actionLabel: ACTION_LABEL[action],
    score: Number(best.score.toFixed(2)),
  };
}

/** Detect and remove a leading wake word. Fuzzy, to tolerate ASR noise
 *  ("setup", "setups o", "set up", "setup só"). */
export function stripWakeWord(rawText: string, wake: string): { matched: boolean; rest: string } {
  const norm = normalize(rawText);
  const wakeNorm = normalize(wake);
  if (!wakeNorm) return { matched: true, rest: norm };

  const wTok = wakeNorm.split(' ');
  const pTok = norm.split(' ');
  const wakeJoined = wakeNorm.replace(/\s/g, '');

  if (pTok.length >= wTok.length) {
    const head = pTok.slice(0, wTok.length).join(' ');
    if (similarity(head, wakeNorm) >= 0.6 || head.replace(/\s/g, '').includes(wakeJoined)) {
      return { matched: true, rest: pTok.slice(wTok.length).join(' ') };
    }
  }
  if (pTok.length >= 1 && similarity(pTok[0], wakeJoined) >= 0.6) {
    return { matched: true, rest: pTok.slice(1).join(' ') };
  }
  if (pTok.length >= 2 && similarity(`${pTok[0]}${pTok[1]}`, wakeJoined) >= 0.7) {
    return { matched: true, rest: pTok.slice(2).join(' ') };
  }
  return { matched: false, rest: norm };
}

/** Was the transcript an explicit confirmation ("confirmar", "sim", "pode registrar")? */
export function isAffirmation(rawText: string): boolean {
  const norm = normalize(rawText);
  return /\b(confirmar|confirma|confirmado|sim|isso|pode|correto|positivo|ok)\b/.test(norm);
}
