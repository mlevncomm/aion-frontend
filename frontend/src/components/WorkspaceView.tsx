import { useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowUpRight,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Database,
  Gauge,
  History,
  KeyRound,
  MessageCircle,
  Palette,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  Workflow,
} from "lucide-react";
import type { AgentChatSession, AionSettings, AionStatusSummary } from "@/lib/aionApi";

export type WorkspaceViewId = "projects" | "inbox" | "library" | "automations" | "settings" | "profile";

interface WorkspaceViewProps {
  view: WorkspaceViewId;
  status: AionStatusSummary | null;
  settings: AionSettings | null;
  sessions: AgentChatSession[];
  loading: boolean;
  onRefresh: () => void;
  onAsk: (prompt: string) => void;
  onOpenSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onOpenTheme: () => void;
}

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};
}

function stringValue(value: unknown, fallback = "—"): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function listValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function formatObserved(value?: number): string {
  if (!value) return "Henüz ölçüm yok";
  const epochMs = value < 10_000_000_000 ? value * 1000 : value;
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(epochMs));
}

function formatSessionTime(value?: number): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusTone(value: string): "ok" | "warn" | "bad" | "muted" {
  const normalized = value.toLowerCase();
  if (["error", "failed", "500", "blocked", "offline", "down"].some((word) => normalized.includes(word))) return "bad";
  if (["auth", "unknown", "stale", "404", "not_found", "warning", "pending"].some((word) => normalized.includes(word))) return "warn";
  if (["connected", "reachable", "active", "healthy", "success", "ok", "200", "observed"].some((word) => normalized.includes(word))) return "ok";
  return "muted";
}

function StatusPill({ value }: { value: string }) {
  const tone = statusTone(value);
  return <span className={`workspace-status-pill is-${tone}`}>{value}</span>;
}

function EmptyState({ icon, title, copy }: { icon: ReactNode; title: string; copy: string }) {
  return (
    <div className="workspace-empty">
      <span className="workspace-empty-icon">{icon}</span>
      <strong>{title}</strong>
      <p>{copy}</p>
    </div>
  );
}

function Header({
  eyebrow,
  title,
  copy,
  loading,
  onRefresh,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <header className="workspace-view-header">
      <div>
        <p className="workspace-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="workspace-view-copy">{copy}</p>
      </div>
      <button type="button" className="workspace-refresh" onClick={onRefresh} disabled={loading}>
        <RefreshCw size={15} className={loading ? "is-spinning" : undefined} />
        {loading ? "Güncelleniyor" : "Yenile"}
      </button>
    </header>
  );
}

