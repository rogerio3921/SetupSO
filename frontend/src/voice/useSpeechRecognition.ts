import { useCallback, useEffect, useRef, useState } from 'react';

export type SpeechErrorKind =
  | null
  | 'unsupported'
  | 'mic-denied'
  | 'network'
  | 'unknown';

export interface SpeechRecognitionState {
  supported: boolean;
  listening: boolean;
  interim: string;
  error: SpeechErrorKind;
  online: boolean;
}

export interface UseSpeechRecognitionArgs {
  enabled: boolean;
  lang?: string;
  /** Called for every finalized utterance, with the ranked alternatives. */
  onFinal: (alternatives: string[]) => void;
}

/**
 * Long-running wrapper around the Web Speech API tuned for an always-on
 * "listen for a command" use case:
 *  - continuous, restarts itself when the browser ends the session (~60s)
 *  - exponential backoff on `network` errors, cleared on the next result
 *  - a watchdog that force-restarts if the engine goes silent
 *  - stops (and does not loop) when the user denies microphone access
 */
export function useSpeechRecognition({
  enabled,
  lang = 'pt-BR',
  onFinal,
}: UseSpeechRecognitionArgs): SpeechRecognitionState {
  const Ctor =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : undefined;
  const supported = Boolean(Ctor);

  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<SpeechErrorKind>(supported ? null : 'unsupported');
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  const recRef = useRef<SpeechRecognition | null>(null);
  const wantRef = useRef(false);
  const backoffRef = useRef(0);
  const restartTimerRef = useRef<number | null>(null);
  const lastActivityRef = useRef(Date.now());
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  const clearRestartTimer = () => {
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  };

  const startNow = useCallback(() => {
    if (!wantRef.current || !recRef.current) return;
    try {
      recRef.current.start();
    } catch {
      /* start() throws if it is already running — safe to ignore */
    }
  }, []);

  const scheduleRestart = useCallback(
    (delay: number) => {
      clearRestartTimer();
      restartTimerRef.current = window.setTimeout(startNow, delay);
    },
    [startNow],
  );

  const buildRecognition = useCallback((): SpeechRecognition | null => {
    if (!Ctor) return null;
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 3;

    rec.onstart = () => {
      setListening(true);
      lastActivityRef.current = Date.now();
    };

    rec.onspeechstart = () => {
      lastActivityRef.current = Date.now();
    };

    rec.onresult = (ev: SpeechRecognitionEvent) => {
      lastActivityRef.current = Date.now();
      backoffRef.current = 0;
      setError((prev) => (prev === 'network' ? null : prev));

      let interimStr = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const result = ev.results[i];
        if (result.isFinal) {
          const alts: string[] = [];
          for (let j = 0; j < result.length; j++) {
            const t = result[j]?.transcript;
            if (t) alts.push(t);
          }
          if (alts.length) onFinalRef.current(alts);
        } else {
          interimStr += result[0]?.transcript ?? '';
        }
      }
      setInterim(interimStr);
    };

    rec.onerror = (ev: SpeechRecognitionErrorEvent) => {
      const kind = ev.error;
      if (kind === 'not-allowed' || kind === 'service-not-allowed') {
        wantRef.current = false;
        clearRestartTimer();
        setError('mic-denied');
        setListening(false);
        return;
      }
      if (kind === 'no-speech' || kind === 'aborted') {
        return; // benign; onend will restart if still wanted
      }
      if (kind === 'network') {
        setError('network');
        backoffRef.current = Math.min((backoffRef.current || 500) * 2, 10000);
        return;
      }
      setError('unknown');
    };

    rec.onend = () => {
      setListening(false);
      setInterim('');
      if (!wantRef.current) return;
      scheduleRestart(backoffRef.current || 300);
    };

    return rec;
  }, [Ctor, lang, scheduleRestart]);

  // Enable / disable lifecycle.
  useEffect(() => {
    if (!supported) return;

    if (enabled) {
      wantRef.current = true;
      backoffRef.current = 0;
      setError((prev) => (prev === 'mic-denied' || prev === 'unknown' ? null : prev));
      if (!recRef.current) recRef.current = buildRecognition();
      lastActivityRef.current = Date.now();
      startNow();
    } else {
      wantRef.current = false;
      clearRestartTimer();
      try {
        recRef.current?.stop();
      } catch {
        /* noop */
      }
      setListening(false);
      setInterim('');
    }

    return () => {
      wantRef.current = false;
      clearRestartTimer();
      try {
        recRef.current?.abort();
      } catch {
        /* noop */
      }
    };
  }, [enabled, supported, buildRecognition, startNow]);

  // Track connectivity — the Web Speech API needs a network round-trip.
  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      backoffRef.current = 0;
      setError((prev) => (prev === 'network' ? null : prev));
      if (wantRef.current) scheduleRestart(200);
    };
    const goOffline = () => {
      setOnline(false);
      setError('network');
    };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [scheduleRestart]);

  // Watchdog: some browsers silently stop emitting events. If we should be
  // listening but nothing has happened for a while, force a restart cycle.
  useEffect(() => {
    if (!supported || !enabled) return;
    const id = window.setInterval(() => {
      if (!wantRef.current) return;
      if (Date.now() - lastActivityRef.current > 20000) {
        lastActivityRef.current = Date.now();
        try {
          recRef.current?.stop();
        } catch {
          /* onend will reschedule */
        }
      }
    }, 8000);
    return () => window.clearInterval(id);
  }, [supported, enabled]);

  return { supported, listening, interim, error, online };
}
