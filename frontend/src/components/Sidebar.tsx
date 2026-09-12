import {
  BriefcaseBusiness,
  History,
  House,
  Inbox,
  LogOut,
  Settings,
  Workflow,
  X,
  type LucideIcon,
} from "lucide-react";

interface SidebarProps {
  activeItem: string;
  mobileOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onSelect: (item: string) => void;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

const navigationItems: NavigationItem[] = [
  { id: "home", label: "Ana Sayfa", icon: House },
  { id: "projects", label: "Projeler", icon: BriefcaseBusiness },
  { id: "inbox", label: "Gelen Kutusu", icon: Inbox },
  { id: "library", label: "Geçmiş", icon: History },
  { id: "automations", label: "Otomasyonlar", icon: Workflow },
];

export default function Sidebar({ activeItem, mobileOpen, onClose, onLogout, onSelect }: SidebarProps) {
  return (
    <aside
      className={`assistant-sidebar${mobileOpen ? " is-mobile-open" : ""}`}
      aria-label="Ana navigasyon"
      data-testid="assistant-sidebar"
    >
      <div className="sidebar-top">
        <div className="sidebar-brand-row">
          <div className="brand-mark" data-testid="brand-mark">AION</div>
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
        <p className="sidebar-product-label">Personal AI OS</p>
        <div className="sidebar-rule" aria-hidden="true" />
        <nav className="sidebar-navigation">
          {navigationItems.map(({ id, label, icon: Icon }) => {
            const isActive = activeItem === id;
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
                <Icon strokeWidth={isActive ? 2.4 : 1.8} aria-hidden="true" />
                <span className="sidebar-label">{label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="sidebar-bottom">
        <button
          type="button"
          className={`sidebar-button${activeItem === "settings" ? " is-active" : ""}`}
          onClick={() => onSelect("settings")}
          aria-label="Ayarlar"
          aria-current={activeItem === "settings" ? "page" : undefined}
          data-testid="sidebar-settings-button"
        >
          <Settings strokeWidth={1.8} aria-hidden="true" />
          <span className="sidebar-label">Ayarlar</span>
        </button>
        <button
          type="button"
          className="sidebar-button"
          onClick={onLogout}
          aria-label="Çıkış yap"
          data-testid="sidebar-logout-button"
        >
          <LogOut strokeWidth={1.8} aria-hidden="true" />
          <span className="sidebar-label">Çıkış Yap</span>
        </button>
        <button
          type="button"
          className={`profile-button${activeItem === "profile" ? " is-active" : ""}`}
          onClick={() => onSelect("profile")}
          aria-label="Mehmet profilini aç"
          data-testid="sidebar-profile-button"
        >
          <span className="profile-monogram" data-testid="sidebar-profile-avatar" aria-hidden="true">M</span>
          <span className="profile-name" data-testid="sidebar-profile-name">Mehmet</span>
          <span className="profile-status-dot" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
