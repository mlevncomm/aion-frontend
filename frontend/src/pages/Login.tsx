import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, LockKeyhole, MonitorSmartphone, ShieldCheck, UserRound } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import OrbAvatar from "@/components/OrbAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { liveGlowHandlers } from "@/lib/liveGlow";
import {
  beginFrontendSession,
  clearLoginThrottle,
  getLoginThrottle,
  isFrontendAuthenticated,
  loginPolicy,
  registerFailedLogin,
  validateAdminCredentials,
} from "@/lib/frontendAuth";

const getRemainingSeconds = (lockUntil: number) => Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000));

export default function Login() {
  const navigate = useNavigate();
  const initialThrottle = getLoginThrottle();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [lockUntil, setLockUntil] = useState(initialThrottle.lockUntil);
  const [remainingSeconds, setRemainingSeconds] = useState(getRemainingSeconds(initialThrottle.lockUntil));
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (lockUntil <= Date.now()) return;

    const updateCountdown = () => {
      const nextSeconds = getRemainingSeconds(lockUntil);
      setRemainingSeconds(nextSeconds);
      if (nextSeconds === 0) {
        clearLoginThrottle();
        setLockUntil(0);
        setFeedback("Tekrar deneyebilirsin.");
      }
    };

    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, 500);
    return () => window.clearInterval(intervalId);
  }, [lockUntil]);

  if (isFrontendAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (remainingSeconds > 0 || submitting) return;

    if (!username.trim() || !password) {
      setFeedback("Kullanıcı adı ve şifre alanlarını doldur.");
      return;
    }

    setSubmitting(true);
    const isValid = await validateAdminCredentials(username, password);

    if (isValid) {
      clearLoginThrottle();
      beginFrontendSession();
      navigate("/", { replace: true });
      return;
    }

    const nextThrottle = registerFailedLogin();
    setLockUntil(nextThrottle.lockUntil);
    setRemainingSeconds(getRemainingSeconds(nextThrottle.lockUntil));
    setPassword("");
    setSubmitting(false);

    if (nextThrottle.lockUntil > Date.now()) {
      setFeedback("Çok fazla hatalı deneme. 30 saniye sonra tekrar dene.");
    } else {
      const remainingAttempts = loginPolicy.maxAttempts - nextThrottle.attempts;
      setFeedback(`Kullanıcı adı veya şifre hatalı. ${remainingAttempts} deneme hakkın kaldı.`);
    }
  };

  return (
    <main className="login-stage" data-testid="login-screen">
      <div className="login-grid" aria-hidden="true" />
      <div className="login-glow login-glow-one" aria-hidden="true" />
      <div className="login-glow login-glow-two" aria-hidden="true" />

      <section className="login-visual" aria-label="AION özel çalışma alanı">
        <div className="login-brand-mark" data-testid="login-brand-mark">AION</div>
        <div className="login-visual-content">
          <div className="login-orb-wrap"><OrbAvatar /></div>
          <p className="login-eyebrow" data-testid="login-eyebrow">
            <ShieldCheck size={14} aria-hidden="true" /> Özel çalışma alanı
          </p>
          <h1 data-testid="login-hero-heading">Fikirlerin için sakin ve kişisel bir alan.</h1>
          <p className="login-hero-copy" data-testid="login-hero-copy">
            AION&apos;daki sohbetlerine ve üretkenlik araçlarına yalnızca yetkili oturumla eriş.
          </p>
          <div className="login-feature-row" data-testid="login-feature-row">
            <span data-testid="login-feature-session"><MonitorSmartphone size={16} aria-hidden="true" /> Sekmeye özel oturum</span>
            <span data-testid="login-feature-access"><LockKeyhole size={16} aria-hidden="true" /> Kişisel erişim</span>
          </div>
        </div>
        <p className="login-domain" data-testid="login-domain">aion.wexon.dev</p>
      </section>

      <section className="login-panel" aria-label="Admin giriş paneli">
        <div className="login-mobile-brand" data-testid="login-mobile-brand">AION</div>
        <div className="login-card live-glow-surface" data-testid="login-card" {...liveGlowHandlers}>
          <div className="login-card-icon" aria-hidden="true"><LockKeyhole size={22} /></div>
          <p className="login-card-kicker" data-testid="login-card-kicker">Admin erişimi</p>
          <h2 data-testid="login-card-heading">Tekrar hoş geldin.</h2>
          <p className="login-card-copy" data-testid="login-card-copy">
            AION çalışma alanına devam etmek için bilgilerini gir.
          </p>

          <form className="login-form" onSubmit={handleSubmit} data-testid="login-form">
            <div className="login-field">
              <Label htmlFor="username" data-testid="login-username-label">Kullanıcı adı</Label>
              <div className="login-input-wrap">
                <UserRound size={17} aria-hidden="true" />
                <Input
                  id="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="login-input"
                  autoComplete="username"
                  placeholder="Kullanıcı adını gir"
                  disabled={remainingSeconds > 0}
                  aria-invalid={Boolean(feedback) && !remainingSeconds}
                  data-testid="login-username-input"
                />
              </div>
            </div>

            <div className="login-field">
              <Label htmlFor="password" data-testid="login-password-label">Şifre</Label>
              <div className="login-input-wrap">
                <LockKeyhole size={17} aria-hidden="true" />
                <Input
                  id="password"
                  type={passwordVisible ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="login-input login-password-input"
                  autoComplete="current-password"
                  placeholder="Şifreni gir"
                  disabled={remainingSeconds > 0}
                  aria-invalid={Boolean(feedback) && !remainingSeconds}
                  data-testid="login-password-input"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setPasswordVisible((visible) => !visible)}
                  aria-label={passwordVisible ? "Şifreyi gizle" : "Şifreyi göster"}
                  data-testid="login-password-toggle"
                >
                  {passwordVisible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                </button>
              </div>
            </div>

            <div className="login-feedback" aria-live="polite" data-testid="login-feedback">
              {remainingSeconds > 0 ? `Yeni deneme için ${remainingSeconds} saniye bekle.` : feedback}
            </div>

            <Button
              type="submit"
              className="login-submit"
              disabled={submitting || remainingSeconds > 0}
              data-testid="login-submit-button"
            >
              {remainingSeconds > 0
                ? `${remainingSeconds} saniye bekle`
                : submitting
                  ? "Doğrulanıyor..."
                  : "AION'a giriş yap"}
            </Button>
          </form>

          <div className="login-card-footer" data-testid="login-card-footer">
            <ShieldCheck size={14} aria-hidden="true" /> Yalnızca yetkili erişim
          </div>
        </div>
      </section>
    </main>
  );
}