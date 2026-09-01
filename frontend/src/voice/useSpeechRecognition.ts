import { useCallback, useEffect, useRef, useState } from 'react';

export type SpeechErrorKind = null | 'unsupported' | 'mic-denied' | 'network' | 'unknown';

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
  /**
   * Uma frase falada costuma gerar VÁRIOS resultados finais (o navegador vai
   * "fechando" pedaços). Em vez de disparar `onFinal` para cada pedaço, os
   * pedaços são acumulados e enviados juntos depois de `aggregateMs` de
   * silêncio — assim o comando é processado uma única vez.
   */
  aggregateMs?: number;
  /** Chamado uma vez por enunciado, com frases candidatas (melhor primeiro). */
  onFinal: (candidates: string[]) => void;
}

export function useSpeechRecognition({
  enabled,
  lang = 'pt-BR',
  aggregateMs = 1000,
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
  const aggregateMsRef = useRef(aggregateMs);
  aggregateMsRef.current = aggregateMs;

  // Buffer de agregação de resultados finais.
  const bufferRef = useRef<string[][]>([]);
  const flushTimerRef = useRef<number | null>(null);

  const clearRestartTimer = () => {
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  };

  const clearFlushTimer = () => {
    if (flushTimerRef.current !== null) {
      window.clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  };

  const flushBuffer = useCallback(() => {
    clearFlushTimer();
    const parts = bufferRef.current;
    bufferRef.current = [];
    if (!parts.length) return;

    const combined = parts
      .map((alts) => (alts[0] ?? '').trim())
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    const last = parts[parts.length - 1] ?? [];
    const candidates = Array.from(
      new Set([combined, ...last].map((s) => s.trim()).filter(Boolean)),
    );
    if (candidates.length) onFinalRef.current(candidates);
  }, []);

  const scheduleFlush = useCallback(() => {
    clearFlushTimer();
    flushTimerRef.current = window.setTimeout(flushBuffer, aggregateMsRef.current);
  }, [flushBuffer]);

  const startNow = useCallback(() => {
    if (!wantRef.current || !recRef.current) return;
    try {
      recRef.current.start();
    } catch {
      /* já está rodando — ignora */
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
          if (alts.length) {
            bufferRef.current.push(alts);
            scheduleFlush();
          }
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
        return; // benigno; onend reinicia se ainda quisermos
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
      flushBuffer(); // não perde um enunciado que estava no buffer
      if (!wantRef.current) return;
      scheduleRestart(backoffRef.current || 300);
    };

    return rec;
  }, [Ctor, lang, scheduleFlush, flushBuffer, scheduleRestart]);

  // Liga / desliga.
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
      clearFlushTimer();
      bufferRef.current = [];
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
      clearFlushTimer();
      try {
        recRef.current?.abort();
      } catch {
        /* noop */
      }
    };
  }, [enabled, supported, buildRecognition, startNow]);

  // Conectividade — o Web Speech API precisa de rede.
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

  // Watchdog: alguns navegadores param de emitir eventos silenciosamente.
  useEffect(() => {
    if (!supported || !enabled) return;
    const id = window.setInterval(() => {
      if (!wantRef.current) return;
      if (Date.now() - lastActivityRef.current > 20000) {
        lastActivityRef.current = Date.now();
        try {
          recRef.current?.stop();
        } catch {
          /* onend reagenda */
        }
      }
    }, 8000);
    return () => window.clearInterval(id);
  }, [supported, enabled]);

  return { supported, listening, interim, error, online };
}
