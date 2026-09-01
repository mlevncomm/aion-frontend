import {
  BookOpen,
  House,
  LogOut,
  Mail,
  Settings,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";

interface SidebarProps {
  activeItem: string;
  mobileOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onSettings: () => void;
  onSelect: (item: string) => void;
  settingsOpen: boolean;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

const navigationItems: NavigationItem[] = [
  { id: "home", label: "Ana Sayfa", icon: House },
  { id: "discover", label: "Keşfet", icon: Sparkles },
  { id: "inbox", label: "Gelen Kutusu", icon: Mail },
  { id: "library", label: "Arşiv", icon: BookOpen },
];

export default function Sidebar({ activeItem, mobileOpen, onClose, onLogout, onSettings, onSelect, settingsOpen }: SidebarProps) {
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
          className={`sidebar-button${settingsOpen ? " is-active" : ""}`}
          onClick={onSettings}
          aria-label="Ayarlar"
          aria-expanded={settingsOpen}
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
          className="profile-button"
          onClick={() => onSelect("profile")}
          aria-label="Mehmet profilini aç"
          data-testid="sidebar-profile-button"
        >
          <span className="profile-monogram" data-testid="sidebar-profile-avatar" aria-hidden="true">M</span>
          <span className="profile-name" data-testid="sidebar-profile-name">Mehmet</span>
        </button>
      </div>
    </aside>
  );
}