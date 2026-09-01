import { useCallback, useEffect, useRef, useState } from "react";
import { AudioLines, Menu, Mic } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ConversationPanel, { type ChatMessage } from "@/components/ConversationPanel";
import OrbAvatar from "@/components/OrbAvatar";
import QuickActions from "@/components/QuickActions";
import Sidebar from "@/components/Sidebar";
import ThemePicker from "@/components/ThemePicker";
import { endFrontendSession } from "@/lib/frontendAuth";
import { useVoiceAssistant, type VoiceStatus } from "@/hooks/useVoiceAssistant";

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
  idle: "Konuşmaya başla",
  listening: "Seni dinliyorum...",
  processing: "Düşünüyorum...",
  speaking: "AION yanıtlıyor",
  unsupported: "Yazılı sohbeti kullan",
  error: "Mikrofonu yeniden dene",
};

function createLocalResponse(prompt: string): string {
  const normalized = prompt.toLocaleLowerCase("tr-TR");
  if (normalized.includes("merhaba") || normalized.includes("selam")) {
    return "Merhaba Mehmet. Seni dinliyorum; bugün birlikte neye odaklanalım?";
  }
  if (normalized.includes("plan")) {
    return "Elbette Mehmet. Önce hedefi netleştirip ardından küçük ve uygulanabilir adımlara bölebiliriz.";
  }
  if (normalized.includes("özet")) {
    return "Metni sohbete eklediğinde ana fikirleri kısa ve anlaşılır biçimde özetleyebilirim.";
  }
  return "Mesajını aldım Mehmet. Bu yerel demoda sesli yanıt veriyorum; gerçek yapay zekâ bağlantısı eklendiğinde ayrıntılı şekilde yardımcı olacağım.";
}

export default function Home() {
  const navigate = useNavigate();
  const [activeItem, setActiveItem] = useState("home");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [statusNote, setStatusNote] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const responseTimer = useRef<number | null>(null);
  const voice = useVoiceAssistant();

  useEffect(() => () => {
    if (responseTimer.current !== null) window.clearTimeout(responseTimer.current);
  }, []);

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
    const response = createLocalResponse(trimmedPrompt);
    setMessages((current) => [...current, userMessage]);
    setMessage("");
    setIsSending(true);
    voice.markProcessing();
    if (responseTimer.current !== null) window.clearTimeout(responseTimer.current);
    responseTimer.current = window.setTimeout(() => {
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", text: response }]);
      setIsSending(false);
      voice.speak(response);
    }, 650);
    setStatusNote("AION yanıtını hazırlıyor");
  }, [voice.markProcessing, voice.speak]);

  const handleSubmit = () => submitPrompt(message);

  useEffect(() => {
    if (!voice.transcript) return;
    setChatOpen(true);
    submitPrompt(voice.transcript);
    voice.consumeTranscript();
  }, [submitPrompt, voice.consumeTranscript, voice.transcript]);

  const handleQuickAction = (id: string) => {
    setMessage(quickPrompts[id] ?? "");
    setChatOpen(true);
    setStatusNote("İstem mesajına eklendi");
  };

  const handleLogout = () => {
    setMobileMenuOpen(false);
    setSettingsOpen(false);
    setChatOpen(false);
    endFrontendSession();
    navigate("/giris", { replace: true });
  };

  const handleSettings = () => {
    setMobileMenuOpen(false);
    setChatOpen(false);
    setSettingsOpen((open) => !open);
  };

  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  const openChat = () => {
    setMobileMenuOpen(false);
    setSettingsOpen(false);
    setChatOpen(true);
  };

  const handleVoice = () => {
    openChat();
    voice.toggleListening();
    setStatusNote(voice.recognitionSupported ? "Mikrofon hazırlanıyor" : "Sesli giriş desteklenmiyor; yazılı sohbet açıldı");
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
          </header>
          <div className="hero-content">
            <OrbAvatar activity={orbActivity} onClick={openChat} />
            <div className="greeting" data-testid="greeting-block">
              <p className="greeting-lead" data-testid="greeting-lead">Merhaba, Mehmet</p>
              <h1 data-testid="greeting-heading">Bugün sana nasıl yardımcı olabilirim?</h1>
              <p className="greeting-subtitle" data-testid="greeting-subtitle">
                Hızlı yanıtlardan akıllı önerilere kadar<br className="desktop-break" /> sana yardımcı olmak için buradayım.
              </p>
            </div>

            <button
              type="button"
              className={`voice-trigger is-${voice.status}`}
              onClick={handleVoice}
              aria-label="AION ile sesli konuş"
              aria-pressed={voice.status === "listening"}
              data-testid="voice-assistant-button"
            >
              <span className="voice-trigger-icon" aria-hidden="true">
                {voice.status === "speaking" ? <AudioLines size={19} /> : <Mic size={19} />}
              </span>
              <span className="voice-trigger-copy">
                <strong data-testid="voice-assistant-label">AION ile konuş</strong>
                <small data-testid="voice-assistant-status">{voiceStatusText[voice.status]}</small>
              </span>
            </button>
            <QuickActions onAction={handleQuickAction} />
            <p className="status-note" aria-live="polite" data-testid="interaction-status">
              {statusNote}
            </p>
          </div>
        </section>
        <ConversationPanel
          draft={message}
          interimTranscript={voice.interimTranscript}
          messages={messages}
          onChange={setMessage}
          onClose={() => setChatOpen(false)}
          onImport={(fileName) => setStatusNote(`${fileName} istemine eklendi`)}
          onMic={handleVoice}
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
