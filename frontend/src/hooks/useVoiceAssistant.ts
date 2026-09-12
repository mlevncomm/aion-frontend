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

export function useVoiceAssistant() {
  const recognitionRef = useRef<RecognitionInstance | null>(null);
  const launchRecognitionRef = useRef<() => void>(() => undefined);
  const continuousEnabledRef = useRef(false);
  const mutedRef = useRef(false);
  const pausedForResponseRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
    let capturedFinal = false;
    recognition.lang = "tr-TR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onstart = () => setStatus("listening");
    recognition.onresult = (event) => {
      let completed = "";
      let interim = "";
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result?.[0]?.transcript ?? "";
        if (result?.isFinal) completed += text;
        else interim += text;
      }
      setInterimTranscript(interim.trim());
      if (completed.trim()) {
        capturedFinal = true;
        pausedForResponseRef.current = true;
        setTranscript(completed.trim());
        setInterimTranscript("");
        setStatus("processing");
      }
    };
    recognition.onerror = (event) => {
      setError(errorMessages[event.error] ?? "Sesli giriş başlatılamadı. Lütfen yeniden dene.");
      setStatus("error");
      if (event.error === "not-allowed") {
        continuousEnabledRef.current = false;
        setContinuousEnabled(false);
      }
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      if (continuousEnabledRef.current && !mutedRef.current && !pausedForResponseRef.current && !capturedFinal) {
        restartTimerRef.current = window.setTimeout(() => launchRecognitionRef.current(), 650);
      }
    };
    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setStatus("error");
      setError("Mikrofon şu anda kullanılamıyor. Lütfen yeniden dene.");
    }
  }, []);

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
      setMuted(false);
      setStatus("idle");
      void startAudioMeter();
      launchRecognitionRef.current();
      return;
    }
    mutedRef.current = true;
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

    const resumeAfterSpeech = () => {
      stopSpeakingMeter();
      pausedForResponseRef.current = false;
      if (continuousEnabledRef.current && !mutedRef.current) {
        void startAudioMeter();
        launchRecognitionRef.current();
      } else {
        setStatus(mutedRef.current ? "muted" : "idle");
      }
    };

    try {
      const audio = await speakWithAion(text);
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

    if (!("speechSynthesis" in window)) {
      setError("Sesli yanıt oynatılamadı. Yazılı yanıt kullanılabilir.");
      setStatus("error");
      pausedForResponseRef.current = false;
      return;
    }

    await new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "tr-TR";
      utterance.rate = 0.96;
      utterance.pitch = 0.94;
      const turkishVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith("tr"));
      if (turkishVoice) utterance.voice = turkishVoice;
      utterance.onstart = () => {
        setStatus("speaking");
        startSpeakingMeter();
      };
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
    resumeAfterSpeech();
  }, [startAudioMeter, startPlaybackMeter, startSpeakingMeter, stopAudioMeter, stopRecognition, stopSpeakingMeter]);

  const markProcessing = useCallback(() => {
    pausedForResponseRef.current = true;
    stopRecognition();
    setStatus("processing");
  }, [stopRecognition]);

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