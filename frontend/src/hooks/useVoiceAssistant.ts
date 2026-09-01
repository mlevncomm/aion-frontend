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
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [continuousEnabled, setContinuousEnabled] = useState(false);
  const [muted, setMuted] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState("");
  const recognitionSupported = getRecognitionConstructor() !== null;

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
        document.documentElement.style.setProperty("--voice-scale", (1 + level * 0.075).toFixed(3));
        document.documentElement.style.setProperty("--voice-level", level.toFixed(3));
        document.documentElement.style.setProperty("--voice-bar-scale", (0.22 + level * 1.35).toFixed(3));
        meterFrameRef.current = window.requestAnimationFrame(updateMeter);
      };
      updateMeter();
    } catch {
      setError("Mikrofon seviyesi okunamadı. Tarayıcı iznini kontrol edebilirsin.");
    } finally {
      meterStartingRef.current = false;
    }
  }, []);

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

  const speak = useCallback((text: string) => {
    pausedForResponseRef.current = true;
    stopRecognition();
    if (!("speechSynthesis" in window)) {
      setStatus("idle");
      pausedForResponseRef.current = false;
      if (continuousEnabledRef.current && !mutedRef.current) launchRecognitionRef.current();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "tr-TR";
    utterance.rate = 0.96;
    utterance.pitch = 0.94;
    const turkishVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith("tr"));
    if (turkishVoice) utterance.voice = turkishVoice;
    utterance.onstart = () => setStatus("speaking");
    utterance.onend = () => {
      pausedForResponseRef.current = false;
      if (continuousEnabledRef.current && !mutedRef.current) launchRecognitionRef.current();
      else setStatus(mutedRef.current ? "muted" : "idle");
    };
    utterance.onerror = () => {
      pausedForResponseRef.current = false;
      setStatus("error");
    };
    window.speechSynthesis.speak(utterance);
  }, [stopRecognition]);

  const markProcessing = useCallback(() => {
    pausedForResponseRef.current = true;
    stopRecognition();
    setStatus("processing");
  }, [stopRecognition]);
  const consumeTranscript = useCallback(() => setTranscript(""), []);

  useEffect(() => () => {
    continuousEnabledRef.current = false;
    if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current);
    recognitionRef.current?.abort();
    window.speechSynthesis?.cancel();
    stopAudioMeter();
  }, [stopAudioMeter]);

  return {
    activateContinuous,
    consumeTranscript,
    continuousEnabled,
    muted,
    error,
    interimTranscript,
    markProcessing,
    recognitionSupported,
    speak,
    status,
    toggleMute,
    transcript,
  };
}