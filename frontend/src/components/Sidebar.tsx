import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  BriefcaseBusiness,
  History,
  House,
  Inbox,
  Laptop,
  ListTodo,
  LogOut,
  MessageCircle,
  Plus,
  Settings,
  Workflow,
  X,
  type LucideIcon,
} from "lucide-react";

interface SidebarProps {
  activeItem: string;
  mobileOpen: boolean;
  projectCount: number;
  taskCount: number;
  alertCount: number;
  chatOpen: boolean;
  activeServices: number;
  totalServices: number;
  blockedIntegrations: number;
  lastObserved: string;
  onClose: () => void;
  onLogout: () => void;
  onSelect: (item: string) => void;
  onOpenChat: () => void;
  onNewChat: () => void;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  alert?: boolean;
}

/**
 * The active marker is one element that travels between rows rather than a
 * background that switches on each button. Moving a single shape is what makes
 * the navigation read as one continuous surface instead of a list of tiles.
 */
function useTravellingMarker(activeKey: string) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const [marker, setMarker] = useState<{ y: number; h: number; visible: boolean }>({
    y: 0,
    h: 0,
    visible: false,
  });

  const measure = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const active = list.querySelector<HTMLElement>("[data-rail-active='true']");
    if (!active) {
      setMarker((current) => ({ ...current, visible: false }));
      return;
    }
    setMarker({ y: active.offsetTop, h: active.offsetHeight, visible: true });
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [activeKey, measure]);

  useEffect(() => {
    const list = listRef.current;
    if (!list || typeof ResizeObserver === "undefined") return;
    // Row heights change with viewport and font loading; the marker follows.
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    list.querySelectorAll("[data-rail-row='true']").forEach((row) => observer.observe(row));
    return () => observer.disconnect();
  }, [measure]);

  return { listRef, marker, measure };
}

