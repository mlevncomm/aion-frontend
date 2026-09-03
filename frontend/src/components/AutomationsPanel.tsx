import { useState } from "react";
import {
  CalendarClock,
  Focus,
  Mail,
  Newspaper,
  Plus,
  Sparkles,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";

interface Automation {
  id: string;
  title: string;
  description: string;
  schedule: string;
  icon: LucideIcon;
  enabled: boolean;
}

const initialAutomations: Automation[] = [
  {
    id: "morning",
    title: "Günaydın Özeti",
    description: "Her sabah günün planını ve önceliklerini sesli özetler.",
    schedule: "Her gün 08:00",
    icon: Sparkles,
    enabled: true,
  },
  {
    id: "meeting",
    title: "Toplantı Hatırlatıcı",
    description: "Toplantılardan 10 dakika önce seni nazikçe uyarır.",
    schedule: "Etkinlik bazlı",
    icon: CalendarClock,
    enabled: true,
  },
  {
    id: "news",
    title: "Haber Derlemesi",
    description: "İlgi alanlarına göre günlük haber özeti hazırlar.",
    schedule: "Her gün 18:00",
    icon: Newspaper,
    enabled: false,
  },
  {
    id: "focus",
    title: "Odak Modu",
    description: "Sen çalışırken bildirimleri susturur ve akışını korur.",
    schedule: "Manuel",
    icon: Focus,
    enabled: false,
  },
  {
    id: "digest",
    title: "E-posta Taslağı",
    description: "Gelen önemli e-postalara taslak yanıt önerir.",
    schedule: "Saatlik",
    icon: Mail,
    enabled: false,
  },
];

interface AutomationsPanelProps {
  open: boolean;
  onClose: () => void;
  onStatus: (message: string) => void;
}

export default function AutomationsPanel({ open, onClose, onStatus }: AutomationsPanelProps) {
  const [items, setItems] = useState<Automation[]>(initialAutomations);
  const activeCount = items.filter((item) => item.enabled).length;

  const toggle = (id: string) => {
    const target = items.find((item) => item.id === id);
    setItems((current) => current.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item)));
    if (target) onStatus(`${target.title} ${target.enabled ? "duraklatıldı" : "etkinleştirildi"}`);
  };

  return (
    <aside
      className={`automations-panel${open ? " is-open" : ""}`}
      aria-label="Otomasyonlar paneli"
      data-testid="automations-panel"
    >
      <header className="automations-header">
        <div>
          <p className="automations-kicker" data-testid="automations-kicker">Akıllı akışlar</p>
          <h2 data-testid="automations-title">Otomasyonlar</h2>
        </div>
        <button
          type="button"
          className="automations-close"
          onClick={onClose}
          aria-label="Otomasyon panelini kapat"
          data-testid="automations-close-button"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </header>

      <p className="automations-summary" data-testid="automations-summary">
        {activeCount} / {items.length} otomasyon aktif
      </p>

      <div className="automations-list" data-testid="automations-list">
        {items.map((automation) => {
          const Icon = automation.icon;
          return (
            <div
              key={automation.id}
              className={`automation-card${automation.enabled ? " is-on" : ""}`}
              data-testid={`automation-${automation.id}`}
            >
              <span className="automation-icon" aria-hidden="true"><Icon size={17} strokeWidth={1.9} /></span>
              <div className="automation-copy">
                <span className="automation-title" data-testid={`automation-${automation.id}-title`}>
                  {automation.title}
                </span>
                <span className="automation-desc">{automation.description}</span>
                <span className="automation-schedule">
                  <Zap size={11} aria-hidden="true" /> {automation.schedule}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={automation.enabled}
                className={`automation-switch${automation.enabled ? " is-on" : ""}`}
                onClick={() => toggle(automation.id)}
                aria-label={`${automation.title} otomasyonunu ${automation.enabled ? "kapat" : "aç"}`}
                data-testid={`automation-${automation.id}-toggle`}
              >
                <span className="automation-knob" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className="automations-add"
        onClick={() => onStatus("Yeni otomasyon oluşturma yakında eklenecek")}
        data-testid="automations-add-button"
      >
        <Plus size={15} strokeWidth={2.2} aria-hidden="true" /> Yeni otomasyon
      </button>
    </aside>
  );
}
