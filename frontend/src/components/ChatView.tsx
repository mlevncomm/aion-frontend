import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowUp,
  Check,
  Copy,
  Loader2,
  Menu,
  Mic,
  PenSquare,
  ShieldCheck,
  Square,
  Volume2,
  Wrench,
  XCircle,
} from "lucide-react";
import type { VoiceStatus } from "@/hooks/useVoiceAssistant";
import type { AionApprovalDecision, AionApprovalRequest, AionTurnStep } from "@/lib/aionApi";
import { Markdown } from "@/lib/markdown";

export interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
  error?: boolean;
}

interface ChatViewProps {
  messages: ChatMessage[];
  draft: string;
  isProcessing: boolean;
  steps: AionTurnStep[];
  pendingApproval: AionApprovalRequest | null;
  voiceStatus: VoiceStatus;
  voiceError: string;
  interimTranscript: string;
  ownerName: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onSuggestion: (prompt: string) => void;
  onResolveApproval: (decision: AionApprovalDecision) => void;
  onSpeakMessage: (text: string) => void;
  onStopSpeaking: () => void;
  onMic: () => void;
  onNewChat: () => void;
  onOpenMenu: () => void;
}

const TOOL_LABELS: Record<string, string> = {
  search_web: "Web'de arıyor",
  "search-web": "Web'de arıyor",
  social_post: "Buffer'a gönderiyor",
  post_image: "Görsel üretiyor",
  AionStatus: "Sistem durumunu okuyor",
  AionTask: "Görevleri güncelliyor",
  AionDevice: "Cihaza komut gönderiyor",
  AionRemember: "Hafızaya kaydediyor",
  "wiki-recall": "Hafızadan hatırlıyor",
  "wiki-page-read": "Notları okuyor",
  "awareness-snapshot": "Durumu gözden geçiriyor",
  Read: "Dosya okuyor",
  Write: "Dosya yazıyor",
  Edit: "Dosya düzenliyor",
  Ls: "Klasöre bakıyor",
  Glob: "Dosya arıyor",
  Grep: "İçerik arıyor",
  RunCommand: "Komut çalıştırıyor",
};

function toolLabel(name: string): string {
  return TOOL_LABELS[name] ?? name.replace(/[_-]+/g, " ");
}

function approvalDetail(request: AionApprovalRequest): string {
  const input = request.input;
  if (request.name === "AionDevice" && input.action === "command") {
    if (input.command === "open_url") return `Tarayıcıda aç: ${String(input.url || "URL")}`;
    if (input.command === "open_app") return `Uygulama aç: ${String(input.app || "uygulama")}`;
    if (input.command === "notify") return `Bildirim gönder: ${String(input.text || "AION bildirimi")}`;
    return "Eşleşmiş cihazda bir komut çalıştır.";
  }
  if (request.name === "AionRemember") return "Bu bilgiyi AION'un kalıcı hafızasına kaydet.";
  if (request.name === "post_image") return `Marka görseli üret: “${String(input.title || "")}”`;
  if (request.name === "social_post") {
    const channels = Array.isArray(input.channels) ? input.channels.join(", ") : "kanal";
    return `Buffer'a taslak olarak ekle (${channels}). Yayınlanmaz; son kararı Buffer'da sen verirsin.`;
  }
  return request.summary || `${request.name} işlemini çalıştır.`;
}

const SUGGESTIONS: Array<{ title: string; hint: string; prompt: string }> = [
  { title: "Günlük brief", hint: "Değişiklikler, uyarılar ve sıradaki öncelik", prompt: "AION, bugün neler olduğunu gerçek kaynaklardan özetle: değişiklikler, uyarılar, bekleyen işler ve sıradaki öncelik." },
  { title: "Sistem sağlığı", hint: "VPS ve servisler yolunda mı?", prompt: "AION, VPS ve kritik servislerin durumunu kontrol et. Sorun varsa açıkça söyle." },
  { title: "Projelerim", hint: "Bugün odaklanmam gereken tek iş", prompt: "AION, projelerimin durumunu kontrol et ve bugün odaklanmam gereken tek işi söyle." },
  { title: "LinkedIn postu", hint: "Görselli tanıtım postu, Buffer'a taslak", prompt: "Wexon.dev LinkedIn sayfası için marka görselli bir tanıtım postu hazırla ve Buffer'a taslak olarak koy." },
];

