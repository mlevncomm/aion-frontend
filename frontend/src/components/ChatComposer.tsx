import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowUp, FileUp, Mic, SlidersHorizontal, WandSparkles } from "lucide-react";

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onImport: (fileName: string) => void;
  onTools: () => void;
  onMic: () => void;
}

export default function ChatComposer({
  value,
  onChange,
  onSubmit,
  onImport,
  onTools,
  onMic,
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
      <div className="pro-banner" data-testid="pro-banner">
        <WandSparkles size={14} strokeWidth={2.2} aria-hidden="true" />
        <span data-testid="pro-banner-text">Unlock more features with Pro</span>
      </div>
      <div className="composer-panel">
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
          placeholder="Ask me anything ..."
          aria-label="Ask LIX anything"
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
              <span>Import file</span>
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
                <span>Tools</span>
              </button>
              {toolsOpen ? (
                <div className="tools-popover" data-testid="chat-tools-popover">
                  <span className="tools-popover-title" data-testid="chat-tools-popover-title">Tools</span>
                  <span data-testid="chat-tools-popover-copy">Browse actions for your next prompt.</span>
                </div>
              ) : null}
            </div>
          </div>
          <div className="composer-actions">
            <button
              type="button"
              className="icon-action-button"
              onClick={onMic}
              aria-label="Use voice input"
              data-testid="chat-microphone-button"
            >
              <Mic size={15} strokeWidth={1.8} aria-hidden="true" />
            </button>
            <button
              type="submit"
              className="send-button"
              aria-label="Send message"
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