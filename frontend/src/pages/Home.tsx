import { useState } from "react";
import ChatComposer from "@/components/ChatComposer";
import OrbAvatar from "@/components/OrbAvatar";
import QuickActions from "@/components/QuickActions";
import Sidebar from "@/components/Sidebar";

const quickPrompts: Record<string, string> = {
  surprise: "Give me a surprising creative idea for today",
  create: "Create an image from this idea: ",
  summarise: "Summarise this for me: ",
};

export default function Home() {
  const [activeItem, setActiveItem] = useState("home");
  const [message, setMessage] = useState("");
  const [sentMessage, setSentMessage] = useState("");
  const [statusNote, setStatusNote] = useState("");

  const handleSidebarSelect = (item: string) => {
    setActiveItem(item);
    if (item !== "home") setStatusNote(`${item[0].toUpperCase()}${item.slice(1)} selected`);
  };

  const handleSubmit = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      setStatusNote("Type a message to get started");
      return;
    }
    setSentMessage(trimmedMessage);
    setMessage("");
    setStatusNote("Your message is ready for LIX");
  };

  const handleQuickAction = (id: string) => {
    setMessage(quickPrompts[id] ?? "");
    setStatusNote("Prompt added to your message");
  };

  return (
    <div className="assistant-stage">
      <div className="ambient-light ambient-light-one" aria-hidden="true" />
      <div className="ambient-light ambient-light-two" aria-hidden="true" />
      <main className="assistant-shell" data-testid="assistant-home-screen">
        <Sidebar activeItem={activeItem} onSelect={handleSidebarSelect} />
        <section className="assistant-content" aria-label="LIX assistant home">
          <div className="content-wash" aria-hidden="true" />
          <div className="hero-content">
            <OrbAvatar />
            <div className="greeting" data-testid="greeting-block">
              <p className="greeting-lead" data-testid="greeting-lead">Hi, Hendricks</p>
              <h1 data-testid="greeting-heading">How can I help today?</h1>
              <p className="greeting-subtitle" data-testid="greeting-subtitle">
                I&apos;m here to help — from quick answers<br className="desktop-break" /> to smart recommendations.
              </p>
            </div>

            {sentMessage ? (
              <div className="sent-message" data-testid="sent-message-preview">
                <span className="sent-message-label">Latest prompt</span>
                <span>{sentMessage}</span>
              </div>
            ) : null}

            <ChatComposer
              value={message}
              onChange={setMessage}
              onSubmit={handleSubmit}
              onImport={(fileName) => setStatusNote(`${fileName} added to your prompt`)}
              onTools={() => setStatusNote("Tools are ready")}
              onMic={() => setStatusNote("Voice input is ready")}
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
