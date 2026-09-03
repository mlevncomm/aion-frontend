import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowUp, FileUp, Mic, SlidersHorizontal, Zap } from "lucide-react";
import { liveGlowHandlers } from "@/lib/liveGlow";

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onImport: (fileName: string) => void;
  onTools: () => void;
  onMic: () => void;
  voiceActive?: boolean;
  showProBanner?: boolean;
}

export default function ChatComposer({
  value,
  onChange,
  onSubmit,
  onImport,
  onTools,
  onMic,
  voiceActive = false,
  showProBanner = false,
}: ChatComposerProps) {
  const [toolsOpen, setToolsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) onImport(selectedFile.name);
    event.target.value = "";
  };

  return (
    <form className="composer-wrap" onSubmit={handleSubmit} data-testid="chat-composer-form">
      {showProBanner ? (
        <div className="pro-banner" data-testid="composer-pro-banner">
          <span className="pro-banner-badge" aria-hidden="true">
            <Zap size={12} strokeWidth={2.4} />
          </span>
          <span data-testid="composer-pro-banner-text">Pro ile daha fazla özelliğin kilidini aç</span>
        </div>
      ) : null}
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
          placeholder="AION'a bir şey sor..."
          aria-label="AION'a bir şey sor"
          rows={2}
          data-testid="chat-message-input"
        />
        <div className="composer-toolbar">
          <div className="composer-tools">
            <input
              ref={fileInputRef}
              type="file"
              className="sr-only"
              onChange={handleFileChange}
              data-testid="chat-file-input"
            />
            <button
              type="button"
              className="composer-tool-button"
              onClick={() => fileInputRef.current?.click()}
              data-testid="chat-import-file-button"
            >
              <FileUp size={14} strokeWidth={1.8} aria-hidden="true" />
              <span>Dosya ekle</span>
            </button>
            <div className="tools-popover-wrap">
              <button
                type="button"
                className={`composer-tool-button${toolsOpen ? " is-selected" : ""}`}
                onClick={() => {
                  setToolsOpen((open) => !open);
                  onTools();
                }}
                aria-expanded={toolsOpen}
                data-testid="chat-tools-button"
              >
                <SlidersHorizontal size={14} strokeWidth={1.8} aria-hidden="true" />
                <span>Araçlar</span>
              </button>
              {toolsOpen ? (
                <div className="tools-popover" data-testid="chat-tools-popover">
                  <span className="tools-popover-title" data-testid="chat-tools-popover-title">Araçlar</span>
                  <span data-testid="chat-tools-popover-copy">Sonraki istemin için kullanabileceğin araçları keşfet.</span>
                </div>
              ) : null}
            </div>
          </div>
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