const voiceLabels: Record<VoiceStatus, string> = {
  idle: "Hazır",
  listening: "Seni dinliyorum",
  processing: "Düşünüyor",
  speaking: "Konuşuyor",
  muted: "Mikrofon kapalı",
  unsupported: "Yazılı mod",
  error: "Mikrofon beklemede",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="ch-msg-action"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1400);
        }).catch(() => undefined);
      }}
      aria-label="Yanıtı kopyala"
      title="Kopyala"
    >
      {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
    </button>
  );
}

export default function ChatView({
  messages,
  draft,
  isProcessing,
  steps,
  pendingApproval,
  voiceStatus,
  voiceError,
  interimTranscript,
  ownerName,
  onChange,
  onSubmit,
  onSuggestion,
  onResolveApproval,
  onSpeakMessage,
  onStopSpeaking,
  onMic,
  onNewChat,
  onOpenMenu,
}: ChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottomRef = useRef(true);

  // Follow new output only while the owner is already at the bottom; reading
  // an older answer must not be yanked away by the next poll.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottomRef.current) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, steps, pendingApproval, isProcessing, interimTranscript]);

  // Auto-grow the composer up to a comfortable ceiling.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [draft]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    stickToBottomRef.current = true;
    onSubmit();
  };

  const conversation = messages.filter((m) => m.id !== "welcome");
  const isEmpty = conversation.length === 0 && !isProcessing;
  const statusText = pendingApproval
    ? "Onayını bekliyor"
    : isProcessing
      ? steps.some((s) => !s.done) ? toolLabel(steps.filter((s) => !s.done).at(-1)!.name) : "Düşünüyor"
      : voiceLabels[voiceStatus];

  return (
    <section className="ch" aria-label="AION sohbet" data-testid="conversation-panel">
      <header className="ch-head">
        <button type="button" className="ch-icon-btn ch-menu" onClick={onOpenMenu} aria-label="Menüyü aç" data-testid="mobile-menu-button">
          <Menu size={20} aria-hidden="true" />
        </button>
        <div className="ch-title">
          <h1 data-testid="conversation-title">AION</h1>
          <p className={`ch-status is-${isProcessing ? "busy" : voiceStatus}`} data-testid="conversation-voice-status">
            <span className="ch-status-dot" aria-hidden="true" />
            {statusText}
          </p>
        </div>
        <div className="ch-head-actions">
          {voiceStatus === "speaking" ? (
            <button type="button" className="ch-icon-btn" onClick={onStopSpeaking} aria-label="Sesi durdur" title="Sesi durdur">
              <Square size={15} aria-hidden="true" />
            </button>
          ) : null}
          <button type="button" className="ch-icon-btn" onClick={onNewChat} aria-label="Yeni sohbet" title="Yeni sohbet" data-testid="conversation-new-chat-button">
            <PenSquare size={18} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="ch-scroll" ref={scrollRef} data-testid="conversation-message-list">
        <div className="ch-column">
          {isEmpty ? (
            <div className="ch-empty">
              <span className="ch-empty-orb" aria-hidden="true" />
              <h2>Merhaba {ownerName}, ne yapalım?</h2>
              <p>Sistemin, projelerin ve görevlerin hakkında gerçek kaynaklardan yanıt veririm. Riskli işlemlerden önce hep onayını alırım.</p>
              <div className="ch-suggestions">
                {SUGGESTIONS.map((s) => (
                  <button key={s.title} type="button" className="ch-suggestion" onClick={() => onSuggestion(s.prompt)}>
                    <strong>{s.title}</strong>
                    <span>{s.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {conversation.map((message) => (
            message.role === "user" ? (
              <div key={message.id} className="ch-msg is-user" data-testid="sent-message-preview">
                <div className="ch-bubble">{message.text}</div>
              </div>
            ) : (
              <div key={message.id} className={`ch-msg is-assistant${message.error ? " is-error" : ""}`} data-testid={`conversation-message-${message.id}`}>
                <span className="ch-avatar" aria-hidden="true" />
                <div className="ch-answer">
                  <Markdown text={message.text} />
                  {!message.error ? (
                    <div className="ch-msg-actions">
                      <CopyButton text={message.text} />
                      <button type="button" className="ch-msg-action" onClick={() => onSpeakMessage(message.text)} aria-label="Sesli oku" title="Sesli oku">
                        <Volume2 size={14} aria-hidden="true" />
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            )
          ))}

          {pendingApproval ? (
            <div className="ch-approval" data-testid="conversation-approval-card">
              <div className="ch-approval-head">
                <ShieldCheck size={18} aria-hidden="true" />
                <strong>Onayın gerekiyor</strong>
              </div>
              <p>{approvalDetail(pendingApproval)}</p>
              <div className="ch-approval-actions">
                <button type="button" className="ch-btn" onClick={() => onResolveApproval("deny")} data-testid="conversation-approval-deny">Reddet</button>
                <button type="button" className="ch-btn is-primary" onClick={() => onResolveApproval("allow")} data-testid="conversation-approval-allow">Onayla</button>
              </div>
            </div>
          ) : isProcessing ? (
            <div className="ch-msg is-assistant is-thinking" data-testid="conversation-processing-indicator">
              <span className="ch-avatar is-busy" aria-hidden="true" />
              <div className="ch-answer">
                {steps.length > 0 ? (
                  <ul className="ch-steps">
                    {steps.map((step) => (
                      <li key={step.id} className={step.done ? (step.failed ? "is-failed" : "is-done") : "is-running"}>
                        {step.done ? (step.failed ? <XCircle size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />) : <Loader2 size={14} className="ch-spin" aria-hidden="true" />}
                        {toolLabel(step.name)}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <span className="ch-typing" aria-label="AION düşünüyor"><i /><i /><i /></span>
              </div>
            </div>
          ) : null}

          {interimTranscript ? <p className="ch-interim" data-testid="interim-transcript">“{interimTranscript}”</p> : null}
          {voiceError ? <p className="ch-voice-error" data-testid="voice-error">{voiceError}</p> : null}
        </div>
      </div>

      <form className="ch-composer" onSubmit={handleSubmit} data-testid="chat-composer-form">
        <div className="ch-composer-box">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                stickToBottomRef.current = true;
                onSubmit();
              }
            }}
            placeholder="AION'a yaz…"
            aria-label="AION'a mesaj yaz"
            rows={1}
            data-testid="chat-message-input"
          />
          <div className="ch-composer-actions">
            <button
              type="button"
              className={`ch-icon-btn ch-mic${voiceStatus === "listening" ? " is-listening" : ""}`}
              onClick={onMic}
              aria-label="Sesli konuş"
              aria-pressed={voiceStatus === "listening"}
              data-testid="chat-microphone-button"
            >
              <Mic size={18} aria-hidden="true" />
            </button>
            <button type="submit" className="ch-send" aria-label="Gönder" disabled={!draft.trim()} data-testid="chat-send-button">
              <ArrowUp size={18} strokeWidth={2.4} aria-hidden="true" />
            </button>
          </div>
        </div>
        <p className="ch-foot">
          <Wrench size={11} aria-hidden="true" /> AION araç kullanabilir; dışarıya dokunan her işlem senin onayınla yapılır.
        </p>
      </form>
    </section>
  );
}
