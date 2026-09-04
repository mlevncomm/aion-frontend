import { useCallback, useEffect, useState } from "react";
import { AudioLines, Menu, MessageCircle, Mic, MicOff, Workflow } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AutomationsPanel from "@/components/AutomationsPanel";
import ConversationPanel, { type ChatMessage } from "@/components/ConversationPanel";
import OrbAvatar from "@/components/OrbAvatar";
import QuickActions from "@/components/QuickActions";
import Sidebar from "@/components/Sidebar";
import ThemePicker from "@/components/ThemePicker";
import { endFrontendSession } from "@/lib/frontendAuth";
import { useVoiceAssistant, type VoiceStatus } from "@/hooks/useVoiceAssistant";
import { useHermesChat } from "@/hooks/useHermesChat";

const quickPrompts: Record<string, string> = {
  surprise: "Bugün için beni şaşırtacak yaratıcı bir fikir ver",
  create: "Şu fikirden bir görsel oluştur: ",
  summarise: "Bunu benim için özetle: ",
};

const sectionNames: Record<string, string> = {
  discover: "Keşfet",
  inbox: "Gelen Kutusu",
  library: "Arşiv",
  settings: "Ayarlar",
  logout: "Çıkış",
  profile: "Profil",
};

const initialMessages: ChatMessage[] = [
  { id: "welcome", role: "assistant", text: "Merhaba Mehmet. Buradayım; konuşabilir veya yazabilirsin." },
];

const voiceStatusText: Record<VoiceStatus, string> = {
  idle: "Konuşmak için dokun",
  listening: "Seni dinliyorum",
  processing: "Düşünüyorum...",
  speaking: "AION yanıtlıyor",
  muted: "Mikrofon susturuldu",
  unsupported: "Yazılı sohbeti kullan",
  error: "Mikrofonu yeniden dene",
};


