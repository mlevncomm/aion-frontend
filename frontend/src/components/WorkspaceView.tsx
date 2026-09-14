import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowUpRight,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Copy,
  Database,
  Eye,
  EyeOff,
  Gauge,
  History,
  KeyRound,
  Laptop,
  Link2,
  ListChecks,
  MessageCircle,
  MonitorDown,
  Palette,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  Workflow,
} from "lucide-react";
import {
  connectMarketplaceToken,
  createAionDevicePairing,
  deleteAionOAuthClient,
  disconnectAionIntegration,
  disconnectMarketplacePlugin,
  getAionControlKey,
  getAionDeviceCommands,
  getAionDevices,
  getAionOAuthClients,
  getAionReadiness,
  getAionVoiceSettings,
  getMarketplacePlugins,
  listElevenLabsVoices,
  mutateAionTask,
  pollMarketplaceConnect,
  previewElevenLabsVoices,
  queueAionDeviceCommand,
  revokeAionDevice,
  saveAionIntegration,
  saveAionOAuthClient,
  saveAionVoiceSettings,
  startMarketplaceConnect,
  updateAionDevicePermissions,
  type AgentChatSession,
  type AionDevice,
  type AionDeviceCommand,
  type AionDevicePairing,
  type AionIntegrations,
  type AionOAuthClients,
  type AionPersonalProfile,
  type AionReadiness,
  type AionSettings,
  type AionStatusSummary,
  type AionVoiceSettings,
  type ElevenLabsVoice,
  type MarketplacePlugin,
} from "@/lib/aionApi";
import { ApiError } from "@/lib/api";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

// Owner-facing setup instructions live next to the form that consumes them.
// They describe the real provider screens and the least privilege that works,
// so the owner never has to guess a scope or paste an over-powered secret.
const SETUP_STEPS: Record<string, { title: string; steps: string[]; note?: string }> = {
  vercel: {
    title: "Vercel tokenını adım adım al",
    steps: [
      "vercel.com/account/tokens sayfasını aç.",
      "Create Token de; kapsam olarak yalnız kendi hesabını seç ve bir son kullanma tarihi ver.",
      "Tokenı kopyala. Vercel bu değeri bir daha göstermez.",
      "Tokenı yukarıdaki alana yapıştır ve Kaydet ve test et de.",
      "AION kaydetmeden önce Vercel API'sine gerçek bir istek atar; istek başarısızsa bağlantı kaydedilmez.",
    ],
  },
  supabase: {
    title: "Supabase bilgilerini adım adım al",
    steps: [
      "supabase.com/dashboard adresinden projeni aç.",
      "Project Settings > API bölümüne gir.",
      "Project URL değerini Host alanına yapıştır.",
      "anon / publishable key değerini kopyalayıp key alanına yapıştır.",
      "Kaydet ve test et de; AION önce Supabase REST uçlarına gerçek bir istek atar.",
    ],
    note: "service_role anahtarını asla girme. AION bu anahtarı kabul etmez; girilirse bağlantı reddedilir.",
  },
  elevenlabs: {
    title: "ElevenLabs sesini adım adım bağla",
    steps: [
      "elevenlabs.io hesabında Profile > API Keys bölümünü aç.",
      "Yeni bir key oluştur. Text to Speech izni yeterlidir; Voice Library izni gerekmez.",
      "Keyi yukarı yapıştır ve Sesleri getir de.",
      "Türkçe için doğal bulduğun sesi listeden seç.",
      "Kaydet ve test et de; AION gerçek bir TTS örneği üretir.",
    ],
    note: "Gerçek bir ses örneği üretilemezse premium ses READY sayılmaz ve yerel Piper fallback açık kalır.",
  },
  devices: {
    title: "Cihaz eşleştirmesini adım adım yap",
    steps: [
      "Bu sayfada Windows eşleştirme kodu oluştur düğmesine bas.",
      "Kurulum komutunu kopyala düğmesine bas; komut panoya gider.",
      "Windows'ta Başlat'a PowerShell yaz, normal kullanıcı olarak aç (yönetici gerekmez).",
      "Komutu yapıştır ve Enter'a bas. Companion, AION'un sunucusundan inip çalışmaya başlar.",
      "Pencereyi açık bırak; kapatırsan cihaz çevrimdışı olur.",
      "Eşleşme bitince bu sayfada yetkileri tek tek aç; hepsi kapalı başlar.",
    ],
    note: "İndirilecek ayrı bir Companion uygulaması yoktur. Companion, kopyaladığın komutun indirip çalıştırdığı PowerShell betiğidir; kaynağını aşağıdaki bağlantıdan okuyabilirsin.",
  },
  desktop: {
    title: "Masaüstü kısayolunu adım adım kur",
    steps: [
      "Windows kurulum komutunu kopyala düğmesine bas.",
      "Başlat'a PowerShell yaz ve normal kullanıcı olarak aç (yönetici gerekmez).",
      "Komutu yapıştır, Enter'a bas. Birkaç saniye sürer.",
      "Masaüstünde ve Başlat menüsünde AION simgesi çıkar; çift tıkla.",
      "Kaldırmak istersen aynı komutu sonuna -Remove ekleyerek çalıştır.",
    ],
    note: "Kurucu yalnız bir kısayol oluşturur: Edge veya Chrome'u uygulama kipinde AION adresine yönlendirir. Bilgisayarına program kurmaz, servis çalıştırmaz.",
  },
  aion_trade: {
    title: "AION Trade telemetrisi için gerekenler",
    steps: [
      "Read-only pozisyon, strateji ve risk uçlarını veren bir API sözleşmesi tanımlanmalı.",
      "Anahtar yalnız SPOT okuma yetkisi taşımalı; emir ve withdrawal yetkisi verilmemeli.",
      "Sözleşme hazır olduğunda bu kart bağlantı formuna dönüşür.",
    ],
    note: "Bu madde şu anda BLOCKED. AION bu telemetriyi bağlı gibi göstermez ve LIVE işlem yetkisi açmaz.",
  },
};

