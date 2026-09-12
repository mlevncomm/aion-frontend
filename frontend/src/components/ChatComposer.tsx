import { type FormEvent } from "react";
import { ArrowUp, Mic } from "lucide-react";
import { liveGlowHandlers } from "@/lib/liveGlow";

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onImport: (fileName: string) => void;
  onTools: () => void;
  onMic: () => void;
  voiceActive?: boolean;
}

export default function ChatComposer({
  value,
  onChange,
  onSubmit,
  onMic,
  voiceActive = false,
}: ChatComposerProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form className="composer-wrap" onSubmit={handleSubmit} data-testid="chat-composer-form">
      <div className="composer-panel live-glow-surface" {...liveGlowHandlers}>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSubmit();
            }
          }}
          className="composer-input"
          placeholder="AION'a bir şey yaz..."
          aria-label="AION'a bir şey yaz"
          rows={2}
          data-testid="chat-message-input"
        />
        <div className="composer-toolbar">
          <span className="composer-hint">Enter gönderir · Shift + Enter yeni satır</span>
          <div className="composer-actions">
            <button
              type="button"
              className={`icon-action-button${voiceActive ? " is-listening" : ""}`}
              onClick={onMic}
              aria-label="Sesli giriş kullan"
              aria-pressed={voiceActive}
              data-testid="chat-microphone-button"
            >
              <Mic size={15} strokeWidth={1.8} aria-hidden="true" />
            </button>
            <button
              type="submit"
              className="send-button"
              aria-label="Mesajı gönder"
              disabled={!value.trim()}
              data-testid="chat-send-button"
            >
              <ArrowUp size={19} strokeWidth={2.3} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
