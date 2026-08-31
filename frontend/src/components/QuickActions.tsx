import { FileText, Image, MessageCircle, type LucideIcon } from "lucide-react";

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
    title: "Surprise me!",
    description: "Surprise me with a creative idea or story.",
    icon: MessageCircle,
  },
  {
    id: "create",
    title: "Create image",
    description: "Create an image from your idea or prompt.",
    icon: Image,
  },
  {
    id: "summarise",
    title: "Summarise",
    description: "Summarise a document or text in seconds.",
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
          className="quick-action-card"
          onClick={() => onAction(id)}
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