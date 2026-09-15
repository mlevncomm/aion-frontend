import { useEffect, useMemo, useRef } from "react";
import { AudioLines, Bot, Menu, Plus, ShieldCheck, Volume2, X } from "lucide-react";
import ChatComposer from "@/components/ChatComposer";
import type { VoiceStatus } from "@/hooks/useVoiceAssistant";
import type { AionApprovalDecision, AionApprovalRequest } from "@/lib/aionApi";

export interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
}

interface ConversationPanelProps {
  draft: string;
  interimTranscript: string;
  messages: ChatMessage[];
  pendingApproval?: AionApprovalRequest | null;
  isProcessing: boolean;
  onSpeakMessage?: (text: string) => void;
  onResolveApproval?: (decision: AionApprovalDecision) => void;
  onChange: (value: string) => void;
  onClose: () => void;
  onMic: () => void;
  onNewChat: () => void;
  /** Mobile only: the full-screen panel covers the top bar, so navigation
      needs its own way in from here. */
  onOpenMenu?: () => void;
  onSubmit: () => void;
  open: boolean;
  voiceError: string;
  voiceStatus: VoiceStatus;
}

const voiceLabels: Record<VoiceStatus, string> = {
  idle: "Hazır",
  listening: "Seni dinliyorum",
  processing: "Düşünüyorum",
  speaking: "Yanıtlıyorum",
  muted: "Mikrofon susturuldu",
  unsupported: "Yazılı mod",
  error: "Mikrofon beklemede",
};

function approvalDetail(request: AionApprovalRequest): string {
  const input = request.input;
  if (request.name === "AionDevice" && input.action === "command") {
    if (input.command === "open_url") return `Tarayıcıda aç: ${String(input.url || "URL")}`;
    if (input.command === "open_app") return `Uygulama aç: ${String(input.app || "uygulama")}`;
    if (input.command === "notify") return `Bildirim gönder: ${String(input.text || "AION bildirimi")}`;
    return "Eşleşmiş cihazda bir komut çalıştır.";
  }
  if (request.name === "AionRemember") return "Bu bilgiyi AION'un kalıcı proje hafızasına kaydet.";
  return request.summary || `${request.name} işlemini çalıştır.`;
}

export default function ConversationPanel({
  draft,
  interimTranscript,
  messages,
  pendingApproval,
  isProcessing,
  onResolveApproval,
  onSpeakMessage,
  onChange,
  onClose,
  onMic,
  onNewChat,
  onOpenMenu,
  onSubmit,
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

  const effectiveVoiceStatus: VoiceStatus = !isProcessing && voiceStatus === "processing" ? "idle" : voiceStatus;

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
          {onOpenMenu ? (
            <button
              type="button"
              className="conversation-menu"
              onClick={onOpenMenu}
              aria-label="Menüyü aç"
              data-testid="conversation-menu-button"
            >
              <Menu size={18} aria-hidden="true" />
            </button>
          ) : null}
          <div className="conversation-heading">
            <span className={`conversation-voice-dot is-${effectiveVoiceStatus}`} aria-hidden="true"><AudioLines size={15} /></span>
            <div>
              <h2 id="conversation-title" data-testid="conversation-title">AION ile sohbet</h2>
              <p data-testid="conversation-voice-status">{pendingApproval ? "Onayını bekliyorum" : isProcessing ? "Düşünüyorum" : voiceLabels[effectiveVoiceStatus]}</p>
            </div>
          </div>
          <div className="conversation-header-actions">
            <button
              type="button"
              className="conversation-close"
              onClick={onNewChat}
              aria-label="Yeni sohbet başlat"
              title="Yeni sohbet"
              data-testid="conversation-new-chat-button"
            >
              <Plus size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="conversation-close"
              onClick={onClose}
              aria-label="Sohbeti kapat"
              data-testid="conversation-close-button"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
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
              <div className="conversation-message-body">
                <p>{message.text}</p>
                {message.role === "assistant" && onSpeakMessage ? (
                  <button
                    type="button"
                    className="conversation-speak-button"
                    onClick={() => onSpeakMessage(message.text)}
                    aria-label="Bu yanıtı seslendir"
                    title="Sesi oynat"
                  >
                    <Volume2 size={14} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </div>
          ))}
          {pendingApproval ? (
            <div className="conversation-approval" data-testid="conversation-approval-card">
              <div className="conversation-approval-copy">
                <span className="conversation-approval-icon" aria-hidden="true"><ShieldCheck size={17} /></span>
                <div>
                  <strong>Onay gerekiyor</strong>
                  <p>{approvalDetail(pendingApproval)}</p>
                </div>
              </div>
              <div className="conversation-approval-actions">
                <button type="button" onClick={() => onResolveApproval?.("deny")} data-testid="conversation-approval-deny">Reddet</button>
                <button type="button" className="is-primary" onClick={() => onResolveApproval?.("allow")} data-testid="conversation-approval-allow">Onayla ve devam et</button>
              </div>
            </div>
          ) : isProcessing ? (
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
          onMic={onMic}
        />
      </section>
    </div>
  );
}