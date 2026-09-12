import { speakWithAion } from "@/lib/aionApi";
import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceStatus = "idle" | "listening" | "processing" | "speaking" | "muted" | "unsupported" | "error";

interface RecognitionAlternativeLike {
  transcript: string;
}

interface RecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: RecognitionAlternativeLike;
}

interface RecognitionEventLike extends Event {
  resultIndex?: number;
  results: {
    length: number;
    [index: number]: RecognitionResultLike;
  };
}

interface RecognitionErrorLike extends Event {
  error: string;
}

interface RecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onerror: ((event: RecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type RecognitionConstructor = new () => RecognitionInstance;

type VoiceWindow = Window & {
  SpeechRecognition?: RecognitionConstructor;
  webkitSpeechRecognition?: RecognitionConstructor;
  webkitAudioContext?: typeof AudioContext;
};

function getRecognitionConstructor(): RecognitionConstructor | null {
  const voiceWindow = window as VoiceWindow;
  return voiceWindow.SpeechRecognition ?? voiceWindow.webkitSpeechRecognition ?? null;
}

const errorMessages: Record<string, string> = {
  "not-allowed": "Mikrofon izni verilmedi. Tarayıcı ayarlarından erişime izin verebilirsin.",
  "no-speech": "Ses algılanamadı. Hazır olduğunda yeniden deneyebilirsin.",
  network: "Ses tanıma servisine ulaşılamadı.",
};

const VOICE_TURN_SILENCE_MS = 850;
const RECOGNITION_RESTART_MS = 180;

function prepareSpeechText(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/[*_#>~]+/g, " ")
    .replace(/\s*[:;]\s*/g, ", ")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/([,.!?])(?=\S)/g, "$1 ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitSpeechChunks(text: string, maxChars = 170): string[] {
  const sentences = text
    .split(/(?<=[.!?…])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (!sentences.length) return text.trim() ? [text.trim()] : [];

  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (current) chunks.push(current);
    if (sentence.length <= maxChars) {
      current = sentence;
      continue;
    }
    const pieces = sentence.split(/(?<=[,])\s+/);
    current = "";
    for (const piece of pieces) {
      const next = current ? `${current} ${piece}` : piece;
      if (next.length <= maxChars) current = next;
      else {
        if (current) chunks.push(current);
        current = piece;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function speechPauseMs(chunk: string): number {
  if (/[!?…]$/.test(chunk)) return 145;
  if (/\.$/.test(chunk)) return 110;
  return 75;
}

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

function preferredTurkishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const turkish = voices.filter((voice) => voice.lang.toLowerCase().startsWith("tr"));
  if (!turkish.length) return null;

  const score = (voice: SpeechSynthesisVoice) => {
    const name = voice.name.toLocaleLowerCase("tr-TR");
    let value = 0;
    // Windows/Edge often exposes Emel as the most natural Turkish feminine voice.
    if (/emel/.test(name)) value += 140;
    if (/female|woman|feminine|kadın/.test(name)) value += 90;
    if (/natural|neural/.test(name)) value += 85;
    if (/online|premium/.test(name)) value += 35;
    if (/microsoft/.test(name)) value += 25;
    if (/google/.test(name)) value += 12;
    if (/tolga|male|man|masculine|erkek/.test(name)) value -= 120;
    // Online/neural voices are preferred even when they are not local.
    if (voice.localService && !/natural|neural/.test(name)) value -= 3;
    return value;
  };

  return [...turkish].sort((a, b) => score(b) - score(a))[0] ?? null;
}

async function waitForSpeechVoices(): Promise<SpeechSynthesisVoice[]> {
  const synthesis = window.speechSynthesis;
  const immediate = synthesis.getVoices();
  if (immediate.length) return immediate;

  return new Promise((resolve) => {
    const done = () => {
      window.clearTimeout(timeout);
      synthesis.removeEventListener("voiceschanged", done);
      resolve(synthesis.getVoices());
    };
    const timeout = window.setTimeout(done, 900);
    synthesis.addEventListener("voiceschanged", done, { once: true });
  });
}

export function useVoiceAssistant() {
  const recognitionRef = useRef<RecognitionInstance | null>(null);
  const launchRecognitionRef = useRef<() => void>(() => undefined);
  const continuousEnabledRef = useRef(false);
  const mutedRef = useRef(false);
  const pausedForResponseRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);
  const voiceTurnTimerRef = useRef<number | null>(null);
  const finalTranscriptRef = useRef("");
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const meterFrameRef = useRef<number | null>(null);
  const meterStartingRef = useRef(false);
  const speakMeterRef = useRef<number | null>(null);
  const playbackRef = useRef<HTMLAudioElement | null>(null);
  const playbackAudioContextRef = useRef<AudioContext | null>(null);
  const playbackSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [continuousEnabled, setContinuousEnabled] = useState(false);
  const [muted, setMuted] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState("");
  const recognitionSupported = getRecognitionConstructor() !== null;

  const applyLevel = useCallback((rawLevel: number) => {
    const level = Math.min(1, Math.max(0, rawLevel));
    document.documentElement.style.setProperty("--voice-scale", (1 + level * 0.14).toFixed(3));
    document.documentElement.style.setProperty("--voice-level", level.toFixed(3));
    document.documentElement.style.setProperty("--voice-bar-scale", (0.22 + level * 1.5).toFixed(3));
  }, []);

  const stopAudioMeter = useCallback(() => {
    if (meterFrameRef.current !== null) window.cancelAnimationFrame(meterFrameRef.current);
    meterFrameRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    if (audioContextRef.current) void audioContextRef.current.close();
    audioContextRef.current = null;
    meterStartingRef.current = false;
    document.documentElement.style.setProperty("--voice-scale", "1");
    document.documentElement.style.setProperty("--voice-level", "0");
    document.documentElement.style.setProperty("--voice-bar-scale", "0.22");
  }, []);

  const startAudioMeter = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || mediaStreamRef.current || meterStartingRef.current) return;
    meterStartingRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      if (mutedRef.current || !continuousEnabledRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        meterStartingRef.current = false;
        return;
      }
      const voiceWindow = window as VoiceWindow;
      const AudioContextConstructor = window.AudioContext ?? voiceWindow.webkitAudioContext;
      if (!AudioContextConstructor) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const audioContext = new AudioContextConstructor();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.78;
      audioContext.createMediaStreamSource(stream).connect(analyser);
      const samples = new Uint8Array(analyser.frequencyBinCount);
      mediaStreamRef.current = stream;
      audioContextRef.current = audioContext;
      const updateMeter = () => {
        analyser.getByteTimeDomainData(samples);
        let energy = 0;
        for (const sample of samples) {
          const normalized = (sample - 128) / 128;
          energy += normalized * normalized;
        }
        const level = Math.min(1, Math.sqrt(energy / samples.length) * 4.6);
        applyLevel(level);
        meterFrameRef.current = window.requestAnimationFrame(updateMeter);
      };
      updateMeter();
    } catch {
      setError("Mikrofon seviyesi okunamadı. Tarayıcı iznini kontrol edebilirsin.");
    } finally {
      meterStartingRef.current = false;
    }
  }, [applyLevel]);

  const stopSpeakingMeter = useCallback(() => {
    if (speakMeterRef.current !== null) window.cancelAnimationFrame(speakMeterRef.current);
    speakMeterRef.current = null;
    try {
      playbackSourceRef.current?.disconnect();
    } catch {
      // The node may already be disconnected when playback ends.
    }
    playbackSourceRef.current = null;
    if (playbackAudioContextRef.current) void playbackAudioContextRef.current.close();
    playbackAudioContextRef.current = null;
    document.documentElement.style.setProperty("--voice-scale", "1");
    document.documentElement.style.setProperty("--voice-level", "0");
    document.documentElement.style.setProperty("--voice-bar-scale", "0.22");
  }, []);

  // Browser speechSynthesis canlı genlik sağlamaz; yalnız fallback yolunda
  // konuşma temposunu taklit eden sentetik bir zarf kullanırız.
  const startSpeakingMeter = useCallback(() => {
    if (speakMeterRef.current !== null) return;
    const start = performance.now();
    const tick = () => {
      const t = (performance.now() - start) / 1000;
      const syllable = 0.5 + 0.5 * Math.sin(t * 12.5);
      const wobble = 0.5 + 0.5 * Math.sin(t * 3.1 + 1.2);
      const gate = Math.sin(t * 1.9) > -0.4 ? 1 : 0.12;
      const jitter = Math.random() * 0.3;
      applyLevel((syllable * 0.5 + wobble * 0.2 + jitter * 0.4) * gate);
      speakMeterRef.current = window.requestAnimationFrame(tick);
    };
    tick();
  }, [applyLevel]);

  // AION'un VPS'ten gelen WAV/TTS sesini Web Audio API ile gerçekten ölçeriz.
  // Böylece orb, sentetik bir zamanlayıcıya değil, oynayan sesin gerçek enerjisine tepki verir.
  const startPlaybackMeter = useCallback(async (audio: HTMLAudioElement) => {
    stopSpeakingMeter();
    const voiceWindow = window as VoiceWindow;
    const AudioContextConstructor = window.AudioContext ?? voiceWindow.webkitAudioContext;
    if (!AudioContextConstructor) {
      startSpeakingMeter();
      return;
    }

    try {
      const context = new AudioContextConstructor();
      const source = context.createMediaElementSource(audio);
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.72;
      source.connect(analyser);
      analyser.connect(context.destination);
      playbackAudioContextRef.current = context;
      playbackSourceRef.current = source;
      if (context.state === "suspended") await context.resume();

      const samples = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(samples);
        let energy = 0;
        for (const sample of samples) {
          const normalized = (sample - 128) / 128;
          energy += normalized * normalized;
        }
        const level = Math.min(1, Math.sqrt(energy / samples.length) * 5.2);
        applyLevel(level);
        speakMeterRef.current = window.requestAnimationFrame(tick);
      };
      tick();
    } catch {
      stopSpeakingMeter();
      startSpeakingMeter();
    }
  }, [applyLevel, startSpeakingMeter, stopSpeakingMeter]);

  const stopRecognition = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setInterimTranscript("");
  }, []);

  const finalizeVoiceTurn = useCallback(() => {
    const finalText = finalTranscriptRef.current.replace(/\s+/g, " ").trim();
    if (!finalText || pausedForResponseRef.current) return;
    if (voiceTurnTimerRef.current !== null) window.clearTimeout(voiceTurnTimerRef.current);
    voiceTurnTimerRef.current = null;
    finalTranscriptRef.current = "";
    pausedForResponseRef.current = true;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setInterimTranscript("");
    setTranscript(finalText);
    setStatus("processing");
  }, []);

  const launchRecognition = useCallback(() => {
    if (!continuousEnabledRef.current || mutedRef.current || pausedForResponseRef.current || recognitionRef.current) return;
    const Recognition = getRecognitionConstructor();
    if (!Recognition) {
      setStatus("unsupported");
      setError("Bu tarayıcı sesli girişi desteklemiyor. Yazılı sohbeti kullanabilirsin.");
      return;
    }

    window.speechSynthesis?.cancel();
    setError("");
    const recognition = new Recognition();
    recognition.lang = "tr-TR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onstart = () => setStatus("listening");
    recognition.onresult = (event) => {
      const completed: string[] = [];
      const interim: string[] = [];
      const startIndex = Math.max(0, event.resultIndex ?? 0);
      for (let index = startIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result?.[0]?.transcript?.trim() ?? "";
        if (!text) continue;
        if (result?.isFinal) completed.push(text);
        else interim.push(text);
      }

      if (interim.length) {
        setInterimTranscript(interim.join(" "));
        if (voiceTurnTimerRef.current !== null) {
          window.clearTimeout(voiceTurnTimerRef.current);
          voiceTurnTimerRef.current = null;
        }
      }

      if (completed.length) {
        finalTranscriptRef.current = `${finalTranscriptRef.current} ${completed.join(" ")}`.trim();
        setInterimTranscript(interim.join(" "));
        if (voiceTurnTimerRef.current !== null) window.clearTimeout(voiceTurnTimerRef.current);
        if (!interim.length) {
          voiceTurnTimerRef.current = window.setTimeout(finalizeVoiceTurn, VOICE_TURN_SILENCE_MS);
        }
      }
    };
    recognition.onerror = (event) => {
      if (event.error === "aborted") return;
      if (event.error === "no-speech") {
        setError("");
        setStatus("listening");
        return;
      }
      setError(errorMessages[event.error] ?? "Sesli giriş başlatılamadı. Lütfen yeniden dene.");
      setStatus("error");
      if (event.error === "not-allowed") {
        continuousEnabledRef.current = false;
        setContinuousEnabled(false);
      }
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      if (!continuousEnabledRef.current || mutedRef.current || pausedForResponseRef.current) return;
      if (finalTranscriptRef.current.trim()) {
        if (voiceTurnTimerRef.current !== null) window.clearTimeout(voiceTurnTimerRef.current);
        voiceTurnTimerRef.current = window.setTimeout(finalizeVoiceTurn, 260);
        return;
      }
      restartTimerRef.current = window.setTimeout(() => launchRecognitionRef.current(), RECOGNITION_RESTART_MS);
    };
    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setStatus("error");
      setError("Mikrofon şu anda kullanılamıyor. Lütfen yeniden dene.");
    }
  }, [finalizeVoiceTurn]);

  launchRecognitionRef.current = launchRecognition;

  const activateContinuous = useCallback(() => {
    if (!getRecognitionConstructor()) {
      setStatus("unsupported");
      setError("Bu tarayıcı sürekli sesli girişi desteklemiyor. Chat üzerinden devam edebilirsin.");
      return;
    }
    continuousEnabledRef.current = true;
    mutedRef.current = false;
    pausedForResponseRef.current = false;
    finalTranscriptRef.current = "";
    if (voiceTurnTimerRef.current !== null) window.clearTimeout(voiceTurnTimerRef.current);
    voiceTurnTimerRef.current = null;
    setContinuousEnabled(true);
    setMuted(false);
    void startAudioMeter();
    launchRecognitionRef.current();
  }, [startAudioMeter]);

  const toggleMute = useCallback(() => {
    if (!continuousEnabledRef.current) {
      activateContinuous();
      return;
    }
    if (mutedRef.current) {
      mutedRef.current = false;
      pausedForResponseRef.current = false;
      finalTranscriptRef.current = "";
      setMuted(false);
      setStatus("idle");
      void startAudioMeter();
      launchRecognitionRef.current();
      return;
    }
    mutedRef.current = true;
    finalTranscriptRef.current = "";
    if (voiceTurnTimerRef.current !== null) window.clearTimeout(voiceTurnTimerRef.current);
    voiceTurnTimerRef.current = null;
    setMuted(true);
    stopRecognition();
    stopAudioMeter();
    setStatus("muted");
  }, [activateContinuous, startAudioMeter, stopAudioMeter, stopRecognition]);

  const speak = useCallback(async (text: string) => {
    pausedForResponseRef.current = true;
    stopRecognition();
    stopAudioMeter();
    playbackRef.current?.pause();
    playbackRef.current = null;
    window.speechSynthesis?.cancel();

    const speechText = prepareSpeechText(text) || text.trim();
    const resumeAfterSpeech = () => {
      stopSpeakingMeter();
      pausedForResponseRef.current = false;
      if (continuousEnabledRef.current && !mutedRef.current) {
        void startAudioMeter();
        restartTimerRef.current = window.setTimeout(
          () => launchRecognitionRef.current(),
          RECOGNITION_RESTART_MS,
        );
      } else {
        setStatus(mutedRef.current ? "muted" : "idle");
      }
    };

    // Prefer the device's Turkish system voice when a strong Turkish voice is
    // available (Edge/Windows commonly exposes a Natural/Neural female voice).
    // This is keyless and usually more fluid than the single local Piper voice.
    if ("speechSynthesis" in window && typeof SpeechSynthesisUtterance === "function") {
      try {
        const voices = await waitForSpeechVoices();
        const turkishVoice = preferredTurkishVoice(voices);
        if (turkishVoice) {
          const chunks = splitSpeechChunks(speechText);
          const natural = /natural|neural|online/i.test(turkishVoice.name);
          const feminine = /emel|female|woman|feminine|kadın/i.test(turkishVoice.name);
          for (let index = 0; index < chunks.length; index += 1) {
            const chunk = chunks[index];
            await new Promise<void>((resolve) => {
              const utterance = new SpeechSynthesisUtterance(chunk);
              utterance.lang = "tr-TR";
              utterance.voice = turkishVoice;
              // Keep the cadence close to normal conversation. Questions get a
              // tiny lift; long declarative chunks slow down just enough to breathe.
              const questionLift = /\?$/.test(chunk) ? 0.015 : 0;
              const longSentenceEase = chunk.length > 120 ? -0.015 : 0;
              utterance.rate = (natural ? 1.0 : 0.96) + questionLift + longSentenceEase;
              utterance.pitch = feminine ? 1.02 : 1.0;
              utterance.volume = 1;
              utterance.onstart = () => {
                setStatus("speaking");
                if (index === 0) startSpeakingMeter();
              };
              utterance.onend = () => resolve();
              utterance.onerror = () => resolve();
              window.speechSynthesis.speak(utterance);
            });
            if (index < chunks.length - 1) await sleep(speechPauseMs(chunk));
          }
          resumeAfterSpeech();
          return;
        }
      } catch {
        // The deterministic VPS voice below remains the no-browser-voice fallback.
      }
    }

    try {
      const audio = await speakWithAion(speechText);
      playbackRef.current = audio;
      await new Promise<void>((resolve, reject) => {
        audio.addEventListener("play", () => {
          setStatus("speaking");
          void startPlaybackMeter(audio);
        }, { once: true });
        audio.addEventListener("ended", () => resolve(), { once: true });
        audio.addEventListener("error", () => reject(new Error("AION ses dosyası oynatılamadı.")), { once: true });
        void audio.play().catch(reject);
      });
      playbackRef.current = null;
      resumeAfterSpeech();
      return;
    } catch {
      playbackRef.current = null;
    }

    setError("Sesli yanıt oynatılamadı. Yazılı yanıt kullanılabilir.");
    setStatus("error");
    pausedForResponseRef.current = false;
  }, [startAudioMeter, startPlaybackMeter, startSpeakingMeter, stopAudioMeter, stopRecognition, stopSpeakingMeter]);

  const markProcessing = useCallback(() => {
    pausedForResponseRef.current = true;
    if (voiceTurnTimerRef.current !== null) window.clearTimeout(voiceTurnTimerRef.current);
    voiceTurnTimerRef.current = null;
    stopRecognition();
    stopAudioMeter();
    setStatus("processing");
  }, [stopAudioMeter, stopRecognition]);

  const markIdle = useCallback(() => {
    pausedForResponseRef.current = false;
    stopSpeakingMeter();
    setStatus(mutedRef.current ? "muted" : "idle");
    if (continuousEnabledRef.current && !mutedRef.current) {
      void startAudioMeter();
      launchRecognitionRef.current();
    }
  }, [startAudioMeter, stopSpeakingMeter]);

  const consumeTranscript = useCallback(() => setTranscript(""), []);

  useEffect(() => () => {
    continuousEnabledRef.current = false;
    if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current);
    if (voiceTurnTimerRef.current !== null) window.clearTimeout(voiceTurnTimerRef.current);
    finalTranscriptRef.current = "";
    recognitionRef.current?.abort();
    playbackRef.current?.pause();
    playbackRef.current = null;
    window.speechSynthesis?.cancel();
    stopSpeakingMeter();
    stopAudioMeter();
  }, [stopAudioMeter, stopSpeakingMeter]);

  return {
    activateContinuous,
    consumeTranscript,
    continuousEnabled,
    muted,
    error,
    interimTranscript,
    markIdle,
    markProcessing,
    recognitionSupported,
    speak,
    status,
    toggleMute,
    transcript,
  };
}