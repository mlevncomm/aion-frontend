import { Check, Palette, X } from "lucide-react";
import { useEffect, useState } from "react";
import { getAionTheme, setAionTheme, type AionTheme } from "@/lib/theme";

interface ThemePickerProps {
  open: boolean;
  onClose: () => void;
  onThemeChange: (label: string) => void;
}

interface ThemeOption {
  id: AionTheme;
  label: string;
  description: string;
}

const themeOptions: ThemeOption[] = [
  { id: "reference", label: "AION Yeşil", description: "Derin zümrüt ve yumuşak mint" },
  { id: "emerald", label: "Orman", description: "Mat ve doğal yeşil" },
  { id: "amber", label: "Koyu amber", description: "Sıcak ve odaklı" },
  { id: "mono", label: "Monokrom", description: "Sade ve zamansız" },
];

export default function ThemePicker({ open, onClose, onThemeChange }: ThemePickerProps) {
  const [activeTheme, setActiveTheme] = useState<AionTheme>(getAionTheme);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, open]);

  if (!open) return null;

  const chooseTheme = (theme: ThemeOption) => {
    setActiveTheme(theme.id);
    setAionTheme(theme.id);
    onThemeChange(theme.label);
  };

  return (
    <>
      <button
        type="button"
        className="theme-picker-backdrop"
        onClick={onClose}
        aria-label="Tema panelini kapat"
        data-testid="theme-picker-backdrop"
      />
      <aside className="theme-picker" role="dialog" aria-modal="true" aria-labelledby="theme-picker-title" data-testid="theme-picker">
        <div className="theme-picker-header">
          <div className="theme-picker-heading">
            <Palette size={17} aria-hidden="true" />
            <div>
              <h2 id="theme-picker-title" data-testid="theme-picker-title">Görünüm</h2>
              <p data-testid="theme-picker-copy">AION atmosferini seç</p>
            </div>
          </div>
          <button
            type="button"
            className="theme-picker-close"
            onClick={onClose}
            aria-label="Tema panelini kapat"
            data-testid="theme-picker-close-button"
          >
            <X size={17} aria-hidden="true" />
          </button>
        </div>
        <div className="theme-options">
          {themeOptions.map((theme) => {
            const isActive = activeTheme === theme.id;
            return (
              <button
                type="button"
                key={theme.id}
                className={`theme-option${isActive ? " is-active" : ""}`}
                onClick={() => chooseTheme(theme)}
                aria-pressed={isActive}
                data-testid={`theme-option-${theme.id}`}
              >
                <span className={`theme-swatch theme-swatch-${theme.id}`} aria-hidden="true" />
                <span className="theme-option-copy">
                  <span data-testid={`theme-option-${theme.id}-label`}>{theme.label}</span>
                  <small data-testid={`theme-option-${theme.id}-description`}>{theme.description}</small>
                </span>
                {isActive ? <Check className="theme-check" size={16} aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
        <p className="theme-picker-note" data-testid="theme-picker-note">Seçimin bu tarayıcıda saklanır.</p>
      </aside>
    </>
  );
}