export default function Sidebar({
  activeItem,
  mobileOpen,
  projectCount,
  taskCount,
  alertCount,
  chatOpen,
  activeServices,
  totalServices,
  blockedIntegrations,
  lastObserved,
  onClose,
  onLogout,
  onSelect,
  onOpenChat,
  onNewChat,
}: SidebarProps) {
  const workspaceItems: NavigationItem[] = [
    { id: "home", label: "Ana Sayfa", icon: House },
    { id: "projects", label: "Projeler", icon: BriefcaseBusiness, badge: projectCount },
    { id: "tasks", label: "Görevler", icon: ListTodo, badge: taskCount },
    { id: "inbox", label: "Gelen Kutusu", icon: Inbox, badge: alertCount, alert: true },
    { id: "devices", label: "Cihazlar", icon: Laptop },
    { id: "automations", label: "Otomasyonlar", icon: Workflow },
    { id: "library", label: "Geçmiş", icon: History },
  ];

  // Chat is a peer of the workspace rows so the marker can travel onto it.
  const activeKey = chatOpen ? "chat" : activeItem;
  const { listRef, marker } = useTravellingMarker(activeKey);

  const renderRow = (
    { id, label, icon: Icon, badge, alert }: NavigationItem,
    options: { onClick: () => void; testId: string; trailing?: React.ReactNode },
  ) => {
    const isActive = activeKey === id;
    return (
      <button
        key={id}
        type="button"
        data-rail-row="true"
        data-rail-active={isActive ? "true" : "false"}
        className={`rail-row${isActive ? " is-active" : ""}`}
        onClick={options.onClick}
        aria-current={isActive ? "page" : undefined}
        title={label}
        data-testid={options.testId}
      >
        <span className="rail-glyph" aria-hidden="true">
          <Icon size={19} strokeWidth={isActive ? 2.15 : 1.7} />
        </span>
        <span className="rail-label">{label}</span>
        {options.trailing}
        {typeof badge === "number" && badge > 0 ? (
          <span
            className={`rail-badge${alert ? " is-alert" : ""}`}
            aria-label={`${badge} kayıt`}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <aside
      className={`aion-rail${mobileOpen ? " is-mobile-open" : ""}`}
      aria-label="Ana navigasyon"
      data-testid="assistant-sidebar"
    >
      <div className="rail-surface">
        <header className="rail-head">
          <div className="rail-identity">
            <span className="rail-wordmark" data-testid="brand-mark">AION</span>
            <span className="rail-owner">
              <span className="rail-pulse" aria-hidden="true" />
              Mehmet · Personal AI OS
            </span>
          </div>
          <button
            type="button"
            className="rail-close"
            onClick={onClose}
            aria-label="Menüyü kapat"
            data-testid="mobile-sidebar-close-button"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <button
          type="button"
          className="rail-compose"
          onClick={onNewChat}
          data-testid="sidebar-new-chat-button"
        >
          <span className="rail-compose-glyph" aria-hidden="true">
            <Plus size={16} strokeWidth={2.4} />
          </span>
          <span className="rail-compose-label">Yeni sohbet</span>
        </button>

        <div className="rail-scroll">
          <div className="rail-list" ref={listRef}>
            <span
              className={`rail-marker${marker.visible ? " is-visible" : ""}`}
              aria-hidden="true"
              style={{ transform: `translate3d(0, ${marker.y}px, 0)`, height: `${marker.h}px` }}
            />

            <p className="rail-heading">AION</p>
            {renderRow(
              { id: "chat", label: "Sohbet", icon: MessageCircle },
              {
                onClick: onOpenChat,
                testId: "sidebar-chat-button",
                trailing: <span className="rail-live">Canlı</span>,
              },
            )}

            <p className="rail-heading">Çalışma alanı</p>
            {workspaceItems.map((item) =>
              renderRow(item, {
                onClick: () => onSelect(item.id),
                testId: `sidebar-${item.id}-button`,
              }),
            )}

            <p className="rail-heading">Sistem</p>
            {renderRow(
              { id: "settings", label: "Ayarlar", icon: Settings },
              { onClick: () => onSelect("settings"), testId: "sidebar-settings-button" },
            )}
          </div>
        </div>

        <div className="rail-pulseline" data-testid="rail-status-strip">
          <span className="rail-pulseline-row">
            <span className="rail-pulseline-key">Servisler</span>
            <strong className={totalServices > 0 && activeServices < totalServices ? "is-warn" : undefined}>
              {totalServices > 0 ? `${activeServices}/${totalServices}` : "—"}
            </strong>
          </span>
          <span className="rail-pulseline-row">
            <span className="rail-pulseline-key">Eksik bağlantı</span>
            <strong className={blockedIntegrations > 0 ? "is-warn" : undefined}>
              {blockedIntegrations > 0 ? blockedIntegrations : "yok"}
            </strong>
          </span>
          <span className="rail-pulseline-row">
            <span className="rail-pulseline-key">Son gözlem</span>
            <strong>{lastObserved}</strong>
          </span>
        </div>

        <footer className="rail-foot">
          <button
            type="button"
            className={`rail-profile${activeKey === "profile" ? " is-active" : ""}`}
            onClick={() => onSelect("profile")}
            aria-label="Mehmet profilini aç"
            aria-current={activeKey === "profile" ? "page" : undefined}
            data-testid="sidebar-profile-button"
          >
            <span className="rail-avatar" data-testid="sidebar-profile-avatar" aria-hidden="true">
              M
            </span>
            <span className="rail-profile-copy">
              <strong data-testid="sidebar-profile-name">Mehmet</strong>
              <small>Kişisel çalışma alanı</small>
            </span>
            <span className="rail-online" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="rail-signout"
            onClick={onLogout}
            aria-label="Çıkış yap"
            title="Çıkış yap"
            data-testid="sidebar-logout-button"
          >
            <LogOut size={17} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </footer>
      </div>
    </aside>
  );
}
