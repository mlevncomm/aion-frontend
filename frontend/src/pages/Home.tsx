import { useState } from "react";
import { Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ChatComposer from "@/components/ChatComposer";
import OrbAvatar from "@/components/OrbAvatar";
import QuickActions from "@/components/QuickActions";
import Sidebar from "@/components/Sidebar";
import { endFrontendSession } from "@/lib/frontendAuth";

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

export default function Home() {
  const navigate = useNavigate();
  const [activeItem, setActiveItem] = useState("home");
  const [message, setMessage] = useState("");
  const [sentMessage, setSentMessage] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSidebarSelect = (item: string) => {
    setActiveItem(item);
    setMobileMenuOpen(false);
    if (item !== "home") setStatusNote(`${sectionNames[item] ?? item} seçildi`);
  };

  const handleSubmit = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      setStatusNote("Başlamak için bir mesaj yaz");
      return;
    }
    setSentMessage(trimmedMessage);
    setMessage("");
    setStatusNote("Mesajın AION için hazır");
  };

  const handleQuickAction = (id: string) => {
    setMessage(quickPrompts[id] ?? "");
    setStatusNote("İstem mesajına eklendi");
  };

  const handleLogout = () => {
    setMobileMenuOpen(false);
    endFrontendSession();
    navigate("/giris", { replace: true });
  };

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
          onSelect={handleSidebarSelect}
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
            <OrbAvatar />
            <div className="greeting" data-testid="greeting-block">
              <p className="greeting-lead" data-testid="greeting-lead">Merhaba, Hendricks</p>
              <h1 data-testid="greeting-heading">Bugün sana nasıl yardımcı olabilirim?</h1>
              <p className="greeting-subtitle" data-testid="greeting-subtitle">
                Hızlı yanıtlardan akıllı önerilere kadar<br className="desktop-break" /> sana yardımcı olmak için buradayım.
              </p>
            </div>

            {sentMessage ? (
              <div className="sent-message" data-testid="sent-message-preview">
                <span className="sent-message-label">Son istem</span>
                <span>{sentMessage}</span>
              </div>
            ) : null}

            <ChatComposer
              value={message}
              onChange={setMessage}
              onSubmit={handleSubmit}
              onImport={(fileName) => setStatusNote(`${fileName} istemine eklendi`)}
              onTools={() => setStatusNote("Araçlar hazır")}
              onMic={() => setStatusNote("Sesli giriş hazır")}
            />
            <QuickActions onAction={handleQuickAction} />
            <p className="status-note" aria-live="polite" data-testid="interaction-status">
              {statusNote}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
