import {
  BriefcaseBusiness,
  History,
  House,
  Inbox,
  Laptop,
  ListTodo,
  LogOut,
  MessageSquareText,
  Palette,
  PenSquare,
  Settings,
  Workflow,
  X,
  type LucideIcon,
} from "lucide-react";
import type { AgentChatSession } from "@/lib/aionApi";
import { markdownToSpeech } from "@/lib/markdown";

export type AppView =
  | "chat"
  | "home"
  | "projects"
  | "tasks"
  | "inbox"
  | "devices"
  | "automations"
  | "library"
  | "settings"
  | "profile";

interface AppNavProps {
  active: AppView;
  mobileOpen: boolean;
  sessions: AgentChatSession[];
  currentSessionId: string;
  projectCount: number;
  taskCount: number;
  alertCount: number;
  ownerName: string;
  busy: boolean;
  onSelect: (view: AppView) => void;
  onNewChat: () => void;
  onOpenSession: (sessionId: string) => void;
  onOpenTheme: () => void;
  onLogout: () => void;
  onClose: () => void;
}

interface NavItem {
  id: AppView;
  label: string;
  icon: LucideIcon;
  badge?: number;
  alert?: boolean;
}

function relativeDay(ms?: number): string {
  if (!ms) return "";
  const diff = Date.now() - ms;
  const day = 86_400_000;
  if (diff < day) return "Bugün";
  if (diff < 2 * day) return "Dün";
  if (diff < 7 * day) return "Bu hafta";
  return "Daha eski";
}

export default function AppNav({
  active,
  mobileOpen,
  sessions,
  currentSessionId,
  projectCount,
  taskCount,
  alertCount,
  ownerName,
  busy,
  onSelect,
  onNewChat,
  onOpenSession,
  onOpenTheme,
  onLogout,
  onClose,
}: AppNavProps) {
  const items: NavItem[] = [
    { id: "chat", label: "Sohbet", icon: MessageSquareText },
    { id: "home", label: "Kontrol merkezi", icon: House },
    { id: "projects", label: "Projeler", icon: BriefcaseBusiness, badge: projectCount },
    { id: "tasks", label: "Görevler", icon: ListTodo, badge: taskCount },
    { id: "inbox", label: "Gelen kutusu", icon: Inbox, badge: alertCount, alert: true },
    { id: "automations", label: "Otomasyonlar", icon: Workflow },
    { id: "devices", label: "Cihazlar", icon: Laptop },
    { id: "library", label: "Sohbet geçmişi", icon: History },
  ];

  // Group the recent conversations the way people scan them: by recency.
  const recent = [...sessions]
    .sort((a, b) => (b.updated_ms ?? 0) - (a.updated_ms ?? 0))
    .slice(0, 12);
  const groups: Array<{ label: string; items: AgentChatSession[] }> = [];
  for (const session of recent) {
    const label = relativeDay(session.updated_ms ?? session.created_ms);
    const group = groups.find((g) => g.label === label);
    if (group) group.items.push(session);
    else groups.push({ label, items: [session] });
  }

  const initial = (ownerName.trim()[0] || "M").toLocaleUpperCase("tr-TR");

  return (
    <>
      <div
        className={`nv-scrim${mobileOpen ? " is-open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
        data-testid="mobile-sidebar-backdrop"
      />
      <nav
        className={`nv${mobileOpen ? " is-open" : ""}`}
        aria-label="Ana navigasyon"
        data-testid="assistant-sidebar"
      >
        <div className="nv-top">
          <button type="button" className="nv-brand" onClick={() => onSelect("home")} aria-label="AION kontrol merkezi" data-testid="brand-mark">
            <span className={`nv-brand-orb${busy ? " is-busy" : ""}`} aria-hidden="true" />
            <span className="nv-brand-name">AION</span>
          </button>
          <button type="button" className="nv-icon-btn nv-close" onClick={onClose} aria-label="Menüyü kapat" data-testid="mobile-sidebar-close-button">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <button type="button" className="nv-new" onClick={onNewChat} title="Yeni sohbet" data-testid="sidebar-new-chat-button">
          <PenSquare size={17} strokeWidth={2} aria-hidden="true" />
          <span className="nv-label">Yeni sohbet</span>
        </button>

        <div className="nv-scroll">
          <ul className="nv-list">
            {items.map(({ id, label, icon: Icon, badge, alert }) => {
              const isActive = active === id;
              return (
                <li key={id}>
                  <button
                    type="button"
                    className={`nv-item${isActive ? " is-active" : ""}`}
                    onClick={() => onSelect(id)}
                    aria-current={isActive ? "page" : undefined}
                    title={label}
                    data-testid={`sidebar-${id}-button`}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2.1 : 1.75} aria-hidden="true" />
                    <span className="nv-label">{label}</span>
                    {badge && badge > 0 ? (
                      <span className={`nv-badge${alert ? " is-alert" : ""}`} aria-label={`${badge} kayıt`}>
                        {badge > 99 ? "99+" : badge}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>

          {groups.length > 0 ? (
            <section className="nv-recent" aria-label="Son sohbetler">
              {groups.map((group) => (
                <div key={group.label} className="nv-recent-group">
                  <p className="nv-recent-label">{group.label}</p>
                  <ul>
                    {group.items.map((session) => {
                      const isCurrent = active === "chat" && session.session_id === currentSessionId;
                      const title = markdownToSpeech(session.title && session.title !== "AION" ? session.title : session.preview || "") || "Yeni sohbet";
                      return (
                        <li key={session.session_id}>
                          <button
                            type="button"
                            className={`nv-recent-item${isCurrent ? " is-active" : ""}`}
                            onClick={() => onOpenSession(session.session_id)}
                            title={title}
                          >
                            {title}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </section>
          ) : null}
        </div>

        <div className="nv-bottom">
          <button
            type="button"
            className={`nv-item${active === "settings" ? " is-active" : ""}`}
            onClick={() => onSelect("settings")}
            aria-current={active === "settings" ? "page" : undefined}
            title="Ayarlar"
            data-testid="sidebar-settings-button"
          >
            <Settings size={18} strokeWidth={1.75} aria-hidden="true" />
            <span className="nv-label">Ayarlar</span>
          </button>
          <div className="nv-profile">
            <button
              type="button"
              className={`nv-profile-main${active === "profile" ? " is-active" : ""}`}
              onClick={() => onSelect("profile")}
              title="Profil"
              data-testid="sidebar-profile-button"
            >
              <span className="nv-avatar" aria-hidden="true" data-testid="sidebar-profile-avatar">{initial}</span>
              <span className="nv-profile-text nv-label">
                <strong data-testid="sidebar-profile-name">{ownerName}</strong>
                <small>Kişisel AI OS</small>
              </span>
            </button>
            <button type="button" className="nv-icon-btn nv-hide-rail" onClick={onOpenTheme} aria-label="Tema" title="Tema">
              <Palette size={16} aria-hidden="true" />
            </button>
            <button type="button" className="nv-icon-btn nv-hide-rail" onClick={onLogout} aria-label="Çıkış yap" title="Çıkış yap" data-testid="sidebar-logout-button">
              <LogOut size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
