import { FileText, Image, MessageCircle, type LucideIcon } from "lucide-react";
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
    id: "surprise",
    title: "Beni şaşırt!",
    description: "Yaratıcı bir fikir veya hikâyeyle beni şaşırt.",
    icon: MessageCircle,
  },
  {
    id: "create",
    title: "Görsel oluştur",
    description: "Fikrinden veya isteminden etkileyici bir görsel üret.",
    icon: Image,
  },
  {
    id: "summarise",
    title: "Özetle",
    description: "Bir belgeyi veya metni saniyeler içinde özetle.",
    icon: FileText,
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