// Text-to-speech helper (pt-BR) used for spoken confirmations.

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

/** Rough estimate of how long an utterance takes (ms) — used to mute the
 *  microphone handler while the app is talking, so it does not hear itself. */
export function estimateSpeechMs(text: string): number {
  return Math.max(900, Math.round(text.length * 68) + 500);
}

export function speak(text: string, opts: { rate?: number; pitch?: number; volume?: number } = {}): void {
  if (!ttsSupported() || !text) return;
  try {
    if (!voicesLoaded) loadVoices();
    const synth = window.speechSynthesis;
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'pt-BR';
    if (ptVoice) utter.voice = ptVoice;
    utter.rate = opts.rate ?? 1.05;
    utter.pitch = opts.pitch ?? 1;
    utter.volume = opts.volume ?? 1;
    synth.speak(utter);
  } catch {
    /* ignore synthesis failures */
  }
}
