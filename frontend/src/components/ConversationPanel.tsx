import { useEffect, useMemo, useRef } from "react";
import { AudioLines, Bot, X } from "lucide-react";
import ChatComposer from "@/components/ChatComposer";
import type { VoiceStatus } from "@/hooks/useVoiceAssistant";

export interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
}

interface ConversationPanelProps {
  draft: string;
  interimTranscript: string;
  messages: ChatMessage[];
  onChange: (value: string) => void;
  onClose: () => void;
  onImport: (fileName: string) => void;
  onMic: () => void;
  onSubmit: () => void;
  onTools: () => void;
  open: boolean;
  voiceError: string;
  voiceStatus: VoiceStatus;
}

const voiceLabels: Record<VoiceStatus, string> = {
  idle: "Hazır",
  listening: "Seni dinliyorum",
  processing: "Düşünüyorum",
  speaking: "Yanıtlıyorum",
  unsupported: "Yazılı mod",
  error: "Mikrofon beklemede",
};

export default function ConversationPanel({
  draft,
  interimTranscript,
  messages,
  onChange,
  onClose,
  onImport,
  onMic,
  onSubmit,
  onTools,
  open,
  voiceError,
  voiceStatus,
}: ConversationPanelProps) {
  const messageEndRef = useRef<HTMLDivElement>(null);
  const latestUserMessageId = useMemo(
    () => [...messages].reverse().find((message) => message.role === "user")?.id,
    [messages],
  );

  useEffect(() => {
    if (!open) return;
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [messages, onClose, open, voiceStatus]);

  if (!open) return null;

  return (
    <div className="conversation-layer" data-testid="conversation-layer">
      <button
        type="button"
        className="conversation-backdrop"
        onClick={onClose}
        aria-label="Sohbeti kapat"
        data-testid="conversation-backdrop"
      />
      <section className="conversation-panel" role="dialog" aria-modal="true" aria-labelledby="conversation-title" data-testid="conversation-panel">
        <div className="conversation-handle" aria-hidden="true" />
        <header className="conversation-header">
          <div className="conversation-heading">
            <span className={`conversation-voice-dot is-${voiceStatus}`} aria-hidden="true"><AudioLines size={15} /></span>
            <div>
              <h2 id="conversation-title" data-testid="conversation-title">AION ile sohbet</h2>
              <p data-testid="conversation-voice-status">{voiceLabels[voiceStatus]}</p>
            </div>
          </div>
          <button
            type="button"
            className="conversation-close"
            onClick={onClose}
            aria-label="Sohbeti kapat"
            data-testid="conversation-close-button"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="conversation-messages" data-testid="conversation-message-list">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`conversation-message is-${message.role}`}
              data-testid={message.id === latestUserMessageId ? "sent-message-preview" : `conversation-message-${message.id}`}
            >
              <span className="conversation-message-avatar" aria-hidden="true">
                {message.role === "assistant" ? <Bot size={15} /> : "M"}
              </span>
              <p>{message.text}</p>
            </div>
          ))}
          {voiceStatus === "processing" ? (
            <div className="conversation-message is-assistant is-typing" data-testid="conversation-processing-indicator">
              <span className="conversation-message-avatar" aria-hidden="true"><Bot size={15} /></span>
              <span className="typing-dots" aria-label="AION düşünüyor"><i /><i /><i /></span>
            </div>
          ) : null}
          {interimTranscript ? (
            <p className="interim-transcript" data-testid="interim-transcript">“{interimTranscript}”</p>
          ) : null}
          {voiceError ? <p className="voice-error" data-testid="voice-error">{voiceError}</p> : null}
          <div ref={messageEndRef} />
        </div>

        <ChatComposer
          value={draft}
          voiceActive={voiceStatus === "listening"}
          onChange={onChange}
          onSubmit={onSubmit}
          onImport={onImport}
          onTools={onTools}
          onMic={onMic}
        />
      </section>
    </div>
  );
}