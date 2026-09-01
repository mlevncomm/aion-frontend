import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceStatus = "idle" | "listening" | "processing" | "speaking" | "unsupported" | "error";

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
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState("");
  const recognitionSupported = getRecognitionConstructor() !== null;

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setInterimTranscript("");
    setStatus("idle");
  }, []);

  const startListening = useCallback(() => {
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
    recognition.continuous = false;
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
        setTranscript(completed.trim());
        setInterimTranscript("");
        setStatus("processing");
      }
    };
    recognition.onerror = (event) => {
      setError(errorMessages[event.error] ?? "Sesli giriş başlatılamadı. Lütfen yeniden dene.");
      setStatus("error");
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setStatus((current) => (current === "listening" ? "idle" : current));
    };
    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setStatus("error");
      setError("Mikrofon şu anda kullanılamıyor. Lütfen yeniden dene.");
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (status === "listening") stopListening();
    else startListening();
  }, [startListening, status, stopListening]);

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) {
      setStatus("idle");
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
    utterance.onend = () => setStatus("idle");
    utterance.onerror = () => setStatus("error");
    window.speechSynthesis.speak(utterance);
  }, []);

  const markProcessing = useCallback(() => setStatus("processing"), []);
  const consumeTranscript = useCallback(() => setTranscript(""), []);

  useEffect(() => () => {
    recognitionRef.current?.abort();
    window.speechSynthesis?.cancel();
  }, []);

  return {
    consumeTranscript,
    error,
    interimTranscript,
    markProcessing,
    recognitionSupported,
    speak,
    status,
    toggleListening,
    transcript,
  };
}