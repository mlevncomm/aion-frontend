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
  Copy,
  Database,
  Eye,
  EyeOff,
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
import { getAionControlKey, mutateAionTask, type AgentChatSession, type AionPersonalProfile, type AionSettings, type AionStatusSummary } from "@/lib/aionApi";

export type WorkspaceViewId = "projects" | "tasks" | "inbox" | "library" | "automations" | "settings" | "profile";

interface WorkspaceViewProps {
  view: WorkspaceViewId;
  status: AionStatusSummary | null;
  settings: AionSettings | null;
  profile: AionPersonalProfile | null;
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
  profile,
  sessions,
  loading,
  onRefresh,
  onAsk,
  onOpenSession,
  onDeleteSession,
  onOpenTheme,
}: WorkspaceViewProps) {
  const [query, setQuery] = useState("");
  const [controlKey, setControlKey] = useState("");
  const [controlMasked, setControlMasked] = useState("");
  const [controlKeyVisible, setControlKeyVisible] = useState(false);
  const [controlKeyLoading, setControlKeyLoading] = useState(false);
  const [controlKeyNote, setControlKeyNote] = useState("");
  const [taskActionNote, setTaskActionNote] = useState("");
  const [taskActionLoading, setTaskActionLoading] = useState("");
  const projects = useMemo(() => listValue(status?.projects).map(record), [status]);
  const internalTasks = useMemo(() => listValue(status?.internal_tasks).map(record), [status]);
  const observedChanges = useMemo(() => listValue(status?.observed_changes).map(record), [status]);
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

  const revealControlKey = async () => {
    if (controlKey) {
      setControlKeyVisible((visible) => !visible);
      return;
    }
    setControlKeyLoading(true);
    setControlKeyNote("");
    try {
      const data = await getAionControlKey();
      setControlKey(data.key);
      setControlMasked(data.masked);
      setControlKeyVisible(true);
    } catch {
      setControlKeyNote("Erişim anahtarı bu oturumda okunamadı.");
    } finally {
      setControlKeyLoading(false);
    }
  };

  const copyControlKey = async () => {
    if (!controlKey) return;
    try {
      await navigator.clipboard.writeText(controlKey);
      setControlKeyNote("Erişim anahtarı panoya kopyalandı.");
    } catch {
      setControlKeyNote("Panoya kopyalama başarısız oldu.");
    }
  };

  const changeTaskState = async (taskId: string, action: "complete" | "reopen") => {
    if (!taskId || taskActionLoading) return;
    setTaskActionLoading(taskId);
    setTaskActionNote("");
    try {
      await mutateAionTask({ action, task_id: taskId });
      setTaskActionNote(action === "complete" ? "Görev tamamlandı." : "Görev yeniden açıldı.");
      onRefresh();
    } catch {
      setTaskActionNote("Görev durumu güncellenemedi.");
    } finally {
      setTaskActionLoading("");
    }
  };

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

  if (view === "tasks") {
    const sourceWorkCount = listValue(status?.tasks)
      .map(record)
      .filter((item) => ["issue", "pull_request"].includes(stringValue(item.kind, ""))).length;
    const openCount = internalTasks.filter((task) => stringValue(task.status, "pending") !== "completed").length;
    return (
      <div className="workspace-view">
        <Header
          eyebrow="AION görev hafızası"
          title="Görevler"
          copy="Mehmet'in AION içinde gerçek olarak tutulan görevleri. Tamamla/yeniden aç işlemleri doğrudan kişisel görev hafızasına yazılır; dış sistemlerde sahte işlem yapılmaz."
          loading={loading}
          onRefresh={onRefresh}
        />
        <div className="workspace-kpi-row workspace-task-kpis">
          <div className="workspace-kpi"><span className="workspace-kpi-icon"><Clock3 size={17} /></span><div><strong>{openCount}</strong><span>açık iç görev</span></div></div>
          <div className="workspace-kpi"><span className="workspace-kpi-icon"><CheckCircle2 size={17} /></span><div><strong>{internalTasks.length - openCount}</strong><span>tamamlanan</span></div></div>
          <div className="workspace-kpi"><span className="workspace-kpi-icon"><BriefcaseBusiness size={17} /></span><div><strong>{sourceWorkCount}</strong><span>repo işi / PR</span></div></div>
        </div>
        <div className="workspace-task-toolbar">
          <p>{taskActionNote || "AION, doğrudan söylediğin görevleri proje bağlamıyla burada takip eder."}</p>
          <button type="button" onClick={() => onAsk("AION, yeni bir görev eklemek istiyorum. Görevin hangi projemle ilgili olduğunu, başlığını ve önceliğini yalnızca gerekliyse sor; sonra AION iç görev takibine kaydet.")}>Yeni görev ekle</button>
        </div>
        <div className="workspace-task-list">
          {internalTasks.map((task, index) => {
            const id = stringValue(task.id, `task-${index}`);
            const isCompleted = stringValue(task.status, "pending") === "completed";
            const projectId = stringValue(task.project, "aion");
            const projectName = profile?.projects?.find((project) => project.id === projectId)?.name || projectId;
            return (
              <article key={id} className={`workspace-task-card${isCompleted ? " is-completed" : ""}`}>
                <div className="workspace-task-check" aria-hidden="true">{isCompleted ? <CheckCircle2 size={18} /> : <Clock3 size={18} />}</div>
                <div className="workspace-task-copy">
                  <div className="workspace-task-meta">
                    <span>{projectName}</span>
                    <StatusPill value={stringValue(task.priority, "normal")} />
                  </div>
                  <h2>{stringValue(task.title, "İsimsiz görev")}</h2>
                  {stringValue(task.note, "") ? <p>{stringValue(task.note, "")}</p> : null}
                </div>
                <button
                  type="button"
                  className="workspace-task-action"
                  disabled={taskActionLoading === id}
                  onClick={() => { void changeTaskState(id, isCompleted ? "reopen" : "complete"); }}
                  data-testid={`task-${isCompleted ? "reopen" : "complete"}-${id}`}
                >
                  {taskActionLoading === id ? "İşleniyor" : isCompleted ? "Yeniden aç" : "Tamamla"}
                </button>
              </article>
            );
          })}
        </div>
        {!loading && internalTasks.length === 0 ? (
          <EmptyState icon={<CheckCircle2 size={21} />} title="İç görev yok" copy="AION'a doğal şekilde bir görev söyle; görev gerçek kişisel görev hafızasına kaydedilir ve burada görünür." />
        ) : null}
      </div>
    );
  }

  if (view === "inbox") {
    return (
      <div className="workspace-view">
        <Header eyebrow="AION sinyal merkezi" title="Gelen Kutusu" copy="Yeni gelişmeler, gerçek kaynak uyarıları ve AION'un dikkat etmeni istediği değişiklikler." loading={loading} onRefresh={onRefresh} />
        <div className="workspace-kpi-row">
          <div className="workspace-kpi"><span className="workspace-kpi-icon"><Activity size={17} /></span><div><strong>{observedChanges.length}</strong><span>son gelişme</span></div></div>
          <div className="workspace-kpi"><span className="workspace-kpi-icon is-warn"><AlertTriangle size={17} /></span><div><strong>{alerts.length}</strong><span>aktif uyarı</span></div></div>
          <div className="workspace-kpi"><span className="workspace-kpi-icon"><Clock3 size={17} /></span><div><strong>{status ? (status.stale ? "Eski" : "Güncel") : "Bilinmiyor"}</strong><span>kaynak görünümü</span></div></div>
        </div>

        {observedChanges.length > 0 ? (
          <section className="workspace-signal-section">
            <div className="workspace-signal-heading"><span>Son gözlem farkları</span><small>Observer tarafından önceki snapshot ile karşılaştırıldı</small></div>
            <div className="workspace-alert-list">
              {observedChanges.slice(0, 12).map((change, index) => {
                const summary = stringValue(change.summary, "Sistem değişikliği gözlendi.");
                const resource = stringValue(change.resource, "AION");
                return (
                  <article key={`${resource}-${index}`} className="workspace-alert-card is-change">
                    <span className="workspace-alert-icon"><Activity size={17} /></span>
                    <div><strong>{resource}</strong><p>{summary}</p></div>
                    <button type="button" onClick={() => onAsk(`AION, şu yeni gelişmeyi gerçek kaynaklardan incele. Neden önemli, mevcut durum ne ve sıradaki güvenli adım ne: ${summary}`)}>İncele</button>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="workspace-signal-section">
          <div className="workspace-signal-heading"><span>Aktif uyarılar</span><small>{projects.length} alan izleniyor</small></div>
          <div className="workspace-alert-list">
            {alerts.map((alert, index) => (
              <article key={`${alert}-${index}`} className="workspace-alert-card">
                <span className="workspace-alert-icon"><AlertTriangle size={17} /></span>
                <div><strong>Kontrol gerekiyor</strong><p>{alert}</p></div>
                <button type="button" onClick={() => onAsk(`AION, şu uyarıyı gerçek kaynaklardan incele ve ne yapmam gerektiğini söyle: ${alert}`)}>İncele</button>
              </article>
            ))}
          </div>
        </section>
        {!loading && alerts.length === 0 && observedChanges.length === 0 ? <EmptyState icon={<CheckCircle2 size={21} />} title="Yeni sinyal yok" copy="AION şu an için yeni bir değişiklik veya dikkat gerektiren kaynak uyarısı raporlamıyor." /> : null}
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
    const scheduledBrief = record(status?.scheduled_brief);
    const scheduledBriefTime = typeof scheduledBrief.time === "number" ? formatObserved(scheduledBrief.time) : "Henüz kayıt yok";
    const brief = Object.keys(scheduledBrief).length > 0 ? `Aktif · son kayıt ${scheduledBriefTime}` : (settings?.daily_brief ? stringValue(settings.daily_brief) : "Henüz çalışmadı");
    const workflows = profile?.workflows ?? [];
    const icons = [Sparkles, Activity, AlertTriangle, Workflow, ShieldCheck];
    return (
      <div className="workspace-view">
        <Header
          eyebrow="Mehmet için çalışan akışlar"
          title="Otomasyonlar"
          copy="PDF sözleşmesindeki aktif asistan mantığına göre AION'un izlemesi ve ilerletmesi gereken kişisel akışlar. Sahte aç/kapat anahtarı gösterilmez."
          loading={loading}
          onRefresh={onRefresh}
        />
        <div className="workspace-automation-grid is-personal">
          {workflows.map((workflow, index) => {
            const Icon = icons[index % icons.length];
            const isBrief = workflow.id === "daily-brief";
            return (
              <article key={workflow.id} className="workspace-automation-card">
                <span className="workspace-card-icon"><Icon size={17} /></span>
                <div>
                  <p className="workspace-card-kicker">{isBrief ? "Zamanlanmış akış" : "AION iş akışı"}</p>
                  <h2>{workflow.name}</h2>
                  <p>{workflow.goal}</p>
                </div>
                {isBrief ? <StatusPill value={brief} /> : <StatusPill value="AION bağlamında" />}
                <button
                  type="button"
                  className="workspace-card-action"
                  onClick={() => onAsk(`AION, ${workflow.name} akışının şu an ne durumda olduğunu gerçek kaynaklardan kontrol et. Çalışan, eksik ve sıradaki adımı açıkça söyle.`)}
                >
                  Durumu sor <ArrowUpRight size={14} />
                </button>
              </article>
            );
          })}
          <article className="workspace-automation-card workspace-autonomy-card">
            <span className="workspace-card-icon"><ShieldCheck size={17} /></span>
            <div>
              <p className="workspace-card-kicker">AION davranışı</p>
              <h2>Otonomi sınırı</h2>
              <p>Okuma, özetleme ve güvenli iç görev takibi otomatik; riskli dış yazma, finansal, hukuki veya geri döndürülemez işler açık onay sınırında.</p>
            </div>
            <StatusPill value={stringValue(settings?.approvals, "Onay politikası")} />
          </article>
          <article className="workspace-automation-card">
            <span className="workspace-card-icon"><Workflow size={17} /></span>
            <div>
              <p className="workspace-card-kicker">Yeni kişisel akış</p>
              <h2>AION'a tarif et</h2>
              <p>Takip etmesini veya otomatik ilerletmesini istediğin yeni süreci doğal Türkçe anlat; AION önce gerçek altyapı ve yetki sınırını kontrol etsin.</p>
            </div>
            <button type="button" className="workspace-primary-action" onClick={() => onAsk("Yeni bir kişisel AION iş akışı oluşturmak istiyorum. Önce gerçek mevcut altyapıyı ve izin sınırını kontrol et; yalnızca gerekli bilgileri sor ve sahte entegrasyon varsayma.")}>AION ile başlat</button>
          </article>
        </div>
      </div>
    );
  }

  if (view === "settings") {
    const vercel = record(status?.vercel);
    const supabase = record(status?.supabase);
    const trade = projects.find((project) => stringValue(project.id, "") === "aion-trade") ?? {};
    const vercelStatus = stringValue(vercel.status, "BLOCKED_CONNECTION");
    const supabaseStatus = stringValue(supabase.status, "BLOCKED_CONNECTION");
    const tradeTelemetry = stringValue(trade.positions, "BLOCKED_CONNECTION");
    return (
      <div className="workspace-view">
        <Header eyebrow="AION çalışma biçimi" title="Ayarlar" copy="Model, güvenlik, ses ve görünüm yapılandırmasının okunabilir özeti." loading={loading} onRefresh={onRefresh} />
        <div className="workspace-settings-grid">
          <article className="workspace-setting-card"><span><Bot size={17} /></span><div><small>Model</small><strong>{stringValue(settings?.provider, "Durum alınamadı")}</strong><p>{stringValue(settings?.model, "Model alınamadı")}</p></div></article>
          <article className="workspace-setting-card"><span><KeyRound size={17} /></span><div><small>Model politikası</small><strong>Yönlendirme</strong><p>{stringValue(settings?.model_policy, "Politika alınamadı")}</p></div></article>
          <article className="workspace-setting-card"><span><ShieldCheck size={17} /></span><div><small>Onaylar</small><strong>Güvenlik sınırı</strong><p>{stringValue(settings?.approvals, "Durum alınamadı")}</p></div></article>
          <article className="workspace-setting-card"><span><Activity size={17} /></span><div><small>Ses</small><strong>Türkçe</strong><p>{stringValue(settings?.voice, "Ses durumu alınamadı")}</p></div></article>
          <article className="workspace-setting-card"><span><Gauge size={17} /></span><div><small>AION Trade</small><strong>{stringValue(settings?.trade, "Durum alınamadı")}</strong><p>Canlı işlem yetkisi UI tarafından varsayılmaz.</p></div></article>
          <article className="workspace-setting-card workspace-access-card">
            <span><KeyRound size={17} /></span>
            <div>
              <small>Public erişim</small>
              <strong>aion.wexon.dev</strong>
              <p className="workspace-access-key">{controlKey ? (controlKeyVisible ? controlKey : controlMasked || "••••••••") : "Anahtarı yalnız gerektiğinde göster."}</p>
              {controlKeyNote ? <p className="workspace-access-note" role="status">{controlKeyNote}</p> : null}
              <div className="workspace-access-actions">
                <button type="button" onClick={() => { void revealControlKey(); }} disabled={controlKeyLoading}>{controlKeyVisible ? <EyeOff size={14} /> : <Eye size={14} />}{controlKeyLoading ? "Alınıyor" : controlKeyVisible ? "Gizle" : "Göster"}</button>
                <button type="button" onClick={() => { void copyControlKey(); }} disabled={!controlKey}><Copy size={14} /> Kopyala</button>
              </div>
            </div>
          </article>
          <button type="button" className="workspace-setting-card is-button" onClick={onOpenTheme}><span><Palette size={17} /></span><div><small>Görünüm</small><strong>Tema ve atmosfer</strong><p>Renk temasını bu tarayıcı için değiştir.</p></div><ArrowUpRight size={15} /></button>
        </div>

        <section className="workspace-connections-panel" aria-label="AION bağlantıları">
          <div className="workspace-connections-heading">
            <div><small>Gerçek veri kaynakları</small><strong>Bağlantılar</strong></div>
            <span>Credential değerleri UI'da gösterilmez</span>
          </div>
          <div className="workspace-connection-grid">
            <article className="workspace-connection-card">
              <div className="workspace-connection-top"><span><Server size={17} /></span><StatusPill value={vercelStatus} /></div>
              <h3>Vercel Account API</h3>
              <p>Public HTTP kontrolleri çalışıyor. Hesap, proje ve deployment telemetrisi için read-only Vercel tokenı gerekiyor.</p>
              {vercelStatus !== "CONNECTED" ? <code>AION_VERCEL_TOKEN</code> : null}
              <button type="button" onClick={() => onAsk("AION, Vercel account API bağlantım eksik. Güvenli read-only bağlantı için tam olarak hangi tokenı oluşturmam gerektiğini ve /opt/aion-next/.env içinde hangi değişkeni dolduracağımı adım adım söyle. Token değerini sohbete yazmamı isteme.")}>Kurulum adımlarını göster</button>
            </article>
            <article className="workspace-connection-card">
              <div className="workspace-connection-top"><span><Database size={17} /></span><StatusPill value={supabaseStatus} /></div>
              <h3>Supabase</h3>
              <p>AION yalnız publishable/anon seviyesinde metadata okuyacak. Service-role veya SQL yetkisi bu bağlantıda kabul edilmez.</p>
              {supabaseStatus !== "CONNECTED" ? <code>AION_SUPABASE_HOST · AION_SUPABASE_PUBLISHABLE_KEY</code> : null}
              <button type="button" onClick={() => onAsk("AION, Supabase read-only bağlantım eksik. Bana host ve publishable/anon key'i güvenli şekilde nereden alacağımı ve /opt/aion-next/.env değişkenlerini nasıl dolduracağımı anlat. Service-role isteme.")}>Kurulum adımlarını göster</button>
            </article>
            <article className="workspace-connection-card">
              <div className="workspace-connection-top"><span><Gauge size={17} /></span><StatusPill value={tradeTelemetry} /></div>
              <h3>AION Trade Telemetri</h3>
              <p>Public web/API health izleniyor; pozisyon, strateji ve risk telemetrisi henüz AION'a read-only bağlı değil. LIVE işlem yetkisi açılmaz.</p>
              <code>PAPER-first · SPOT-only · no withdrawal</code>
              <button type="button" onClick={() => onAsk("AION, AION Trade için yalnız read-only pozisyon, strateji ve risk telemetrisi bağlantısını planla. LIVE işlem, withdrawal veya emir yetkisi verme. Önce mevcut gerçek API yüzeyini ve gereken en düşük yetkiyi kontrol et.")}>Telemetri planını incele</button>
            </article>
          </div>
        </section>
      </div>
    );
  }

  const owner = profile?.owner;
  const operatingRules = profile?.operating_rules ?? [];
  const autonomy = profile?.autonomy;
  return (
    <div className="workspace-view">
      <Header
        eyebrow="Kişisel AION sözleşmesi"
        title="Mehmet'in AION'u"
        copy="Bu profil generic bir kullanıcı ayarı değil; AION'un kimi desteklediğini, hangi işleri takip ettiğini ve hangi güvenlik sınırlarıyla çalıştığını tanımlar."
        loading={loading}
        onRefresh={onRefresh}
      />
      <div className="workspace-profile-card is-personal-profile">
        <div className="workspace-profile-avatar">M</div>
        <div className="workspace-profile-copy">
          <p>Tek kullanıcı · Europe/Istanbul · Türkçe</p>
          <h2>{owner?.name || "Mehmet"}</h2>
          <span>{owner?.relationship || "AION kişisel yapay zekâ işletim sistemi"}</span>
        </div>
        <StatusPill value="Kişisel profil aktif" />
      </div>

      <article className="personal-success-card">
        <span><Sparkles size={18} /></span>
        <div>
          <small>Başarı tanımı</small>
          <strong>Benim için gerçek AION ne demek?</strong>
          <p>{owner?.success_definition || "Gerçek kaynakları takip eden, güvenli biçimde işleri ilerleten ve bana ne yaptığını anlatan kişisel AI OS."}</p>
        </div>
      </article>

      <div className="workspace-profile-grid">
        <article>
          <UserRound size={18} />
          <strong>Sadece Mehmet için</strong>
          <p>{profile?.projects?.length ?? 0} kişisel proje/alan; AION, WEXON, AION Trade, Moon Modes ve altyapı bağlamı tek çalışma alanında tutulur.</p>
        </article>
        <article>
          <Server size={18} />
          <strong>Gerçek kaynak politikası</strong>
          <p>Bağlantısı olmayan veri başarı, boşluk veya sağlık olarak yorumlanmaz. AION yalnız gördüğü kanıt kadar iddialı konuşur.</p>
        </article>
        <article>
          <ShieldCheck size={18} />
          <strong>Otonomi sınırı</strong>
          <p>{(autonomy?.automatic ?? []).slice(0, 2).join(" · ") || "Güvenli okuma ve iç organizasyon otomatik."}</p>
        </article>
      </div>

      <section className="personal-rules-panel">
        <div className="personal-rules-heading">
          <div><small>AION davranış kuralları</small><strong>Değişmeyen sınırlar</strong></div>
          <StatusPill value={`${operatingRules.length} kural`} />
        </div>
        <div className="personal-rules-list">
          {operatingRules.map((rule, index) => (
            <div key={`${rule}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><p>{rule}</p></div>
          ))}
        </div>
      </section>
    </div>
  );
}
