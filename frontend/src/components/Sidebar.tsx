import {
  BriefcaseBusiness,
  History,
  House,
  Inbox,
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
  alertCount: number;
  chatOpen: boolean;
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
}

export default function Sidebar({
  activeItem,
  mobileOpen,
  projectCount,
  alertCount,
  chatOpen,
  onClose,
  onLogout,
  onSelect,
  onOpenChat,
  onNewChat,
}: SidebarProps) {
  const workspaceItems: NavigationItem[] = [
    { id: "home", label: "Ana Sayfa", icon: House },
    { id: "projects", label: "Projeler", icon: BriefcaseBusiness, badge: projectCount },
    { id: "tasks", label: "Görevler", icon: ListTodo },
    { id: "inbox", label: "Gelen Kutusu", icon: Inbox, badge: alertCount },
    { id: "library", label: "Geçmiş", icon: History },
    { id: "automations", label: "Otomasyonlar", icon: Workflow },
  ];

  const renderNavigationItem = ({ id, label, icon: Icon, badge }: NavigationItem) => {
    const isActive = activeItem === id && !chatOpen;
    return (
      <button
        key={id}
        type="button"
        className={`sidebar-button${isActive ? " is-active" : ""}`}
        onClick={() => onSelect(id)}
        aria-label={label}
        aria-current={isActive ? "page" : undefined}
        data-testid={`sidebar-${id}-button`}
      >
        <span className="sidebar-icon-wrap" aria-hidden="true">
          <Icon strokeWidth={isActive ? 2.3 : 1.8} />
        </span>
        <span className="sidebar-label">{label}</span>
        {typeof badge === "number" && badge > 0 ? (
          <span className={`sidebar-badge${id === "inbox" ? " is-alert" : ""}`} aria-label={`${badge} kayıt`}>
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <aside
      className={`assistant-sidebar${mobileOpen ? " is-mobile-open" : ""}`}
      aria-label="Ana navigasyon"
      data-testid="assistant-sidebar"
    >
      <div className="sidebar-top">
        <div className="sidebar-brand-row">
          <div>
            <div className="brand-mark" data-testid="brand-mark">AION</div>
            <p className="sidebar-product-label"><span className="sidebar-live-dot" aria-hidden="true" /> Mehmet · Personal AI OS</p>
          </div>
          <button
            type="button"
            className="mobile-sidebar-close"
            onClick={onClose}
            aria-label="Menüyü kapat"
            data-testid="mobile-sidebar-close-button"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          className="sidebar-new-chat"
          onClick={onNewChat}
          data-testid="sidebar-new-chat-button"
        >
          <Plus size={18} aria-hidden="true" />
          <span>Yeni sohbet</span>
        </button>

        <div className="sidebar-section">
          <span className="sidebar-section-title">AION</span>
          <button
            type="button"
            className={`sidebar-button sidebar-chat-button${chatOpen ? " is-active" : ""}`}
            onClick={onOpenChat}
            aria-label="AION sohbetini aç"
            aria-current={chatOpen ? "page" : undefined}
            data-testid="sidebar-chat-button"
          >
            <span className="sidebar-icon-wrap" aria-hidden="true"><MessageCircle strokeWidth={chatOpen ? 2.3 : 1.8} /></span>
            <span className="sidebar-label">Sohbet</span>
            <span className="sidebar-live-pill">Canlı</span>
          </button>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-section-title">Mehmet'in alanı</span>
          <nav className="sidebar-navigation">
            {workspaceItems.map(renderNavigationItem)}
          </nav>
        </div>
      </div>

      <div className="sidebar-bottom">
        <div className="sidebar-section sidebar-system-section">
          <span className="sidebar-section-title">Sistem</span>
          <button
            type="button"
            className={`sidebar-button${activeItem === "settings" && !chatOpen ? " is-active" : ""}`}
            onClick={() => onSelect("settings")}
            aria-label="Ayarlar"
            aria-current={activeItem === "settings" && !chatOpen ? "page" : undefined}
            data-testid="sidebar-settings-button"
          >
            <span className="sidebar-icon-wrap" aria-hidden="true"><Settings strokeWidth={1.8} /></span>
            <span className="sidebar-label">Ayarlar</span>
          </button>
          <button
            type="button"
            className="sidebar-button"
            onClick={onLogout}
            aria-label="Çıkış yap"
            data-testid="sidebar-logout-button"
          >
            <span className="sidebar-icon-wrap" aria-hidden="true"><LogOut strokeWidth={1.8} /></span>
            <span className="sidebar-label">Çıkış Yap</span>
          </button>
        </div>

        <button
          type="button"
          className={`profile-button${activeItem === "profile" && !chatOpen ? " is-active" : ""}`}
          onClick={() => onSelect("profile")}
          aria-label="Mehmet profilini aç"
          data-testid="sidebar-profile-button"
        >
          <span className="profile-monogram" data-testid="sidebar-profile-avatar" aria-hidden="true">M</span>
          <span className="profile-copy">
            <strong className="profile-name" data-testid="sidebar-profile-name">Mehmet</strong>
            <small>Kişisel çalışma alanı</small>
          </span>
          <span className="profile-status-dot" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
