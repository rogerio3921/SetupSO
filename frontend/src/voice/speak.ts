// Text-to-speech helper (pt-BR) com fila: nunca sobrepõe uma fala na outra.

let ptVoice: SpeechSynthesisVoice | null = null;
let voicesLoaded = false;

function loadVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return;
  ptVoice =
    voices.find((v) => /pt[-_]br/i.test(v.lang)) ||
    voices.find((v) => /^pt/i.test(v.lang)) ||
    null;
  voicesLoaded = true;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Estimativa de duração de uma fala (ms) — usada como rede de segurança. */
export function estimateSpeechMs(text: string): number {
  return Math.max(900, Math.round(text.length * 68) + 500);
}

interface SpeakOpts {
  rate?: number;
  pitch?: number;
  volume?: number;
  onEnd?: () => void;
}

const queue: Array<{ text: string; opts: SpeakOpts }> = [];
let active = false;

function pump() {
  if (active || !ttsSupported()) return;
  const item = queue.shift();
  if (!item) return;
  active = true;

  let finished = false;
  const done = () => {
    if (finished) return;
    finished = true;
    active = false;
    try {
      item.opts.onEnd?.();
    } catch {
      /* ignore */
    }
    pump();
  };

  try {
    if (!voicesLoaded) loadVoices();
    const utter = new SpeechSynthesisUtterance(item.text);
    utter.lang = 'pt-BR';
    if (ptVoice) utter.voice = ptVoice;
    utter.rate = item.opts.rate ?? 1.05;
    utter.pitch = item.opts.pitch ?? 1;
    utter.volume = item.opts.volume ?? 1;
    utter.onend = done;
    utter.onerror = done;
    window.speechSynthesis.speak(utter);
    // Alguns motores nunca disparam onend.
    window.setTimeout(() => {
      if (active && !finished) done();
    }, estimateSpeechMs(item.text) + 2000);
  } catch {
    done();
  }
}

/** Enfileira uma fala. Não interrompe o que já está tocando. */
export function speak(text: string, opts: SpeakOpts = {}): void {
  if (!ttsSupported() || !text) return;
  queue.push({ text, opts });
  pump();
}

export function isSpeaking(): boolean {
  return active || queue.length > 0;
}

export function cancelSpeech(): void {
  queue.length = 0;
  active = false;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}