export default function Home() {
  const navigate = useNavigate();
  const [activeItem, setActiveItem] = useState("home");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [statusNote, setStatusNote] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [automationsOpen, setAutomationsOpen] = useState(false);
  const voice = useVoiceAssistant();
  const { isSending, assistantText, send, connect } = useHermesChat();

  useEffect(() => {
    connect();
  }, [connect]);

  const handleSidebarSelect = (item: string) => {
    setActiveItem(item);
    setMobileMenuOpen(false);
    setSettingsOpen(false);
    if (item !== "home") setStatusNote(`${sectionNames[item] ?? item} seçildi`);
  };

  const submitPrompt = useCallback((prompt: string) => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      setStatusNote("Başlamak için bir mesaj yaz");
      return;
    }
    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: "user", text: trimmedPrompt };
    setMessages((current) => [...current, userMessage]);
    setMessage("");
    send(trimmedPrompt);
    setStatusNote("AION yanıtını hazırlıyor");
  }, [send]);

  const handleSubmit = () => {
    if (message.trim()) submitPrompt(message);
  };

  useEffect(() => {
    if (!voice.transcript) return;
    setChatOpen(true);
    submitPrompt(voice.transcript);
    voice.consumeTranscript();
  }, [submitPrompt, voice.consumeTranscript, voice.transcript]);

  useEffect(() => {
    if (assistantText && !isSending) {
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", text: assistantText }]);
    }
  }, [assistantText, isSending]);

  const openChat = () => {
    setMobileMenuOpen(false);
    setSettingsOpen(false);
    setAutomationsOpen(false);
    setChatOpen(true);
  };

  const handleQuickAction = (id: string) => {
    setMessage(quickPrompts[id] ?? "");
    openChat();
    setStatusNote("İstem mesajına eklendi");
  };

  const handleLogout = () => {
    setMobileMenuOpen(false);
    setSettingsOpen(false);
    setAutomationsOpen(false);
    setChatOpen(false);
    endFrontendSession();
    navigate("/giris", { replace: true });
  };

  const handleSettings = () => {
    setMobileMenuOpen(false);
    setAutomationsOpen(false);
    setChatOpen(false);
    setSettingsOpen((open) => !open);
  };

  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  const handleVoicePrimary = () => {
    if (!voice.recognitionSupported) {
      voice.activateContinuous();
      openChat();
      return;
    }
    if (voice.muted) {
      openChat();
      return;
    }
    if (!voice.continuousEnabled) {
      voice.activateContinuous();
      setStatusNote("Sürekli dinleme başlatılıyor");
      return;
    }
    openChat();
  };

  const handleMute = () => {
    if (!voice.recognitionSupported) {
      voice.activateContinuous();
      openChat();
      return;
    }
    voice.toggleMute();
    setStatusNote(voice.muted ? "Mikrofon yeniden açılıyor" : "Mikrofon susturuldu");
  };

  const orbActivity = voice.status === "listening"
    ? "listening"
    : voice.status === "speaking"
      ? "speaking"
      : isSending || voice.status === "processing"
        ? "sending"
        : message.trim()
          ? "typing"
          : "idle";

  return (
    <div className="assistant-stage">
      <div className="ambient-light ambient-light-one" aria-hidden="true" />
      <div className="ambient-light ambient-light-two" aria-hidden="true" />
      <main className="assistant-shell" data-testid="assistant-home-screen">
        {mobileMenuOpen ? (
          <button
            type="button"
            className="mobile-sidebar-backdrop"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Menüyü kapat"
            data-testid="mobile-sidebar-backdrop"
          />
        ) : null}
        <Sidebar
          activeItem={activeItem}
          mobileOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          onLogout={handleLogout}
          onSettings={handleSettings}
          onSelect={handleSidebarSelect}
          settingsOpen={settingsOpen}
        />
        <ThemePicker
          open={settingsOpen}
          onClose={closeSettings}
          onThemeChange={(themeLabel) => setStatusNote(`${themeLabel} teması etkinleştirildi`)}
        />
        <section className="assistant-content" aria-label="AION asistan ana sayfası">
          <div className="content-wash" aria-hidden="true" />
          <header className="mobile-topbar" data-testid="mobile-topbar">
            <button
              type="button"
              className="mobile-menu-button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Menüyü aç"
              aria-expanded={mobileMenuOpen}
              data-testid="mobile-menu-button"
            >
              <Menu size={21} aria-hidden="true" />
            </button>
            <span className="mobile-brand" data-testid="mobile-brand">AION</span>
            <button
              type="button"
              className="mobile-menu-button"
              onClick={() => setAutomationsOpen(true)}
              aria-label="Otomasyonları aç"
              aria-expanded={automationsOpen}
              data-testid="mobile-automations-button"
            >
              <Workflow size={20} aria-hidden="true" />
            </button>
          </header>
          <div className="hero-content">
            <OrbAvatar activity={orbActivity} onClick={handleVoicePrimary} />
            <div className="greeting" data-testid="greeting-block">
              <p className="greeting-lead" data-testid="greeting-lead">Merhaba, Mehmet</p>
              <h1 data-testid="greeting-heading">Bugün sana nasıl yardımcı olabilirim?</h1>
              <p className="greeting-subtitle" data-testid="greeting-subtitle">
                Konuşmaya başlamak için orba dokun; yazmak istersen sohbeti aç.
              </p>
            </div>

            <div className={`voice-console is-${voice.status}${voice.muted ? " is-muted" : ""}`} data-testid="voice-console">
              <button
                type="button"
                className="voice-console-primary"
                onClick={handleVoicePrimary}
                aria-label={voice.muted ? "Yazılı sohbeti aç" : "AION sürekli dinlemeyi başlat"}
                aria-pressed={voice.continuousEnabled && !voice.muted}
                data-testid="voice-assistant-button"
              >
                <span className="voice-console-presence" aria-hidden="true">
                  {voice.status === "speaking" ? <AudioLines size={18} /> : voice.muted ? <MicOff size={18} /> : <Mic size={18} />}
                </span>
                <span className="voice-console-copy">
                  <strong data-testid="voice-assistant-label">
                    {voice.muted ? "Mikrofon susturuldu" : voice.continuousEnabled ? "AION aktif" : "AION hazır"}
                  </strong>
                  <small data-testid="voice-assistant-status">{voiceStatusText[voice.status]}</small>
                </span>
              </button>
              <span className="voice-console-divider" aria-hidden="true" />
              <button
                type="button"
                className="voice-console-control"
                onClick={handleMute}
                aria-label={voice.muted ? "Mikrofonu aç" : "Mikrofonu sustur"}
                aria-pressed={voice.muted}
                data-testid="voice-mute-button"
              >
                {voice.muted ? <MicOff size={17} aria-hidden="true" /> : <Mic size={17} aria-hidden="true" />}
              </button>
              <button
                type="button"
                className="voice-console-control"
                onClick={openChat}
                aria-label="Yazılı sohbeti aç"
                data-testid="voice-chat-button"
              >
                <MessageCircle size={17} aria-hidden="true" />
              </button>
            </div>

            <QuickActions onAction={handleQuickAction} />
            <p className="status-note" aria-live="polite" data-testid="interaction-status">
              {statusNote}
            </p>
          </div>
        </section>

        <AutomationsPanel
          open={automationsOpen}
          onClose={() => setAutomationsOpen(false)}
          onStatus={setStatusNote}
        />
        {automationsOpen ? (
          <button
            type="button"
            className="automations-backdrop"
            onClick={() => setAutomationsOpen(false)}
            aria-label="Otomasyon panelini kapat"
            data-testid="automations-backdrop"
          />
        ) : null}
        <button
          type="button"
          className="automations-fab"
          onClick={() => setAutomationsOpen(true)}
          aria-label="Otomasyonları aç"
          data-testid="automations-fab"
        >
          <Workflow size={22} aria-hidden="true" />
        </button>

        <ConversationPanel
          draft={message}
          interimTranscript={voice.interimTranscript}
          messages={messages}
          onChange={setMessage}
          onClose={() => setChatOpen(false)}
          onImport={(fileName) => setStatusNote(`${fileName} istemine eklendi`)}
          onMic={handleMute}
          onSubmit={handleSubmit}
          onTools={() => setStatusNote("Araçlar hazır")}
          open={chatOpen}
          voiceError={voice.error}
          voiceStatus={voice.status}
        />
      </main>
    </div>
  );
}
