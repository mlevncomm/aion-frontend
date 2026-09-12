import { Activity, BriefcaseBusiness, SunMedium, type LucideIcon } from "lucide-react";
import { liveGlowHandlers } from "@/lib/liveGlow";

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

interface QuickActionsProps {
  onAction: (id: string) => void;
}

const actions: QuickAction[] = [
  {
    id: "projects",
    title: "Projelerim",
    description: "AION, WEXON, Trade ve diğer projelerin gerçek durumunu kontrol et.",
    icon: BriefcaseBusiness,
  },
  {
    id: "brief",
    title: "Günlük brief",
    description: "Bugün değişenleri, uyarıları ve sıradaki önceliği kısa özetle.",
    icon: SunMedium,
  },
  {
    id: "vps",
    title: "Sistem durumu",
    description: "VPS, servisler ve kritik uygulama sağlık kontrollerini çalıştır.",
    icon: Activity,
  },
];

export default function QuickActions({ onAction }: QuickActionsProps) {
  return (
    <div className="quick-actions" data-testid="quick-actions">
      {actions.map(({ id, title, description, icon: Icon }) => (
        <button
          type="button"
          key={id}
          className="quick-action-card live-glow-surface"
          onClick={() => onAction(id)}
          {...liveGlowHandlers}
          data-testid={`quick-action-${id}-button`}
        >
          <Icon className="quick-action-icon" size={17} strokeWidth={1.8} aria-hidden="true" />
          <span className="quick-action-copy">
            <span className="quick-action-title" data-testid={`quick-action-${id}-title`}>{title}</span>
            <span className="quick-action-description" data-testid={`quick-action-${id}-description`}>{description}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