function SetupSteps({ id }: { id: keyof typeof SETUP_STEPS }) {
  const [open, setOpen] = useState(false);
  const guide = SETUP_STEPS[id];
  if (!guide) return null;
  return (
    <div className={`workspace-setup-steps${open ? " is-open" : ""}`} data-testid={`setup-steps-${id}`}>
      <button
        type="button"
        className="workspace-setup-toggle"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        data-testid={`setup-steps-toggle-${id}`}
      >
        <ListChecks size={14} aria-hidden="true" />
        <span>{guide.title}</span>
        <ChevronDown size={14} aria-hidden="true" className="workspace-setup-chevron" />
      </button>
      {open ? (
        <div className="workspace-setup-body">
          <ol className="workspace-setup-list">
            {guide.steps.map((step) => <li key={step}>{step}</li>)}
          </ol>
          {guide.note ? <p className="workspace-setup-warning">{guide.note}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

export type WorkspaceViewId = "projects" | "tasks" | "devices" | "inbox" | "library" | "automations" | "settings" | "profile";

interface WorkspaceViewProps {
  view: WorkspaceViewId;
  status: AionStatusSummary | null;
  settings: AionSettings | null;
  integrations: AionIntegrations | null;
  profile: AionPersonalProfile | null;
  sessions: AgentChatSession[];
  loading: boolean;
  onRefresh: () => void;
  onAsk: (prompt: string) => void;
  onOpenSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onOpenTheme: () => void;
  onNavigate?: (surface: string, anchor: string) => void;
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

function apiErrorDetail(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const body = record(error.body);
    const detail = body.detail;
    if (typeof detail === "string" && detail.trim()) return detail.trim();
  }
  return fallback;
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
  if (["auth", "unknown", "stale", "404", "not_found", "warning", "pending", "owner_connection", "verify_on_device"].some((word) => normalized.includes(word))) return "warn";
  if (["connected", "reachable", "active", "healthy", "success", "ok", "200", "observed", "ready"].some((word) => normalized.includes(word))) return "ok";
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
  integrations,
  profile,
  sessions,
  loading,
  onRefresh,
  onAsk,
  onOpenSession,
  onDeleteSession,
  onOpenTheme,
  onNavigate,
}: WorkspaceViewProps) {
  const [query, setQuery] = useState("");
  const { state: installState, install } = useInstallPrompt();
  const [installNote, setInstallNote] = useState("");
  const [controlKey, setControlKey] = useState("");
  const [controlMasked, setControlMasked] = useState("");
  const [controlKeyVisible, setControlKeyVisible] = useState(false);
  const [controlKeyLoading, setControlKeyLoading] = useState(false);
  const [controlKeyNote, setControlKeyNote] = useState("");
  const [taskActionNote, setTaskActionNote] = useState("");
  const [taskActionLoading, setTaskActionLoading] = useState("");
  const [vercelToken, setVercelToken] = useState("");
  const [supabaseHost, setSupabaseHost] = useState("");
  const [supabaseKey, setSupabaseKey] = useState("");
  const [integrationBusy, setIntegrationBusy] = useState("");
  const [integrationNote, setIntegrationNote] = useState<Record<string, string>>({});
  const [marketplacePlugins, setMarketplacePlugins] = useState<MarketplacePlugin[]>([]);
  const [marketplaceLoading, setMarketplaceLoading] = useState(false);
  const [marketplaceQuery, setMarketplaceQuery] = useState("");
  const [marketplaceToken, setMarketplaceToken] = useState("");
  const [marketplaceSelected, setMarketplaceSelected] = useState("");
  const [marketplaceBusy, setMarketplaceBusy] = useState("");
  const [marketplaceNote, setMarketplaceNote] = useState("");
  const [oauthClients, setOauthClients] = useState<AionOAuthClients | null>(null);
  const [readiness, setReadiness] = useState<AionReadiness | null>(null);
  const [oauthFamily, setOauthFamily] = useState("");
  const [oauthClientId, setOauthClientId] = useState("");
  const [oauthClientSecret, setOauthClientSecret] = useState("");
  const [oauthBusy, setOauthBusy] = useState(false);
  const [oauthNote, setOauthNote] = useState("");
  const [elevenApiKey, setElevenApiKey] = useState("");
  const [elevenVoiceId, setElevenVoiceId] = useState("");
  const [elevenVoices, setElevenVoices] = useState<ElevenLabsVoice[]>([]);
  const [voiceSettingsState, setVoiceSettingsState] = useState<AionVoiceSettings | null>(null);
  const [pronunciationDraft, setPronunciationDraft] = useState("");
  const [devices, setDevices] = useState<AionDevice[]>([]);
  const [deviceCommands, setDeviceCommands] = useState<AionDeviceCommand[]>([]);
  const [devicePairing, setDevicePairing] = useState<AionDevicePairing | null>(null);
  const [deviceBusy, setDeviceBusy] = useState("");
  const [deviceNote, setDeviceNote] = useState("");
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
  const filteredMarketplace = useMemo(() => {
    const q = marketplaceQuery.trim().toLocaleLowerCase("tr-TR");
    const prioritized = [...marketplacePlugins].sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || a.display_name.localeCompare(b.display_name, "tr"));
    if (!q) return prioritized;
    return prioritized.filter((plugin) => `${plugin.display_name} ${plugin.description ?? ""} ${plugin.category ?? ""}`.toLocaleLowerCase("tr-TR").includes(q));
  }, [marketplacePlugins, marketplaceQuery]);

  useEffect(() => {
    if (view !== "settings") return;
    let cancelled = false;
    setMarketplaceLoading(true);
    Promise.allSettled([getMarketplacePlugins(), getAionVoiceSettings(), getAionOAuthClients(), getAionReadiness()]).then(([catalog, voice, oauth, contract]) => {
      if (cancelled) return;
      if (catalog.status === "fulfilled") setMarketplacePlugins(catalog.value.plugins ?? []);
      if (voice.status === "fulfilled") {
        setVoiceSettingsState(voice.value);
        setPronunciationDraft(Object.entries(voice.value.custom_pronunciations ?? {}).map(([term, spoken]) => `${term}=${spoken}`).join("\n"));
      }
      if (oauth.status === "fulfilled") setOauthClients(oauth.value);
      if (contract.status === "fulfilled") setReadiness(contract.value);
      setMarketplaceLoading(false);
    });
    if (integrations?.elevenlabs?.configured) {
      void listElevenLabsVoices().then((voices) => { if (!cancelled) setElevenVoices(voices); }).catch(() => undefined);
    }
    return () => { cancelled = true; };
  }, [view, integrations?.elevenlabs?.configured]);

  useEffect(() => {
    if (view !== "devices") return;
    let cancelled = false;
    setDeviceBusy("loading");
    // Presence and history are loaded together: a device that is online but has
    // never run a command is a different situation from one whose commands are
    // failing, and only the pair distinguishes them.
    const loadHistory = () => {
      void getAionDeviceCommands()
        .then((items) => { if (!cancelled) setDeviceCommands(items); })
        .catch(() => undefined);
    };
    void getAionDevices()
      .then((items) => { if (!cancelled) setDevices(items); })
      .catch(() => { if (!cancelled) setDeviceNote("Cihaz listesi alınamadı."); })
      .finally(() => { if (!cancelled) setDeviceBusy(""); });
    loadHistory();
    const timer = window.setInterval(() => {
      void getAionDevices().then((items) => { if (!cancelled) setDevices(items); }).catch(() => undefined);
      loadHistory();
    }, 10_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [view]);

  const refreshDevices = async () => {
    setDeviceBusy("loading");
    try {
      // History is loaded with the devices so a paired-but-silent companion is
      // distinguishable from one that simply has nothing queued.
      const [list, history] = await Promise.all([
        getAionDevices(),
        getAionDeviceCommands().catch(() => [] as AionDeviceCommand[]),
      ]);
      setDevices(list);
      setDeviceCommands(history);
      setDeviceNote("");
    } catch (error) {
      setDeviceNote(apiErrorDetail(error, "Cihaz listesi alınamadı."));
    } finally {
      setDeviceBusy("");
    }
  };

  const createDevicePair = async () => {
    setDeviceBusy("pairing");
    setDeviceNote("");
    try {
      const pairing = await createAionDevicePairing();
      setDevicePairing(pairing);
      setDeviceNote("Eşleştirme kodu 10 dakika geçerli. Windows komutunu kendi bilgisayarında çalıştır.");
    } catch {
      setDeviceNote("Eşleştirme kodu oluşturulamadı.");
    } finally {
      setDeviceBusy("");
    }
  };

  const copyDesktopSetupCommand = async () => {
    const command = "powershell -NoProfile -ExecutionPolicy Bypass -Command \"$p=Join-Path $env:TEMP 'aion-masaustu-kur.ps1'; iwr https://aion.wexon.dev/api/aion/desktop/windows.ps1 -OutFile $p; & $p\"";
    try {
      await navigator.clipboard.writeText(command);
      setInstallNote("Kurulum komutu panoya kopyalandı. PowerShell'e yapıştırıp Enter'a bas.");
    } catch {
      setInstallNote("Komut panoya kopyalanamadı; Kurucuyu indir bağlantısını kullanabilirsin.");
    }
  };

  const copyWindowsPairCommand = async () => {
    if (!devicePairing) return;
    const command = `powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=Join-Path $env:TEMP 'aion-companion.ps1'; iwr https://aion.wexon.dev/api/aion/devices/companion/windows.ps1 -OutFile $p; & $p -PairToken '${devicePairing.pairing_token}'"`;
    try {
      await navigator.clipboard.writeText(command);
      setDeviceNote("Windows eşleştirme komutu panoya kopyalandı.");
    } catch {
      setDeviceNote("Komut panoya kopyalanamadı.");
    }
  };

  const changeDevicePermission = async (device: AionDevice, permission: string, enabled: boolean) => {
    setDeviceBusy(`${device.id}:${permission}`);
    try {
      const updated = await updateAionDevicePermissions(device.id, { [permission]: enabled });
      setDevices((current) => current.map((item) => item.id === updated.id ? updated : item));
      setDeviceNote(`${device.name}: ${permission} ${enabled ? "açıldı" : "kapatıldı"}.`);
    } catch {
      setDeviceNote("Cihaz yetkisi güncellenemedi.");
    } finally {
      setDeviceBusy("");
    }
  };

  const removePairedDevice = async (device: AionDevice) => {
    setDeviceBusy(`remove:${device.id}`);
    try {
      await revokeAionDevice(device.id);
      setDevices((current) => current.filter((item) => item.id !== device.id));
      setDeviceNote(`${device.name} eşleştirmesi kaldırıldı.`);
    } catch {
      setDeviceNote("Cihaz eşleştirmesi kaldırılamadı.");
    } finally {
      setDeviceBusy("");
    }
  };

  const testDeviceNotification = async (device: AionDevice) => {
    setDeviceBusy(`test:${device.id}`);
    try {
      await queueAionDeviceCommand(device.id, "notify", { text: "AION cihaz bağlantısı aktif." });
      setDeviceNote(`${device.name} için test bildirimi kuyruğa alındı.`);
    } catch (error) {
      setDeviceNote(apiErrorDetail(error, "Test bildirimi gönderilemedi. Bildirim yetkisini aç ve companion'ın çalıştığını kontrol et."));
    } finally {
      setDeviceBusy("");
    }
  };

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

  const saveIntegration = async (provider: "vercel" | "supabase") => {
    if (integrationBusy) return;
    setIntegrationBusy(provider);
    setIntegrationNote((current) => ({ ...current, [provider]: "Bağlantı gerçek API ile test ediliyor…" }));
    try {
      if (provider === "vercel") {
        await saveAionIntegration("vercel", { token: vercelToken });
        setVercelToken("");
      } else {
        await saveAionIntegration("supabase", { host: supabaseHost, publishable_key: supabaseKey });
        setSupabaseKey("");
      }
      setIntegrationNote((current) => ({ ...current, [provider]: "Bağlantı doğrulandı ve güvenli credential store'a kaydedildi." }));
      onRefresh();
    } catch (error) {
      setIntegrationNote((current) => ({
        ...current,
        [provider]: apiErrorDetail(error, "Bağlantı doğrulanamadı. Girdiğin bilgileri kontrol et."),
      }));
    } finally {
      setIntegrationBusy("");
    }
  };

  const disconnectIntegration = async (provider: "vercel" | "supabase" | "elevenlabs") => {
    if (integrationBusy) return;
    const label = provider === "vercel" ? "Vercel" : provider === "supabase" ? "Supabase" : "ElevenLabs";
    if (!window.confirm(`${label} bağlantısını AION'dan kaldırmak istiyor musun?`)) return;
    setIntegrationBusy(provider);
    try {
      await disconnectAionIntegration(provider);
      setIntegrationNote((current) => ({ ...current, [provider]: "Bağlantı kaldırıldı." }));
      if (provider === "elevenlabs") setElevenVoices([]);
      onRefresh();
    } catch (error) {
      setIntegrationNote((current) => ({
        ...current,
        [provider]: apiErrorDetail(error, "Bağlantı kaldırılamadı."),
      }));
    } finally {
      setIntegrationBusy("");
    }
  };

  const refreshMarketplace = async () => {
    setMarketplaceLoading(true);
    try {
      const catalog = await getMarketplacePlugins();
      setMarketplacePlugins(catalog.plugins ?? []);
    } catch (error) {
      setMarketplaceNote(apiErrorDetail(error, "Hesap bağlantıları alınamadı."));
    } finally {
      setMarketplaceLoading(false);
    }
  };

  const startAccountConnect = async (plugin: MarketplacePlugin) => {
    if (marketplaceBusy) return;
    const auth = record(plugin.auth);
    const mode = stringValue(auth.mode, "");
    if (mode === "pat_paste") {
      setMarketplaceSelected(plugin.id);
      setMarketplaceToken("");
      setMarketplaceNote(`${plugin.display_name} API/token alanı açıldı.`);
      return;
    }
    setMarketplaceBusy(plugin.id);
    setMarketplaceNote(`${plugin.display_name} hesap girişi başlatılıyor…`);
    try {
      const flow = await startMarketplaceConnect(plugin.id);
      const flowId = stringValue(flow.flow_id, "");
      const openUrl = stringValue(flow.open_url || flow.verification_uri_complete || flow.verification_uri, "");
      const userCode = stringValue(flow.user_code, "");
      if (openUrl) window.open(openUrl, "_blank", "noopener,noreferrer");
      setMarketplaceNote(userCode ? `${plugin.display_name}: açılan sayfada ${userCode} kodunu kullan.` : `${plugin.display_name}: açılan sağlayıcı sayfasından giriş yap.`);
      if (!flowId) {
        await refreshMarketplace();
        return;
      }
      for (let attempt = 0; attempt < 80; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 1500));
        const state = await pollMarketplaceConnect(plugin.id, flowId);
        const value = stringValue(state.state, "pending");
        if (value === "connected") {
          setMarketplaceNote(`${plugin.display_name} hesabı bağlandı ve doğrulandı.`);
          await refreshMarketplace();
          return;
        }
        if (value === "error") throw new Error(stringValue(state.error, "OAuth bağlantısı tamamlanamadı."));
      }
      setMarketplaceNote(`${plugin.display_name} giriş süresi doldu. Tekrar deneyebilirsin.`);
    } catch (error) {
      setMarketplaceNote(apiErrorDetail(error, error instanceof Error ? error.message : `${plugin.display_name} bağlanamadı.`));
      if (plugin.fallback_auth) setMarketplaceSelected(plugin.id);
    } finally {
      setMarketplaceBusy("");
    }
  };

  const saveMarketplaceToken = async (plugin: MarketplacePlugin) => {
    if (!marketplaceToken.trim() || marketplaceBusy) return;
    setMarketplaceBusy(plugin.id);
    setMarketplaceNote(`${plugin.display_name} tokenı sağlayıcıda doğrulanıyor…`);
    try {
      await connectMarketplaceToken(plugin.id, marketplaceToken.trim());
      setMarketplaceToken("");
      setMarketplaceSelected("");
      setMarketplaceNote(`${plugin.display_name} bağlandı ve doğrulandı.`);
      await refreshMarketplace();
    } catch (error) {
      setMarketplaceNote(apiErrorDetail(error, `${plugin.display_name} tokenı doğrulanamadı.`));
    } finally {
      setMarketplaceBusy("");
    }
  };

  const disconnectMarketplace = async (plugin: MarketplacePlugin) => {
    if (marketplaceBusy || !window.confirm(`${plugin.display_name} hesabını AION'dan ayırmak istiyor musun?`)) return;
    setMarketplaceBusy(plugin.id);
    try {
      await disconnectMarketplacePlugin(plugin.id);
      setMarketplaceNote(`${plugin.display_name} bağlantısı kaldırıldı.`);
      await refreshMarketplace();
    } catch (error) {
      setMarketplaceNote(apiErrorDetail(error, `${plugin.display_name} bağlantısı kaldırılamadı.`));
    } finally {
      setMarketplaceBusy("");
    }
  };

  const previewElevenVoices = async () => {
    if (!elevenApiKey.trim() || integrationBusy) return;
    setIntegrationBusy("elevenlabs-preview");
    setIntegrationNote((current) => ({ ...current, elevenlabs: "Sesler ElevenLabs hesabından alınıyor…" }));
    try {
      const voices = await previewElevenLabsVoices(elevenApiKey.trim());
      setElevenVoices(voices);
      if (!elevenVoiceId && voices.length) {
        const scoreVoice = (voice: ElevenLabsVoice) => {
          const text = `${voice.name ?? ""} ${voice.gender ?? ""} ${voice.language ?? ""} ${voice.accent ?? ""} ${voice.description ?? ""} ${voice.category ?? ""}`.toLocaleLowerCase("tr-TR");
          let score = 0;
          if ((voice.language ?? "").toLocaleLowerCase("tr-TR").startsWith("tr") || text.includes("turkish") || text.includes("türk")) score += 120;
          if ((voice.gender ?? "").toLocaleLowerCase("tr-TR") === "female" || text.includes("female") || text.includes("woman") || text.includes("kadın")) score += 80;
          if (text.includes("natural") || text.includes("conversational") || text.includes("warm") || text.includes("calm")) score += 35;
          if (text.includes("professional") || text.includes("narration")) score += 14;
          if (text.includes("multilingual")) score += 10;
          if (text.includes("male") || text.includes("man")) score -= 90;
          return score;
        };
        const preferred = [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0];
        setElevenVoiceId(preferred.voice_id);
        setIntegrationNote((current) => ({ ...current, elevenlabs: `${voices.length} ses bulundu. AION en uygun kadın/Türkçe/doğal sesi otomatik seçti: ${preferred.name}. İstersen listeden değiştirebilirsin.` }));
      } else {
        setIntegrationNote((current) => ({ ...current, elevenlabs: `${voices.length} ses bulundu. AION uygun kadın sesi otomatik seçti; API key gerçek TTS üretimiyle “Kaydet ve test et” sırasında doğrulanacak.` }));
      }
    } catch (error) {
      setIntegrationNote((current) => ({ ...current, elevenlabs: apiErrorDetail(error, "ElevenLabs API key doğrulanamadı.") }));
    } finally {
      setIntegrationBusy("");
    }
  };

  const saveElevenLabs = async () => {
    if (!elevenApiKey.trim() || !elevenVoiceId || integrationBusy) return;
    setIntegrationBusy("elevenlabs");
    try {
      await saveAionIntegration("elevenlabs", { api_key: elevenApiKey.trim(), voice_id: elevenVoiceId });
      setElevenApiKey("");
      setIntegrationNote((current) => ({ ...current, elevenlabs: "Premium kadın ses backend'e bağlandı ve gerçek API ile doğrulandı." }));
      onRefresh();
    } catch (error) {
      setIntegrationNote((current) => ({ ...current, elevenlabs: apiErrorDetail(error, "ElevenLabs bağlantısı kaydedilemedi.") }));
    } finally {
      setIntegrationBusy("");
    }
  };

  const saveVoiceProfile = async () => {
    const base = voiceSettingsState;
    if (!base) return;
    const pronunciations: Record<string, string> = {};
    for (const raw of pronunciationDraft.split("\n")) {
      const [term, ...rest] = raw.split("=");
      const spoken = rest.join("=").trim();
      if (term?.trim() && spoken) pronunciations[term.trim()] = spoken;
    }
    setIntegrationBusy("voice-profile");
    try {
      const saved = await saveAionVoiceSettings({
        speed: base.speed,
        stability: base.stability,
        similarity_boost: base.similarity_boost,
        style: base.style,
        pronunciations,
      });
      setVoiceSettingsState(saved);
      setIntegrationNote((current) => ({ ...current, voice: "Ses karakteri ve özel isim telaffuzları kaydedildi." }));
    } catch (error) {
      setIntegrationNote((current) => ({ ...current, voice: apiErrorDetail(error, "Ses ayarları kaydedilemedi.") }));
    } finally {
      setIntegrationBusy("");
    }
  };

  const openOauthClientEditor = (plugin: MarketplacePlugin) => {
    const family = plugin.oauth_client_family ?? "";
    if (!family) {
      setOauthNote(`${plugin.display_name} için ayrıca OAuth uygulama bilgisi gerekmiyor.`);
      return;
    }
    setOauthFamily(family);
    setOauthClientId("");
    setOauthClientSecret("");
    setOauthNote(`${plugin.display_name} için ${family} OAuth uygulama bilgilerini kaydedebilirsin.`);
  };

  const saveOauthClient = async () => {
    if (!oauthFamily || !oauthClientId.trim() || oauthBusy) return;
    setOauthBusy(true);
    setOauthNote("OAuth uygulama bilgileri güvenli credential store'a kaydediliyor…");
    try {
      await saveAionOAuthClient(oauthFamily, oauthClientId.trim(), oauthClientSecret.trim() || undefined);
      const refreshed = await getAionOAuthClients();
      setOauthClients(refreshed);
      setOauthClientId("");
      setOauthClientSecret("");
      setOauthNote(`${oauthFamily} OAuth uygulaması kaydedildi. Şimdi ilgili hesapta Hesapla giriş yap diyebilirsin.`);
      await refreshMarketplace();
    } catch (error) {
      setOauthNote(apiErrorDetail(error, "OAuth uygulama bilgileri kaydedilemedi."));
    } finally {
      setOauthBusy(false);
    }
  };

  const removeOauthClient = async (family: string) => {
    if (!family || oauthBusy || !window.confirm(`${family} OAuth uygulama bilgilerini AION'dan kaldırmak istiyor musun?`)) return;
    setOauthBusy(true);
    try {
      await deleteAionOAuthClient(family);
      setOauthClients(await getAionOAuthClients());
      setOauthNote(`${family} OAuth uygulama bilgileri kaldırıldı.`);
      await refreshMarketplace();
    } catch (error) {
      setOauthNote(apiErrorDetail(error, "OAuth uygulama bilgileri kaldırılamadı."));
    } finally {
      setOauthBusy(false);
    }
  };

  if (view === "projects") {
    return (
      <div className="workspace-view" id="projects-overview">
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

  if (view === "devices") {
    const onlineCount = devices.filter((device) => device.status === "ONLINE").length;
    return (
      <div className="workspace-view">
        <Header
          eyebrow="Premium AION · güvenli cihaz erişimi"
          title="Cihazlar"
          copy="Bilgisayarını AION'a tek kullanımlık kodla eşleştir. Hiçbir cihaz yetkisi varsayılan açık değildir; uygulama/URL/bildirim izinlerini tek tek sen açarsın."
          loading={deviceBusy === "loading"}
          onRefresh={() => { void refreshDevices(); }}
        />
        <div className="workspace-kpi-row">
          <div className="workspace-kpi"><span className="workspace-kpi-icon"><Laptop size={17} /></span><div><strong>{devices.length}</strong><span>eşleşmiş cihaz</span></div></div>
          <div className="workspace-kpi"><span className="workspace-kpi-icon"><Activity size={17} /></span><div><strong>{onlineCount}</strong><span>çevrimiçi</span></div></div>
          <div className="workspace-kpi"><span className="workspace-kpi-icon"><ShieldCheck size={17} /></span><div><strong>İzinli</strong><span>varsayılan kapalı</span></div></div>
        </div>

        <section className="workspace-device-pairing" id="setup-devices" data-testid="device-pairing-panel">
          <div className="workspace-connections-heading">
            <div><small>AION Companion</small><strong>Windows bilgisayar bağla</strong></div>
            <StatusPill value={devicePairing ? "10 dk eşleştirme" : "Hazır"} />
          </div>
          <p>Tek kullanımlık eşleştirme kodu oluştur. Komut yalnız senin bilgisayarında çalışır; device token sohbete veya frontend'e geri gösterilmez.</p>
          <p className="workspace-companion-hint">
            Aranacak ayrı bir uygulama yok: Companion, kopyaladığın komutun indirip çalıştırdığı bir PowerShell betiği.
            Komutu <strong>PowerShell</strong>'e yapıştırıp Enter'a basman yeterli.
          </p>
          <div className="workspace-integration-actions">
            <button type="button" className="is-primary" disabled={Boolean(deviceBusy)} onClick={() => { void createDevicePair(); }} data-testid="device-pair-create-button">
              {deviceBusy === "pairing" ? "Kod oluşturuluyor…" : "Windows eşleştirme kodu oluştur"}
            </button>
            {devicePairing ? <button type="button" onClick={() => { void copyWindowsPairCommand(); }} data-testid="device-pair-copy-button"><Copy size={14} /> Kurulum komutunu kopyala</button> : null}
            <a
              className="workspace-companion-link"
              href="/api/aion/devices/companion/windows.ps1"
              download="aion-companion.ps1"
              data-testid="companion-download-link"
            >
              <MonitorDown size={14} /> Companion betiğini indir / oku
            </a>
          </div>
          {devicePairing ? (
            <div className="workspace-device-pair-code">
              <small>Tek kullanımlık token · {Math.max(0, Math.round((devicePairing.expires_at * 1000 - Date.now()) / 60000))} dk</small>
              <code>{devicePairing.pairing_token}</code>
              <p>Windows Terminal / PowerShell'i normal kullanıcı olarak aç ve kopyaladığın komutu çalıştır. Pencere açık kaldığı sürece Companion çevrimiçi olur.</p>
            </div>
          ) : null}
          {deviceNote ? <p className="workspace-integration-note" role="status">{deviceNote}</p> : null}
          <SetupSteps id="devices" />
        </section>

        <div className="workspace-device-list">
          {devices.map((device) => (
            <article key={device.id} className={`workspace-device-card${device.status === "ONLINE" ? " is-online" : ""}`} data-testid={`device-${device.id}`}>
              <div className="workspace-device-card-top">
                <span className="workspace-card-icon"><Laptop size={18} /></span>
                <div><small>{device.platform}</small><h2>{device.name}</h2></div>
                <StatusPill value={device.status} />
              </div>
              <p className="workspace-device-seen">
                {device.status === "ONLINE"
                  ? "Companion şu anda çevrimiçi ve komut alabiliyor."
                  : device.last_seen
                    ? `Son görülme: ${formatObserved(device.last_seen)}. Çevrimdışı bir cihaz komut çalıştıramaz.`
                    : "Bu cihaz henüz hiç bağlanmadı; eşleşme tamamlanmış olsa bile komut çalıştıramaz."}
              </p>
              <div className="workspace-device-permissions">
                {device.capabilities.map((capability) => (
                  <label key={capability}>
                    <input
                      type="checkbox"
                      checked={Boolean(device.permissions[capability])}
                      disabled={Boolean(deviceBusy)}
                      onChange={(event) => { void changeDevicePermission(device, capability, event.target.checked); }}
                    />
                    <span>{capability === "open_url" ? "Tarayıcıda URL aç" : capability === "open_app" ? "Uygulama aç" : "Sistem bildirimi"}</span>
                  </label>
                ))}
              </div>
              <div className="workspace-integration-actions">
                {device.capabilities.includes("notify") ? <button type="button" disabled={!device.permissions.notify || Boolean(deviceBusy)} onClick={() => { void testDeviceNotification(device); }}><Link2 size={14} /> Bağlantıyı test et</button> : null}
                <button type="button" disabled={Boolean(deviceBusy)} onClick={() => { void removePairedDevice(device); }}><Trash2 size={14} /> Eşleştirmeyi kaldır</button>
              </div>
            </article>
          ))}
        </div>
        <section className="workspace-signal-section" data-testid="device-command-history">
          <div className="workspace-signal-heading"><span>Komut geçmişi</span><small>AION'un cihazlara gerçekten gönderdiği komutlar</small></div>
          {deviceCommands.length > 0 ? (
            <div className="workspace-command-list">
              {deviceCommands.slice(0, 12).map((command) => (
                <article key={command.id} className={`workspace-command-row is-${command.status}`}>
                  <div className="workspace-command-head">
                    <code>{command.command}</code>
                    <StatusPill value={command.status} />
                  </div>
                  <p>{Object.entries(command.args).map(([key, value]) => `${key}: ${String(value)}`).join(" · ") || "Parametresiz komut"}</p>
                  <small>
                    {command.created_at ? formatObserved(command.created_at) : "Zaman bilinmiyor"}
                    {command.status === "error" && command.result ? ` · Hata: ${command.result}` : ""}
                    {command.status === "queued" ? " · Cihaz henüz almadı" : ""}
                  </small>
                </article>
              ))}
            </div>
          ) : (
            <p className="workspace-integration-note">Henüz cihaza gönderilmiş komut yok. AION bir cihazı kontrol ettiğini yalnız burada kaydı varsa iddia eder.</p>
          )}
        </section>

        {!deviceBusy && devices.length === 0 ? <EmptyState icon={<Laptop size={21} />} title="Henüz eşleşmiş cihaz yok" copy="Windows eşleştirme kodu oluşturup kendi bilgisayarında kurulum komutunu çalıştır. AION cihazı gördükten sonra izinleri buradan aç." /> : null}
      </div>
    );
  }

  if (view === "inbox") {
    return (
      <div className="workspace-view" id="inbox-brief">
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
      <div className="workspace-view" id="library-memory">
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
      <div className="workspace-view" id="automations-overview">
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
    const vercel = record(integrations?.vercel ?? status?.vercel);
    const supabase = record(integrations?.supabase ?? status?.supabase);
    const elevenlabs = record(integrations?.elevenlabs);
    const tradeIntegration = record(integrations?.aion_trade);
    const trade = projects.find((project) => stringValue(project.id, "") === "aion-trade") ?? {};
    const vercelStatus = stringValue(vercel.status, "BLOCKED_CONNECTION");
    const supabaseStatus = stringValue(supabase.status, "BLOCKED_CONNECTION");
    const elevenStatus = stringValue(elevenlabs.status, "BLOCKED_CONNECTION");
    const tradeTelemetry = stringValue(tradeIntegration.status ?? trade.positions, "BLOCKED_CONNECTION");
    const vercelConfigured = vercel.configured === true;
    const supabaseConfigured = supabase.configured === true;
    const elevenConfigured = elevenlabs.configured === true;
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

          <article className="workspace-setting-card workspace-install-card" id="setup-desktop" data-testid="desktop-install-card">
            <span><MonitorDown size={17} /></span>
            <div>
              <small>Masaüstü uygulaması</small>
              <strong>AION'u uygulama olarak yükle</strong>
              {installState === "installed" ? (
                <p>AION bu cihaza uygulama olarak yüklü; kendi penceresinde açılıyor.</p>
              ) : (
                <p>Masaüstüne AION simgesi koyar; tıklayınca kendi penceresinde açılır, sekme ve adres çubuğu olmaz.</p>
              )}
              {installNote ? <p className="workspace-integration-note" role="status">{installNote}</p> : null}
              <div className="workspace-access-actions">
                {installState === "available" ? (
                  <button
                    type="button"
                    className="is-primary"
                    data-testid="desktop-install-button"
                    onClick={() => {
                      void install().then((outcome) => {
                        setInstallNote(outcome === "accepted"
                          ? "AION uygulama olarak yüklendi."
                          : outcome === "dismissed"
                            ? "Yükleme iptal edildi; istediğinde tekrar deneyebilirsin."
                            : "Bu tarayıcı yüklemeyi şu anda sunmuyor; aşağıdaki kurucuyu kullan.");
                      });
                    }}
                  >
                    <MonitorDown size={14} /> Tek tıkla yükle
                  </button>
                ) : null}
                <button
                  type="button"
                  data-testid="desktop-setup-copy"
                  onClick={() => { void copyDesktopSetupCommand(); }}
                >
                  <Copy size={14} /> Windows kurulum komutunu kopyala
                </button>
                <a
                  className="workspace-companion-link"
                  href="/api/aion/desktop/windows.ps1"
                  download="aion-masaustu-kur.ps1"
                  data-testid="desktop-setup-download"
                >
                  <MonitorDown size={14} /> Kurucuyu indir
                </a>
              </div>
              <SetupSteps id="desktop" />
            </div>
          </article>
        </div>

        <section className="workspace-accounts-panel" aria-label="PDF AION tamamlanma sözleşmesi" data-testid="pdf-contract-readiness">
          <div className="workspace-connections-heading">
            <div><small>JARVIS Kurulum Dosyası · gerçek sistem sözleşmesi</small><strong>AION tamamlanma durumu</strong></div>
            <StatusPill value={readiness?.state ?? "Kontrol ediliyor"} />
          </div>
          <p className="workspace-accounts-copy">Bu bölüm arayüzün güzel olup olmadığını değil, PDF'deki gerçek veri, aksiyon, hafıza, ses, takip ve günlük brief kriterlerini doğrular. Kullanıcı hesabı veya cihaz izni gerektiren maddeyi AION kendi kendine tamamlanmış saymaz.</p>
          <div className="workspace-account-grid">
            {(readiness?.criteria ?? []).map((criterion) => (
              <article key={criterion.id} className={`workspace-account-card${criterion.state === "READY" ? " is-connected" : ""}`} data-testid={`readiness-${criterion.id}`}>
                <div className="workspace-account-card-top">
                  <strong>{criterion.label}</strong>
                  <StatusPill value={criterion.state} />
                </div>
                <p>{criterion.detail}</p>
                {criterion.action && onNavigate ? (
                  <button
                    type="button"
                    className="workspace-repair-button"
                    onClick={() => onNavigate(criterion.action!.surface, criterion.action!.anchor)}
                    data-testid={`readiness-action-${criterion.id}`}
                  >
                    {criterion.action.label}
                    <ArrowUpRight size={14} />
                  </button>
                ) : null}
              </article>
            ))}
          </div>
          {!readiness ? <p className="workspace-integration-note">PDF tamamlanma durumu backend'den doğrulanıyor…</p> : null}
          {readiness?.owner_actions?.length ? (
            <div className="workspace-integration-actions">
              <button type="button" onClick={() => onAsk("AION, PDF tamamlanma sözleşmesinde benden işlem gerektiren maddeleri gerçek mevcut duruma göre sırala. Yalnız benim yapmam gereken hesap bağlantısı veya cihaz izni adımlarını kısa ve adım adım anlat.")}>Benden gerekenleri göster</button>
            </div>
          ) : null}
        </section>

        <section className="workspace-connections-panel" id="setup-connections" aria-label="AION bağlantıları">
          <div className="workspace-connections-heading">
            <div><small>Gerçek veri kaynakları</small><strong>Bağlantılar</strong></div>
            <span>Credential değerleri UI'da gösterilmez</span>
          </div>
          <div className="workspace-connection-grid">
            <article className="workspace-connection-card is-configurable" data-testid="integration-vercel-card">
              <div className="workspace-connection-top"><span><Server size={17} /></span><StatusPill value={vercelStatus} /></div>
              <h3>Vercel Account API</h3>
              <p>Proje ve deployment telemetrisi için tokenı buraya yapıştır. AION kaydetmeden önce Vercel API ile gerçek bağlantı testi yapar.</p>
              <div className="workspace-integration-form">
                <label>
                  <span>Vercel Token</span>
                  <input
                    type="password"
                    value={vercelToken}
                    onChange={(event) => setVercelToken(event.target.value)}
                    placeholder={vercelConfigured ? "Yeni token girersen mevcut bağlantı güncellenir" : "Vercel tokenını buraya yapıştır"}
                    autoComplete="off"
                    spellCheck={false}
                    data-testid="vercel-token-input"
                  />
                </label>
                <div className="workspace-integration-actions">
                  <button
                    type="button"
                    className="is-primary"
                    disabled={!vercelToken.trim() || Boolean(integrationBusy)}
                    onClick={() => { void saveIntegration("vercel"); }}
                    data-testid="vercel-save-button"
                  >
                    {integrationBusy === "vercel" ? "Test ediliyor…" : vercelConfigured ? "Tokenı güncelle ve test et" : "Kaydet ve test et"}
                  </button>
                  {vercelConfigured ? (
                    <button type="button" disabled={Boolean(integrationBusy)} onClick={() => { void disconnectIntegration("vercel"); }}>Bağlantıyı kaldır</button>
                  ) : null}
                </div>
              </div>
              {vercelStatus === "CONNECTED" ? <small className="workspace-integration-meta">{listValue(vercel.projects).length} proje · {listValue(vercel.deployments).length} deployment gözleniyor</small> : null}
              {integrationNote.vercel ? <p className="workspace-integration-note" role="status">{integrationNote.vercel}</p> : null}
              <button type="button" className="workspace-integration-help" onClick={() => onAsk("AION, Vercel tokenını nereden oluşturacağımı kısa ve güvenli biçimde anlat. Token değerini sohbete yazmamı isteme; Ayarlar > Bağlantılar alanına yapıştıracağım.")}>Token nereden alınır?</button>
              <SetupSteps id="vercel" />
            </article>

            <article className="workspace-connection-card is-configurable" data-testid="integration-supabase-card">
              <div className="workspace-connection-top"><span><Database size={17} /></span><StatusPill value={supabaseStatus} /></div>
              <h3>Supabase</h3>
              <p>Project URL/host ile publishable (anon) key kullanılır. <strong>service_role kabul edilmez.</strong> AION bu bağlantıda yalnız exposed metadata okur.</p>
              <div className="workspace-integration-form">
                <label>
                  <span>Project URL / Host</span>
                  <input
                    type="text"
                    value={supabaseHost}
                    onChange={(event) => setSupabaseHost(event.target.value)}
                    placeholder={stringValue(supabase.host, "https://proje-ref.supabase.co")}
                    autoComplete="off"
                    spellCheck={false}
                    data-testid="supabase-host-input"
                  />
                </label>
                <label>
                  <span>Publishable / anon key</span>
                  <input
                    type="password"
                    value={supabaseKey}
                    onChange={(event) => setSupabaseKey(event.target.value)}
                    placeholder={supabaseConfigured ? "Yeni key girersen mevcut bağlantı güncellenir" : "sb_publishable_… veya anon JWT"}
                    autoComplete="off"
                    spellCheck={false}
                    data-testid="supabase-key-input"
                  />
                </label>
                <div className="workspace-integration-actions">
                  <button
                    type="button"
                    className="is-primary"
                    disabled={!supabaseHost.trim() || !supabaseKey.trim() || Boolean(integrationBusy)}
                    onClick={() => { void saveIntegration("supabase"); }}
                    data-testid="supabase-save-button"
                  >
                    {integrationBusy === "supabase" ? "Test ediliyor…" : supabaseConfigured ? "Bağlantıyı güncelle ve test et" : "Kaydet ve test et"}
                  </button>
                  {supabaseConfigured ? (
                    <button type="button" disabled={Boolean(integrationBusy)} onClick={() => { void disconnectIntegration("supabase"); }}>Bağlantıyı kaldır</button>
                  ) : null}
                </div>
              </div>
              {supabaseStatus === "CONNECTED" ? <small className="workspace-integration-meta">{listValue(supabase.tables).length} exposed tablo metadata'sı gözleniyor</small> : null}
              {integrationNote.supabase ? <p className="workspace-integration-note" role="status">{integrationNote.supabase}</p> : null}
              <button type="button" className="workspace-integration-help" onClick={() => onAsk("AION, Supabase Project URL ve publishable/anon key'i nereden bulacağımı kısa anlat. service_role isteme; değerleri Ayarlar > Bağlantılar alanına yapıştıracağım.")}>Bilgiler nerede?</button>
              <SetupSteps id="supabase" />
            </article>

            <article className="workspace-connection-card is-configurable" id="setup-voice" data-testid="integration-elevenlabs-card">
              <div className="workspace-connection-top"><span><Activity size={17} /></span><StatusPill value={elevenStatus} /></div>
              <h3>Premium AION Sesi · ElevenLabs</h3>
              <p>Robotik tarayıcı sesi yerine AION'un backend'den ürettiği doğal Türkçe sesi kullanır. API key hiçbir zaman tarayıcıya geri gönderilmez.</p>
              <div className="workspace-integration-form">
                <label>
                  <span>ElevenLabs API Key</span>
                  <input
                    type="password"
                    value={elevenApiKey}
                    onChange={(event) => setElevenApiKey(event.target.value)}
                    placeholder={elevenConfigured ? "Sesi değiştirmek için API key'i tekrar gir" : "ElevenLabs API key"}
                    autoComplete="off"
                    spellCheck={false}
                    data-testid="elevenlabs-api-key-input"
                  />
                </label>
                <div className="workspace-integration-actions">
                  <button type="button" disabled={!elevenApiKey.trim() || Boolean(integrationBusy)} onClick={() => { void previewElevenVoices(); }}>
                    {integrationBusy === "elevenlabs-preview" ? "Sesler alınıyor…" : "Sesleri getir"}
                  </button>
                </div>
                {elevenVoices.length ? (
                  <label>
                    <span>Kadın / doğal ses seç</span>
                    <select value={elevenVoiceId} onChange={(event) => setElevenVoiceId(event.target.value)} data-testid="elevenlabs-voice-select">
                      <option value="">Ses seç</option>
                      {elevenVoices.map((voice) => (
                        <option key={voice.voice_id} value={voice.voice_id}>
                          {voice.name}{voice.gender ? ` · ${voice.gender}` : ""}{voice.language ? ` · ${voice.language}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <div className="workspace-integration-actions">
                  <button type="button" className="is-primary" disabled={!elevenApiKey.trim() || !elevenVoiceId || Boolean(integrationBusy)} onClick={() => { void saveElevenLabs(); }} data-testid="elevenlabs-save-button">
                    {integrationBusy === "elevenlabs" ? "Doğrulanıyor…" : elevenConfigured ? "Sesi güncelle ve test et" : "Kaydet ve test et"}
                  </button>
                  {elevenConfigured ? <button type="button" disabled={Boolean(integrationBusy)} onClick={() => { void disconnectIntegration("elevenlabs"); }}>Bağlantıyı kaldır</button> : null}
                </div>
              </div>
              {elevenConfigured ? <small className="workspace-integration-meta">Aktif ses: {stringValue(elevenlabs.voice_name, stringValue(elevenlabs.voice_id, "Seçili ElevenLabs sesi"))}</small> : null}
              {integrationNote.elevenlabs ? <p className="workspace-integration-note" role="status">{integrationNote.elevenlabs}</p> : null}
              <SetupSteps id="elevenlabs" />
            </article>

            <article className="workspace-connection-card">
              <div className="workspace-connection-top"><span><Gauge size={17} /></span><StatusPill value={tradeTelemetry} /></div>
              <h3>AION Trade Telemetri</h3>
              <p>Public web/API health izleniyor; pozisyon, strateji ve risk telemetrisi henüz AION'a read-only bağlı değil. LIVE işlem yetkisi açılmaz.</p>
              <code>PAPER-first · SPOT-only · no withdrawal · no Martingale</code>
              <button type="button" onClick={() => onAsk("AION, AION Trade için yalnız read-only pozisyon, strateji ve risk telemetrisi bağlantısını planla. LIVE işlem, withdrawal veya emir yetkisi verme. Önce mevcut gerçek API yüzeyini ve gereken en düşük yetkiyi kontrol et.")}>Telemetri planını incele</button>
              <SetupSteps id="aion_trade" />
            </article>
          </div>
        </section>

        <section className="workspace-voice-personality" aria-label="AION ses karakteri">
          <div className="workspace-connections-heading">
            <div><small>Kişisel ses profili</small><strong>Konuşma karakteri ve telaffuz</strong></div>
            <StatusPill value={voiceSettingsState?.provider === "elevenlabs" ? "Premium TTS" : "Cihaz / yerel fallback"} />
          </div>
          <div className="workspace-voice-architecture" data-testid="voice-architecture">
            <p><strong>Ses mimarisi — olduğu gibi.</strong> Mikrofonunu tarayıcı yazıya çevirir, AION cevabı üretir, ses backend'de sentezlenir. Sesli konuşma sırasında mikrofon açık kalır, bu yüzden AION'un sözünü kesebilirsin.</p>
            <p>Bu <b>ham-ses full-duplex değildir</b>: aynı anda dinleyip konuşan tek bir ses akışı, ücretli bir realtime ses sağlayıcısı gerektirir ve bağlı değildir. AION bağlamadığı sürece bu özelliği var gibi göstermez.</p>
          </div>
          <div className="workspace-voice-profile-grid">
            <div className="workspace-voice-sliders">
              <label>
                <span>Konuşma hızı <b>{voiceSettingsState?.speed?.toFixed(2) ?? "0.96"}</b></span>
                <input type="range" min="0.7" max="1.2" step="0.01" value={voiceSettingsState?.speed ?? 0.96} onChange={(event) => setVoiceSettingsState((current) => current ? { ...current, speed: Number(event.target.value) } : current)} />
              </label>
              <label>
                <span>Doğallık / stabilite <b>{voiceSettingsState?.stability?.toFixed(2) ?? "0.42"}</b></span>
                <input type="range" min="0" max="1" step="0.01" value={voiceSettingsState?.stability ?? 0.42} onChange={(event) => setVoiceSettingsState((current) => current ? { ...current, stability: Number(event.target.value) } : current)} />
              </label>
              <label>
                <span>İfade / stil <b>{voiceSettingsState?.style?.toFixed(2) ?? "0.10"}</b></span>
                <input type="range" min="0" max="1" step="0.01" value={voiceSettingsState?.style ?? 0.10} onChange={(event) => setVoiceSettingsState((current) => current ? { ...current, style: Number(event.target.value) } : current)} />
              </label>
            </div>
            <label className="workspace-pronunciation-editor">
              <span>Özel isim telaffuzları</span>
              <textarea
                value={pronunciationDraft}
                onChange={(event) => setPronunciationDraft(event.target.value)}
                placeholder={"AION=Ayon\nWEXON=Vekson\nProje Adı=Nasıl okunmasını istiyorsan"}
                rows={7}
                data-testid="voice-pronunciation-input"
              />
              <small>Her satır: yazılış=telaffuz. Varsayılan AION, WEXON, GitHub, Supabase gibi isimler zaten düzeltilir.</small>
            </label>
          </div>
          <div className="workspace-integration-actions">
            <button type="button" className="is-primary" disabled={!voiceSettingsState || Boolean(integrationBusy)} onClick={() => { void saveVoiceProfile(); }} data-testid="voice-profile-save-button">
              {integrationBusy === "voice-profile" ? "Kaydediliyor…" : "Ses karakterini kaydet"}
            </button>
          </div>
          {integrationNote.voice ? <p className="workspace-integration-note" role="status">{integrationNote.voice}</p> : null}
        </section>

        <section className="workspace-accounts-panel" id="setup-accounts" aria-label="Hesaplar ve API bağlantıları" data-testid="accounts-api-panel">
          <div className="workspace-connections-heading">
            <div><small>Genel entegrasyon merkezi</small><strong>Hesaplar & API</strong></div>
            <span>{marketplacePlugins.filter((plugin) => plugin.status === "connected").length} bağlı · {marketplacePlugins.length} kullanılabilir servis</span>
          </div>
          <p className="workspace-accounts-copy">AION'un erişmesi gereken servisi burada bul. Destekliyorsa sağlayıcının resmi giriş sayfasıyla OAuth bağlan; değilse API/token alanını kullan. Bağlantı test edilmeden AION servisi bağlı saymaz.</p>
          <div className="workspace-account-search">
            <input value={marketplaceQuery} onChange={(event) => setMarketplaceQuery(event.target.value)} placeholder="GitHub, Gmail, Drive, Calendar, Notion, Slack, Vercel…" />
            <button type="button" onClick={() => { void refreshMarketplace(); }} disabled={marketplaceLoading}>{marketplaceLoading ? "Yükleniyor" : "Yenile"}</button>
          </div>
          {marketplaceNote ? <p className="workspace-integration-note" role="status">{marketplaceNote}</p> : null}
          {oauthFamily ? (
            <div className="workspace-oauth-client-editor" data-testid="oauth-client-editor">
              <div>
                <small>OAuth uygulaması · {oauthFamily}</small>
                <strong>Bir kez ayarla, aynı ailedeki hesaplarda tekrar kullan</strong>
                <p>Redirect / callback URL: <code>{oauthClients?.callback_url || "https://aion.wexon.dev/api/marketplace/oauth/callback"}</code></p>
              </div>
              <div className="workspace-oauth-client-form">
                <input value={oauthClientId} onChange={(event) => setOauthClientId(event.target.value)} placeholder="OAuth Client ID" autoComplete="off" spellCheck={false} data-testid="oauth-client-id-input" />
                <input type="password" value={oauthClientSecret} onChange={(event) => setOauthClientSecret(event.target.value)} placeholder="Client Secret (sağlayıcı istiyorsa)" autoComplete="off" spellCheck={false} data-testid="oauth-client-secret-input" />
                <button type="button" className="is-primary" disabled={!oauthClientId.trim() || oauthBusy} onClick={() => { void saveOauthClient(); }} data-testid="oauth-client-save-button">{oauthBusy ? "Kaydediliyor…" : "OAuth uygulamasını kaydet"}</button>
                {oauthClients?.families?.[oauthFamily]?.configured ? <button type="button" disabled={oauthBusy} onClick={() => { void removeOauthClient(oauthFamily); }}>OAuth bilgisini kaldır</button> : null}
                <button type="button" disabled={oauthBusy} onClick={() => setOauthFamily("")}>Kapat</button>
              </div>
              {oauthNote ? <p className="workspace-integration-note" role="status">{oauthNote}</p> : null}
            </div>
          ) : null}
          <div className="workspace-account-grid">
            {filteredMarketplace.slice(0, 24).map((plugin) => {
              const authMode = stringValue(record(plugin.auth).mode, "");
              const connected = plugin.status === "connected";
              const hasTokenFallback = authMode === "pat_paste" || Boolean(plugin.fallback_auth);
              const oauthCapable = !["pat_paste", "local"].includes(authMode);
              const oauthFamilyForPlugin = plugin.oauth_client_family ?? "";
              const oauthFamilyConfigured = oauthFamilyForPlugin ? Boolean(oauthClients?.families?.[oauthFamilyForPlugin]?.configured) : true;
              const selected = marketplaceSelected === plugin.id;
              return (
                <article key={plugin.id} className={`workspace-account-card${connected ? " is-connected" : ""}`} data-testid={`account-${plugin.id}`}>
                  <div className="workspace-account-card-top">
                    <div><strong>{plugin.display_name}</strong><small>{plugin.category || "Entegrasyon"}</small></div>
                    <StatusPill value={connected ? "CONNECTED" : plugin.status || "not_connected"} />
                  </div>
                  <p>{plugin.description || "AION bağlantısı"}</p>
                  {connected ? (
                    <p className={`workspace-account-tool${plugin.live_callable ? " is-live" : ""}`} data-testid={`account-tool-${plugin.id}`}>
                      {plugin.live_callable
                        ? <><ShieldCheck size={13} aria-hidden="true" /> AION aracı kullanılabilir{plugin.native_tool ? <code>{plugin.native_tool}</code> : null}</>
                        : <><AlertTriangle size={13} aria-hidden="true" /> Hesap bağlı, ancak AION bu servisi henüz araç olarak çağıramıyor.</>}
                    </p>
                  ) : null}
                  <div className="workspace-account-actions">
                    {connected ? (
                      <button type="button" onClick={() => { void disconnectMarketplace(plugin); }} disabled={marketplaceBusy === plugin.id}>Bağlantıyı kaldır</button>
                    ) : (
                      <>
                        {oauthCapable ? <button type="button" className="is-primary" onClick={() => { void startAccountConnect(plugin); }} disabled={Boolean(marketplaceBusy) || (!oauthFamilyConfigured && plugin.oauth_client_configured === false)}>{marketplaceBusy === plugin.id ? "Giriş bekleniyor…" : "Hesapla giriş yap"}</button> : null}
                        {oauthCapable && oauthFamilyForPlugin && (!oauthFamilyConfigured || plugin.oauth_client_configured === false) ? <button type="button" onClick={() => openOauthClientEditor(plugin)}>OAuth uygulaması ayarla</button> : null}
                        {hasTokenFallback ? <button type="button" onClick={() => { setMarketplaceSelected(selected ? "" : plugin.id); setMarketplaceToken(""); }}>API / Token</button> : null}
                        {authMode === "local" ? <button type="button" className="is-primary" onClick={() => { void startAccountConnect(plugin); }}>Etkinleştir</button> : null}
                      </>
                    )}
                  </div>
                  {selected && !connected ? (
                    <div className="workspace-account-token-form">
                      <input type="password" value={marketplaceToken} onChange={(event) => setMarketplaceToken(event.target.value)} placeholder={`${plugin.display_name} API anahtarı / token`} autoComplete="off" spellCheck={false} />
                      <button type="button" className="is-primary" disabled={!marketplaceToken.trim() || Boolean(marketplaceBusy)} onClick={() => { void saveMarketplaceToken(plugin); }}>Doğrula ve bağla</button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
          {!marketplaceLoading && filteredMarketplace.length === 0 ? <EmptyState icon={<KeyRound size={20} />} title="Servis bulunamadı" copy="Farklı bir servis adı ara. Desteklenmeyen özel API'ler için AION'a entegrasyon eklemesini söyleyebilirsin." /> : null}
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
      <div className="workspace-profile-card is-personal-profile" id="profile-owner-card">
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