export default function WorkspaceView({
  view,
  status,
  settings,
  sessions,
  loading,
  onRefresh,
  onAsk,
  onOpenSession,
  onDeleteSession,
  onOpenTheme,
}: WorkspaceViewProps) {
  const [query, setQuery] = useState("");
  const projects = useMemo(() => listValue(status?.projects).map(record), [status]);
  const alerts = useMemo(() => listValue(status?.alerts).map((item) => stringValue(item, "Bilinmeyen uyarı")), [status]);
  const filteredProjects = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");
    if (!q) return projects;
    return projects.filter((project) => `${stringValue(project.name, "")} ${stringValue(project.description, "")} ${stringValue(project.id, "")}`.toLocaleLowerCase("tr-TR").includes(q));
  }, [projects, query]);
  const filteredSessions = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");
    if (!q) return sessions;
    return sessions.filter((session) => `${session.title} ${session.preview ?? ""}`.toLocaleLowerCase("tr-TR").includes(q));
  }, [query, sessions]);

  if (view === "projects") {
    return (
      <div className="workspace-view">
        <Header eyebrow="Canlı çalışma alanı" title="Projeler" copy="AION'un gerçek kaynaklardan gördüğü proje, repo ve uygulama durumları." loading={loading} onRefresh={onRefresh} />
        <div className="workspace-toolbar">
          <div className="workspace-search"><BriefcaseBusiness size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Proje ara" /></div>
          <span className="workspace-observed"><Clock3 size={13} /> {formatObserved(status?.observed_at)}</span>
        </div>
        <div className="workspace-project-grid">
          {filteredProjects.map((project, index) => {
            const application = record(project.application);
            const checks = record(application.checks);
            const checkEntries = Object.entries(checks).slice(0, 5);
            const sources = record(project.sources);
            const name = stringValue(project.name, stringValue(project.id, `Proje ${index + 1}`));
            const projectStatus = stringValue(project.status, "Durum bilinmiyor");
            return (
              <article key={stringValue(project.id, `${name}-${index}`)} className="workspace-project-card">
                <div className="workspace-card-topline">
                  <span className="workspace-card-icon"><BriefcaseBusiness size={17} /></span>
                  <StatusPill value={projectStatus} />
                </div>
                <h2>{name}</h2>
                <p>{stringValue(project.description, "AION kaynaklarından izlenen proje.")}</p>
                <div className="workspace-project-meta">
                  <span><Database size={12} /> {Object.keys(sources).length} kaynak</span>
                  <span><Gauge size={12} /> {stringValue(project.environment, "ortam belirtilmedi")}</span>
                </div>
                {checkEntries.length > 0 ? (
                  <div className="workspace-check-list">
                    {checkEntries.map(([key, raw]) => {
                      const item = record(raw);
                      const checkStatus = stringValue(item.status, stringValue(item.http_status, "bilinmiyor"));
                      return (
                        <div key={key} className="workspace-check-row">
                          <span>{key.replaceAll("_", " ")}</span>
                          <StatusPill value={item.http_status ? `${stringValue(item.http_status)} · ${checkStatus}` : checkStatus} />
                        </div>
                      );
                    })}
                  </div>
                ) : null}
                <button type="button" className="workspace-card-action" onClick={() => onAsk(`AION, ${name} projesini gerçek kaynaklardan ayrıntılı kontrol et. Sorunları ve sıradaki en mantıklı işi kısa Türkçe anlat.`)}>
                  AION'a sor <ArrowUpRight size={14} />
                </button>
              </article>
            );
          })}
        </div>
        {!loading && filteredProjects.length === 0 ? <EmptyState icon={<BriefcaseBusiness size={20} />} title="Proje bulunamadı" copy="Arama filtresini temizle veya kaynakları yenile." /> : null}
      </div>
    );
  }

  if (view === "inbox") {
    return (
      <div className="workspace-view">
        <Header eyebrow="Dikkat gerektirenler" title="Gelen Kutusu" copy="AION'un gerçek kaynaklardan ürettiği uyarılar ve belirsizlikler." loading={loading} onRefresh={onRefresh} />
        <div className="workspace-kpi-row">
          <div className="workspace-kpi"><span className="workspace-kpi-icon is-warn"><AlertTriangle size={17} /></span><div><strong>{alerts.length}</strong><span>aktif uyarı</span></div></div>
          <div className="workspace-kpi"><span className="workspace-kpi-icon"><Clock3 size={17} /></span><div><strong>{status ? (status.stale ? "Eski" : "Güncel") : "Bilinmiyor"}</strong><span>kaynak görünümü</span></div></div>
          <div className="workspace-kpi"><span className="workspace-kpi-icon"><Server size={17} /></span><div><strong>{projects.length}</strong><span>izlenen proje</span></div></div>
        </div>
        <div className="workspace-alert-list">
          {alerts.map((alert, index) => (
            <article key={`${alert}-${index}`} className="workspace-alert-card">
              <span className="workspace-alert-icon"><AlertTriangle size={17} /></span>
              <div><strong>Kontrol gerekiyor</strong><p>{alert}</p></div>
              <button type="button" onClick={() => onAsk(`AION, şu uyarıyı gerçek kaynaklardan incele ve ne yapmam gerektiğini söyle: ${alert}`)}>İncele</button>
            </article>
          ))}
        </div>
        {!loading && alerts.length === 0 ? <EmptyState icon={<CheckCircle2 size={21} />} title="Yeni uyarı yok" copy="AION şu an için dikkat gerektiren bir kaynak uyarısı raporlamıyor." /> : null}
      </div>
    );
  }

  if (view === "library") {
    return (
      <div className="workspace-view">
        <Header eyebrow="Kalıcı sohbet geçmişi" title="Geçmiş" copy="AION backend'inde saklanan gerçek sohbet oturumların. Buradan kaldığın yerden devam edebilirsin." loading={loading} onRefresh={onRefresh} />
        <div className="workspace-toolbar">
          <div className="workspace-search"><History size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Sohbetlerde ara" /></div>
          <span className="workspace-observed">{sessions.length} oturum</span>
        </div>
        <div className="workspace-session-list">
          {filteredSessions.map((session) => (
            <article key={session.session_id} className="workspace-session-card">
              <button type="button" className="workspace-session-main" onClick={() => onOpenSession(session.session_id)}>
                <span className="workspace-session-icon"><MessageCircle size={16} /></span>
                <span className="workspace-session-copy">
                  <strong>{session.title || "AION sohbeti"}</strong>
                  <small>{session.preview || "Bu sohbette henüz özet yok."}</small>
                  <span>{formatSessionTime(session.updated_ms)}{session.message_count ? ` · ${session.message_count} mesaj` : ""}</span>
                </span>
                <ArrowUpRight size={15} />
              </button>
              <button type="button" className="workspace-delete" onClick={() => onDeleteSession(session.session_id)} aria-label="Sohbeti sil"><Trash2 size={15} /></button>
            </article>
          ))}
        </div>
        {!loading && filteredSessions.length === 0 ? <EmptyState icon={<Archive size={21} />} title="Sohbet geçmişi boş" copy="Yeni bir AION sohbeti başlattığında burada görünür." /> : null}
      </div>
    );
  }

  if (view === "automations") {
    const brief = settings?.daily_brief ? stringValue(settings.daily_brief) : "Durum alınamadı";
    return (
      <div className="workspace-view">
        <Header eyebrow="Arka plan akışları" title="Otomasyonlar" copy="Sadece gerçek backend durumları gösterilir; sahte aç/kapat anahtarları yok." loading={loading} onRefresh={onRefresh} />
        <div className="workspace-automation-grid">
          <article className="workspace-automation-card">
            <span className="workspace-card-icon"><Sparkles size={17} /></span>
            <div><p className="workspace-card-kicker">Sistem akışı</p><h2>Günlük Brief</h2><p>Projeler, servisler ve kritik uyarılar için AION özeti.</p></div>
            <StatusPill value={brief} />
            <button type="button" className="workspace-card-action" onClick={() => onAsk("AION, günlük brief sistemimin mevcut durumunu ve son çalışmasını gerçek kaynaklardan kontrol et.")}>Durumu sor <ArrowUpRight size={14} /></button>
          </article>
          <article className="workspace-automation-card">
            <span className="workspace-card-icon"><ShieldCheck size={17} /></span>
            <div><p className="workspace-card-kicker">Güvenlik</p><h2>Onay Politikası</h2><p>Riskli, geri döndürülemez veya dış sisteme yazan işlemler için kullanıcı onayı.</p></div>
            <StatusPill value={stringValue(settings?.approvals, "Durum alınamadı")} />
          </article>
          <article className="workspace-automation-card">
            <span className="workspace-card-icon"><Workflow size={17} /></span>
            <div><p className="workspace-card-kicker">Yeni akış</p><h2>AION ile oluştur</h2><p>Yeni otomasyon ihtiyacını doğal dille tarif et; AION desteklenen altyapıya göre planlasın.</p></div>
            <button type="button" className="workspace-primary-action" onClick={() => onAsk("Yeni bir otomasyon oluşturmak istiyorum. Önce desteklenen gerçek otomasyon altyapısını kontrol et ve benden yalnızca gerekli bilgileri iste.")}>AION ile başlat</button>
          </article>
        </div>
      </div>
    );
  }

  if (view === "settings") {
    return (
      <div className="workspace-view">
        <Header eyebrow="AION çalışma biçimi" title="Ayarlar" copy="Model, güvenlik, ses ve görünüm yapılandırmasının okunabilir özeti." loading={loading} onRefresh={onRefresh} />
        <div className="workspace-settings-grid">
          <article className="workspace-setting-card"><span><Bot size={17} /></span><div><small>Model</small><strong>{stringValue(settings?.provider, "Durum alınamadı")}</strong><p>{stringValue(settings?.model, "Model alınamadı")}</p></div></article>
          <article className="workspace-setting-card"><span><KeyRound size={17} /></span><div><small>Model politikası</small><strong>Yönlendirme</strong><p>{stringValue(settings?.model_policy, "Politika alınamadı")}</p></div></article>
          <article className="workspace-setting-card"><span><ShieldCheck size={17} /></span><div><small>Onaylar</small><strong>Güvenlik sınırı</strong><p>{stringValue(settings?.approvals, "Durum alınamadı")}</p></div></article>
          <article className="workspace-setting-card"><span><Activity size={17} /></span><div><small>Ses</small><strong>Türkçe</strong><p>{stringValue(settings?.voice, "Ses durumu alınamadı")}</p></div></article>
          <article className="workspace-setting-card"><span><Gauge size={17} /></span><div><small>AION Trade</small><strong>{stringValue(settings?.trade, "Durum alınamadı")}</strong><p>Canlı işlem yetkisi UI tarafından varsayılmaz.</p></div></article>
          <button type="button" className="workspace-setting-card is-button" onClick={onOpenTheme}><span><Palette size={17} /></span><div><small>Görünüm</small><strong>Tema ve atmosfer</strong><p>Renk temasını bu tarayıcı için değiştir.</p></div><ArrowUpRight size={15} /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-view">
      <Header eyebrow="Kişisel çalışma alanı" title="Profil" copy="AION bu çalışma alanını tek kullanıcı deneyimi olarak tasarlar." loading={loading} onRefresh={onRefresh} />
      <div className="workspace-profile-card">
        <div className="workspace-profile-avatar">M</div>
        <div className="workspace-profile-copy"><p>Çalışma alanı sahibi</p><h2>Mehmet</h2><span>AION kişisel yapay zekâ işletim sistemi</span></div>
        <StatusPill value="Yetkili oturum" />
      </div>
      <div className="workspace-profile-grid">
        <article><UserRound size={18} /><strong>Tek kullanıcı deneyimi</strong><p>Arayüz kişisel çalışma alanına göre sadeleştirildi; demo panelleri ve gereksiz geliştirici ekranları gösterilmez.</p></article>
        <article><Server size={18} /><strong>Gerçek kaynaklar</strong><p>Proje ve sistem kartları AION backend'inin gördüğü kaynakları kullanır; bilinmeyen durumlar başarı gibi gösterilmez.</p></article>
        <article><ShieldCheck size={18} /><strong>Onaylı eylemler</strong><p>Riskli veya geri döndürülemez işlemler, backend izin politikasından geçmeden UI tarafından çalıştırılmaz.</p></article>
      </div>
    </div>
  );
}
