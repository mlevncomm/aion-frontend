import {
  BriefcaseBusiness,
  ChartNoAxesCombined,
  Code2,
  Newspaper,
  Server,
  type LucideIcon,
} from "lucide-react";

interface QuickActionsProps {
  onAction: (id: string) => void;
}

interface QuickAction {
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
}

const actions: QuickAction[] = [
  { id: "projects", title: "Projelerim", subtitle: "Genel durumu kontrol et", icon: BriefcaseBusiness },
  { id: "brief", title: "Bugünkü Brief", subtitle: "Öncelikleri çıkar", icon: Newspaper },
  { id: "vps", title: "VPS", subtitle: "Servisleri kontrol et", icon: Server },
  { id: "wexon", title: "WEXON", subtitle: "Platform durumunu incele", icon: Code2 },
  { id: "trade", title: "AION Trade", subtitle: "PAPER ve risk durumunu gör", icon: ChartNoAxesCombined },
];

export default function QuickActions({ onAction }: QuickActionsProps) {
  return (
    <div className="quick-actions" aria-label="Mehmet için hızlı AION komutları" data-testid="quick-actions">
      {actions.map(({ id, title, subtitle, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className="quick-action-button"
          onClick={() => onAction(id)}
          data-testid={`quick-action-${id}`}
        >
          <span className="quick-action-icon" aria-hidden="true"><Icon size={18} strokeWidth={1.8} /></span>
          <span className="quick-action-copy">
            <strong>{title}</strong>
            <small>{subtitle}</small>
          </span>
        </button>
      ))}
    </div>
  );
}
