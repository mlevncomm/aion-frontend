import {
  BookOpen,
  House,
  LogOut,
  Mail,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

interface SidebarProps {
  activeItem: string;
  onSelect: (item: string) => void;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

const navigationItems: NavigationItem[] = [
  { id: "home", label: "Home", icon: House },
  { id: "discover", label: "Discover", icon: Sparkles },
  { id: "inbox", label: "Inbox", icon: Mail },
  { id: "library", label: "Library", icon: BookOpen },
];

export default function Sidebar({ activeItem, onSelect }: SidebarProps) {
  return (
    <aside className="assistant-sidebar" aria-label="Primary navigation" data-testid="assistant-sidebar">
      <div className="sidebar-top">
        <div className="brand-mark" data-testid="brand-mark">LIX</div>
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
                <span className="sr-only">{label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="sidebar-bottom">
        <button
          type="button"
          className="sidebar-button"
          onClick={() => onSelect("settings")}
          aria-label="Settings"
          data-testid="sidebar-settings-button"
        >
          <Settings strokeWidth={1.8} aria-hidden="true" />
          <span className="sr-only">Settings</span>
        </button>
        <button
          type="button"
          className="sidebar-button"
          onClick={() => onSelect("logout")}
          aria-label="Sign out"
          data-testid="sidebar-logout-button"
        >
          <LogOut strokeWidth={1.8} aria-hidden="true" />
          <span className="sr-only">Sign out</span>
        </button>
        <button
          type="button"
          className="profile-button"
          onClick={() => onSelect("profile")}
          aria-label="Open Hendricks profile"
          data-testid="sidebar-profile-button"
        >
          <img
            src="https://images.unsplash.com/photo-1622483066841-ae4c61da3db8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTB8MHwxfHNlYXJjaHwxfHxtYWxlJTIwcG9ydHJhaXQlMjBkYXJrJTIwYmFja2dyb3VuZHxlbnwwfHx8fDE3ODgyMTIzNjl8MA&ixlib=rb-4.1.0&q=85"
            alt="Hendricks"
            data-testid="sidebar-profile-avatar"
          />
        </button>
      </div>
    </aside>
  );
}