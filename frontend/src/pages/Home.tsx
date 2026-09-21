import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AudioLines, Menu, MessageCircle, Mic, MicOff, PenSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppNav, { type AppView } from "@/components/AppNav";
import ChatView, { type ChatMessage } from "@/components/ChatView";
import OrbAvatar from "@/components/OrbAvatar";
import QuickActions from "@/components/QuickActions";
import ThemePicker from "@/components/ThemePicker";
import WorkspaceView, { type WorkspaceViewId } from "@/components/WorkspaceView";
import { endFrontendSession } from "@/lib/frontendAuth";
import {
  deleteAionChatSession,
  ensureAionChatSession,
  getAionIntegrations,
  getAionProfile,
  getAionSettings,
  getAionStatus,
  listAionChatSessions,
  loadAionChatSession,
  resetAionChatSession,
  selectAionChatSession,
  sendAionMessage,
  type AgentChatSession,
  type AionApprovalDecision,
  type AionApprovalRequest,
  type AionIntegrations,
  type AionPersonalProfile,
  type AionSettings,
  type AionStatusSummary,
  type AionTurnStep,
} from "@/lib/aionApi";
import { useVoiceAssistant, type VoiceStatus } from "@/hooks/useVoiceAssistant";

const quickPrompts: Record<string, string> = {
  projects: "AION, tüm projelerimin mevcut durumunu gerçek kaynaklardan kontrol et. Sorunları ve sıradaki önceliği kısa Türkçe anlat.",
  brief: "AION, bugün neler olduğunu gerçek kaynaklardan özetle. Değişiklikler, uyarılar, bekleyen işler ve bir sonraki önceliği kısa Türkçe ver.",
  vps: "AION, VPS ve kritik servislerin mevcut durumunu gerçek kaynaklardan kontrol et. Sorun varsa açıkça belirt.",
  wexon: "AION, WEXON Growth OS ve WEXON Platform durumunu gerçek kaynaklardan kontrol et. Erişilebilirlik, son değişiklikler, açık işler ve bugün çözmem gereken problemi kısa Türkçe anlat.",
  trade: "AION, AION Trade durumunu yalnız PAPER / READ_ONLY sınırlarında gerçek kaynaklardan kontrol et. Web, API health, risk ve erişebildiğin telemetriyi özetle; bilinmeyen hiçbir şeyi varsayma.",
  tasks: "AION, benim açık iç görevlerimi ve kaynaklardan görünen açık işleri kontrol et. Öncelik sırasına koy ve sıradaki en mantıklı adımı söyle.",
  integrations: "AION, eksik veya kısmi entegrasyonları kontrol et. Hangisinin neyi engellediğini ve benim yapmam gereken bağlantı adımını kısa Türkçe anlat.",
};


const sectionNames: Record<string, string> = {
  chat: "Sohbet",
  home: "Kontrol merkezi",
  projects: "Projeler",
  tasks: "Görevler",
  devices: "Cihazlar",
  inbox: "Gelen Kutusu",
  library: "Geçmiş",
  automations: "Otomasyonlar",
  settings: "Ayarlar",
  profile: "Profil",
};

const initialMessages: ChatMessage[] = [];

// Above the hook's own watchdog, so it only fires if that one is bypassed.
const SPEECH_TURN_CEILING_MS = 70_000;
// The backend's own answer deadline is 90s; this sits just past the speech
// ceiling so a wedged turn is released long before the owner gives up.
const TURN_WATCHDOG_MS = 500_000;

const voiceStatusText: Record<VoiceStatus, string> = {
  idle: "Konuşmak için dokun",
  listening: "Seni dinliyorum",
  processing: "Düşünüyorum...",
  speaking: "AION yanıtlıyor",
  muted: "Mikrofon susturuldu",
  unsupported: "Yazılı sohbeti kullan",
  error: "Mikrofonu yeniden dene",
};

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

export default function Home() {
  const navigate = useNavigate();
  const [activeItem, setActiveItem] = useState<AppView>("home");
  const queuedTurnRef = useRef<{ text: string; inputMode: "text" | "voice" } | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [statusNote, setStatusNote] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const chatOpen = activeItem === "chat";
  const setChatOpen = useCallback((open: boolean) => {
    if (open) setActiveItem("chat");
  }, []);
  const [turnSteps, setTurnSteps] = useState<AionTurnStep[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<AionApprovalRequest | null>(null);
  const approvalResolverRef = useRef<((decision: AionApprovalDecision) => void) | null>(null);
  const [chatSessionId, setChatSessionId] = useState("");
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState<AionStatusSummary | null>(null);
  const [aionSettings, setAionSettings] = useState<AionSettings | null>(null);
  const [aionIntegrations, setAionIntegrations] = useState<AionIntegrations | null>(null);
  const [personalProfile, setPersonalProfile] = useState<AionPersonalProfile | null>(null);
  const [sessions, setSessions] = useState<AgentChatSession[]>([]);
  const workspaceRefreshInFlightRef = useRef(false);
  const voice = useVoiceAssistant();
  const { consumeTranscript, markIdle, markProcessing, speak, transcript, unlockPlayback } = voice;

  const projectCount = Array.isArray(systemStatus?.projects) ? systemStatus.projects.length : 0;
  const alertCount = Array.isArray(systemStatus?.alerts) ? systemStatus.alerts.length : 0;
  const observedChangeCount = Array.isArray(systemStatus?.observed_changes) ? systemStatus.observed_changes.length : 0;
  const attentionCount = alertCount + observedChangeCount;
  const metrics = recordValue(systemStatus?.metrics);
  const today = recordValue(systemStatus?.today);
  const topPriorities = stringList(today.priorities).slice(0, 3);
  const activeServices = numberValue(metrics.active_services);
  const totalServices = numberValue(metrics.total_services);
  const openInternalTasks = numberValue(metrics.open_internal_tasks);
  const blockedIntegrations = numberValue(metrics.blocked_integrations);
  const repositoryWorkItems = numberValue(metrics.repository_work_items);
  const ownerName = personalProfile?.owner?.name?.trim() || "Mehmet";

  const observedLabel = useMemo(() => {
    if (!systemStatus?.observed_at) return "Kaynak bekleniyor";
    const raw = systemStatus.observed_at;
    const epochMs = raw < 10_000_000_000 ? raw * 1000 : raw;
    return new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(new Date(epochMs));
  }, [systemStatus?.observed_at]);

  const requestTurnApproval = useCallback((approval: AionApprovalRequest) => (
    new Promise<AionApprovalDecision>((resolve) => {
      // A turn asks sequentially, never concurrently. If a stale resolver somehow
      // survived a UI transition, fail it closed before showing the new request.
      approvalResolverRef.current?.("deny");
      approvalResolverRef.current = resolve;
      setPendingApproval(approval);
      setChatOpen(true);
      setStatusNote("AION bir işlem için onayını bekliyor");
    })
  ), [setChatOpen]);

  const resolveTurnApproval = useCallback((decision: AionApprovalDecision) => {
    const resolve = approvalResolverRef.current;
    if (!resolve) return;
    approvalResolverRef.current = null;
    setPendingApproval(null);
    setStatusNote(decision === "allow"
      ? "İşlem onaylandı; AION devam ediyor"
      : "İşlem reddedildi; AION güvenli şekilde devam ediyor");
    resolve(decision);
  }, []);

  const refreshWorkspace = useCallback(async (showLoading = false) => {
    // Focus + visibilitychange + the periodic timer can fire together. The old
    // code started a second five-request sweep and flipped the whole workspace
    // back to loading every time, which made a healthy UI look unstable.
    if (workspaceRefreshInFlightRef.current) return;
    workspaceRefreshInFlightRef.current = true;
    if (showLoading) setWorkspaceLoading(true);
    try {
      const [statusResult, settingsResult, integrationsResult, profileResult, sessionsResult] = await Promise.allSettled([
        getAionStatus(),
        getAionSettings(),
        getAionIntegrations(),
        getAionProfile(),
        listAionChatSessions(),
      ]);

      if (statusResult.status === "fulfilled") setSystemStatus(statusResult.value);
      if (settingsResult.status === "fulfilled") setAionSettings(settingsResult.value);
      if (integrationsResult.status === "fulfilled") setAionIntegrations(integrationsResult.value);
      if (profileResult.status === "fulfilled") setPersonalProfile(profileResult.value);
      if (sessionsResult.status === "fulfilled") setSessions(sessionsResult.value);

      const failed = [statusResult, settingsResult, integrationsResult, profileResult, sessionsResult].filter((result) => result.status === "rejected").length;
      if (failed > 0) setStatusNote(`${failed} kaynak görünümü alınamadı`);
      else if (showLoading) setStatusNote("AION kaynakları güncel");
    } finally {
      // Initial load starts true already; background refreshes remain quiet.
      setWorkspaceLoading(false);
      workspaceRefreshInFlightRef.current = false;
    }
  }, []);


  useEffect(() => {
    let active = true;
    void ensureAionChatSession()
      .then((sessionId) => {
        if (active) setChatSessionId(sessionId);
      })
      .catch(() => {
        if (active) setStatusNote("AION sohbet oturumu başlatılamadı");
      });
    void refreshWorkspace(true);
    return () => { active = false; };
  }, [refreshWorkspace]);

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") void refreshWorkspace();
    };
    // Keep the command center visibly live without hammering provider APIs.
    // The backend observer owns external probes; this keeps browser state in
    // sync with internal task/action changes and new observer snapshots.
    const timer = window.setInterval(refreshIfVisible, 60_000);
    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [refreshWorkspace]);

  const handleSidebarSelect = (item: AppView) => {
    setActiveItem(item);
    setMobileMenuOpen(false);
    setThemePickerOpen(false);
    setStatusNote(item === "home" ? "" : `${sectionNames[item] ?? item} açıldı`);
  };

  // A readiness card names the panel that fixes it. The workspace remounts on
  // view change (key={activeItem}), so the anchor does not exist yet in this
  // tick; a few animation frames of retry is enough and avoids a timer that
  // would scroll after the owner has already moved on.
  const handleRepairNavigate = (surface: string, anchor: string) => {
    handleSidebarSelect(surface as AppView);
    let attempts = 0;
    const focusAnchor = () => {
      const target = document.getElementById(anchor);
      if (!target) {
        if (attempts++ < 20) window.requestAnimationFrame(focusAnchor);
        return;
      }
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      target.classList.add("is-repair-target");
      window.setTimeout(() => target.classList.remove("is-repair-target"), 2400);
    };
    window.requestAnimationFrame(focusAnchor);
  };

  const submitPrompt = useCallback(async (prompt: string, inputMode: "text" | "voice" = "text") => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      setStatusNote("Başlamak için bir mesaj yaz");
      return;
    }
    // Speaking again while AION is still answering used to drop the sentence
    // on the floor: the voice hook had already stopped the microphone and
    // moved to "thinking", and nothing was left to bring it back, so the UI
    // waited forever. Hold the turn instead and run it when the current one
    // finishes — a spoken sentence is not something to silently discard.
    if (isSending) {
      queuedTurnRef.current = { text: trimmedPrompt, inputMode };
      setStatusNote("Şu anki yanıt bitince sıradaki mesajını göndereceğim");
      return;
    }

    // Must run synchronously while the send/mic action still carries iOS'
    // user-activation token. Later TTS can then reuse the primed media element.
    unlockPlayback();

    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: "user", text: trimmedPrompt };
    setMessages((current) => [...current, userMessage]);
    setMessage("");
    setIsSending(true);
    setTurnSteps([]);
    markProcessing();
    setStatusNote("AION gerçek kaynakları kontrol ediyor");

    try {
      const result = await sendAionMessage(trimmedPrompt, chatSessionId || undefined, inputMode, requestTurnApproval, setTurnSteps);
      setChatSessionId(result.sessionId);
      setMessages((current) => [
        ...current,
        { id: `assistant-${Date.now()}`, role: "assistant", text: result.text },
      ]);
      setStatusNote("Yanıt gerçek AION backend'inden geldi");
      void listAionChatSessions().then(setSessions).catch(() => undefined);
      // A tool call may have completed a task, changed an integration or moved
      // a workflow. Refresh immediately instead of waiting for the next poll.
      void refreshWorkspace();
      // The text turn is DONE here. Audio is deliberately detached from the
      // request lifecycle: iOS may refuse/defer autoplay, but that must never
      // keep the composer disabled or show a fake "Düşünüyorum" state.
      setIsSending(false);
      setTurnSteps([]);
      // Read the answer aloud only when the owner is talking to AION. A typed
      // question gets a typed answer; the speaker button replays it on demand.
      if (inputMode === "voice" || voice.continuousEnabled) {
        void Promise.race([
          speak(result.text),
          new Promise<void>((resolve) => window.setTimeout(resolve, SPEECH_TURN_CEILING_MS)),
        ]).catch(() => markIdle());
      } else {
        markIdle();
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Bilinmeyen bağlantı hatası";
      setMessages((current) => [
        ...current,
        { id: `assistant-error-${Date.now()}`, role: "assistant", error: true, text: `**Yanıt alınamadı.** ${detail}\n\nAynı mesajı tekrar gönderebilirsin; ücretsiz modeller bazen yoğun olabiliyor.` },
      ]);
      setStatusNote("AION yanıtı alınamadı");
      markIdle();
    } finally {
      setIsSending(false);
      setTurnSteps([]);
    }
  }, [chatSessionId, isSending, markIdle, markProcessing, refreshWorkspace, requestTurnApproval, speak, unlockPlayback, voice.continuousEnabled]);

  const replayAssistantSpeech = useCallback((text: string) => {
    unlockPlayback();
    void speak(text).catch(() => markIdle());
  }, [markIdle, speak, unlockPlayback]);

  const handleSubmit = () => {
    if (message.trim()) setChatOpen(true);
    void submitPrompt(message);
  };

  useEffect(() => {
    if (!transcript) return;
    setChatOpen(true);
    void submitPrompt(transcript, "voice");
    consumeTranscript();
  }, [consumeTranscript, submitPrompt, transcript]);

  // Last line of defence. Whatever wedges a turn — a stalled fetch, an audio
  // element that never reports, a browser that swallows a speech event — the
  // composer must come back. A chat that cannot accept the next message is
  // indistinguishable from a dead product.
  useEffect(() => {
    if (!isSending || pendingApproval) return;
    const timer = window.setTimeout(() => {
      setIsSending(false);
      markIdle();
      setStatusNote("Yanıt beklenenden uzun sürdü; tekrar yazabilirsin.");
    }, TURN_WATCHDOG_MS);
    return () => window.clearTimeout(timer);
  }, [isSending, markIdle, pendingApproval]);

  // Drain whatever was said mid-answer as soon as the turn in flight ends.
  useEffect(() => {
    if (isSending) return;
    const queued = queuedTurnRef.current;
    if (!queued) return;
    queuedTurnRef.current = null;
    void submitPrompt(queued.text, queued.inputMode);
  }, [isSending, submitPrompt]);

  const openChat = () => {
    setMobileMenuOpen(false);
    setThemePickerOpen(false);
    setChatOpen(true);
  };

  const handleNewChat = useCallback(async () => {
    setMobileMenuOpen(false);
    setThemePickerOpen(false);
    if (isSending) {
      setStatusNote("Mevcut yanıt tamamlanınca yeni sohbet açabilirsin");
      return;
    }
    try {
      const sessionId = await resetAionChatSession();
      setChatSessionId(sessionId);
      setMessages(initialMessages);
      setMessage("");
      markIdle();
      setStatusNote("Yeni AION sohbeti hazır");
      setChatOpen(true);
      void listAionChatSessions().then(setSessions).catch(() => undefined);
    } catch {
      setStatusNote("Yeni sohbet başlatılamadı");
    }
  }, [isSending, markIdle]);

  const handleOpenSession = useCallback(async (sessionId: string) => {
    try {
      const conversation = await loadAionChatSession(sessionId);
      selectAionChatSession(sessionId);
      setChatSessionId(sessionId);
      setMessages(conversation.messages.length > 0 ? conversation.messages : initialMessages);
      setMessage("");
      setChatOpen(true);
      setStatusNote("Sohbet geçmişinden açıldı");
    } catch {
      setStatusNote("Sohbet açılamadı");
    }
  }, []);

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    if (!window.confirm("Bu sohbet kalıcı olarak silinsin mi?")) return;
    try {
      await deleteAionChatSession(sessionId);
      if (sessionId === chatSessionId) {
        const nextSession = await resetAionChatSession();
        setChatSessionId(nextSession);
        setMessages(initialMessages);
      }
      setSessions(await listAionChatSessions());
      setStatusNote("Sohbet silindi");
    } catch {
      setStatusNote("Sohbet silinemedi");
    }
  }, [chatSessionId]);

  const handleQuickAction = (id: string) => {
    const prompt = quickPrompts[id];
    if (!prompt) return;
    openChat();
    setStatusNote("AION komutu çalıştırılıyor");
    void submitPrompt(prompt);
  };

  const handleAskFromWorkspace = (prompt: string) => {
    openChat();
    setStatusNote("AION gerçek kaynakları kontrol ediyor");
    void submitPrompt(prompt);
  };

  const handleLogout = () => {
    setMobileMenuOpen(false);
    setThemePickerOpen(false);
    void endFrontendSession().finally(() => navigate("/giris", { replace: true }));
  };

  const handleVoicePrimary = () => {
    if (!voice.recognitionSupported) {
      voice.activateContinuous();
      openChat();
      return;
    }
    if (voice.muted) {
      openChat();
      return;
    }
    if (!voice.continuousEnabled) {
      voice.activateContinuous();
      setStatusNote("Sürekli dinleme başlatılıyor");
      return;
    }
    openChat();
  };

  const handleMute = () => {
    if (!voice.recognitionSupported) {
      voice.activateContinuous();
      openChat();
      return;
    }
    // The first tap starts continuous listening rather than muting anything,
    // so reporting "microphone muted" there told the owner the opposite of
    // what just happened.
    if (!voice.continuousEnabled) {
      voice.toggleMute();
      setStatusNote("Sürekli dinleme başlatılıyor");
      return;
    }
    voice.toggleMute();
    setStatusNote(voice.muted ? "Mikrofon yeniden açılıyor" : "Mikrofon susturuldu");
  };

  const orbActivity = voice.status === "listening"
    ? "listening"
    : voice.status === "speaking"
      ? "speaking"
      : isSending || voice.status === "processing"
        ? "sending"
        : message.trim()
          ? "typing"
          : "idle";

  return (
    <div className="v2-app">
      <AppNav
        active={activeItem}
        mobileOpen={mobileMenuOpen}
        sessions={sessions}
        currentSessionId={chatSessionId}
        projectCount={projectCount}
        taskCount={openInternalTasks}
        alertCount={attentionCount}
        ownerName={ownerName}
        busy={isSending}
        onSelect={handleSidebarSelect}
        onNewChat={() => { void handleNewChat(); }}
        onOpenSession={(sessionId) => { setMobileMenuOpen(false); void handleOpenSession(sessionId); }}
        onOpenTheme={() => { setMobileMenuOpen(false); setThemePickerOpen(true); }}
        onLogout={handleLogout}
        onClose={() => setMobileMenuOpen(false)}
      />

      <ThemePicker
        open={themePickerOpen}
        onClose={() => setThemePickerOpen(false)}
        onThemeChange={(themeLabel) => setStatusNote(`${themeLabel} teması etkinleştirildi`)}
      />

      <main className={`v2-main is-${activeItem}`} id="assistant-home-screen" data-testid="assistant-home-screen">
        {chatOpen ? (
          <ChatView
            messages={messages}
            draft={message}
            isProcessing={isSending}
            steps={turnSteps}
            pendingApproval={pendingApproval}
            voiceStatus={voice.status}
            voiceError={voice.error}
            interimTranscript={voice.interimTranscript}
            ownerName={ownerName}
            onChange={setMessage}
            onSubmit={handleSubmit}
            onSuggestion={(prompt) => { void submitPrompt(prompt); }}
            onResolveApproval={resolveTurnApproval}
            onSpeakMessage={replayAssistantSpeech}
            onStopSpeaking={voice.stopSpeaking}
            onMic={handleMute}
            onNewChat={() => { void handleNewChat(); }}
            onOpenMenu={() => setMobileMenuOpen(true)}
          />
        ) : (
          <>
            <header className="v2-topbar" data-testid="mobile-topbar">
              <button
                type="button"
                className="v2-icon-btn"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Menüyü aç"
                aria-expanded={mobileMenuOpen}
                data-testid="mobile-menu-button"
              >
                <Menu size={20} aria-hidden="true" />
              </button>
              <span className="v2-topbar-title" data-testid="mobile-brand">{sectionNames[activeItem] ?? "AION"}</span>
              <button
                type="button"
                className="v2-icon-btn"
                onClick={() => { void handleNewChat(); }}
                aria-label="Yeni sohbet"
                data-testid="mobile-new-chat-button"
              >
                <PenSquare size={19} aria-hidden="true" />
              </button>
            </header>
            <div className={`v2-page assistant-content${activeItem === "home" ? " is-home" : " is-workspace"}`}>
              {activeItem === "home" ? (
            <div className="hero-content">
              <OrbAvatar activity={orbActivity} onClick={handleVoicePrimary} />
              <div className="greeting" data-testid="greeting-block">
                <p className="personal-os-kicker">AION · {ownerName} için kişisel AI OS</p>
                <p className="greeting-lead" data-testid="greeting-lead">Merhaba, {ownerName}</p>
                <h1 data-testid="greeting-heading">Bugün neyi ilerletelim?</h1>
                <p className="greeting-subtitle" data-testid="greeting-subtitle">
                  Projelerini, VPS'ini, görevlerini ve kritik değişiklikleri gerçek kaynaklardan takip ediyorum.
                </p>
              </div>

              <div className={`voice-console is-${voice.status}${voice.muted ? " is-muted" : ""}`} data-testid="voice-console">
                <button
                  type="button"
                  className="voice-console-primary"
                  onClick={handleVoicePrimary}
                  aria-label={voice.muted ? "Yazılı sohbeti aç" : "AION sürekli dinlemeyi başlat"}
                  aria-pressed={voice.continuousEnabled && !voice.muted}
                  data-testid="voice-assistant-button"
                >
                  <span className="voice-console-presence" aria-hidden="true">
                    {voice.status === "speaking" ? <AudioLines size={18} /> : voice.muted ? <MicOff size={18} /> : <Mic size={18} />}
                  </span>
                  <span className="voice-console-copy">
                    <strong data-testid="voice-assistant-label">
                      {voice.muted ? "Mikrofon susturuldu" : voice.continuousEnabled ? "AION aktif" : "AION hazır"}
                    </strong>
                    <small data-testid="voice-assistant-status">{voiceStatusText[voice.status]}</small>
                  </span>
                </button>
                <span className="voice-console-divider" aria-hidden="true" />
                <button
                  type="button"
                  className="voice-console-control"
                  onClick={handleMute}
                  aria-label={voice.muted ? "Mikrofonu aç" : "Mikrofonu sustur"}
                  aria-pressed={voice.muted}
                  data-testid="voice-mute-button"
                >
                  {voice.muted ? <MicOff size={17} aria-hidden="true" /> : <Mic size={17} aria-hidden="true" />}
                </button>
                <button
                  type="button"
                  className="voice-console-control"
                  onClick={openChat}
                  aria-label="Yazılı sohbeti aç"
                  data-testid="voice-chat-button"
                >
                  <MessageCircle size={17} aria-hidden="true" />
                </button>
              </div>

              <QuickActions onAction={handleQuickAction} />

              <div className="personal-metrics-grid" aria-label="Mehmet için canlı AION metrikleri" data-testid="personal-metrics-grid">
                <button type="button" onClick={() => handleSidebarSelect("projects")}>
                  <strong>{workspaceLoading ? "…" : projectCount}</strong><span>aktif proje alanı</span><small>Projelerim</small>
                </button>
                <button type="button" onClick={() => handleSidebarSelect("inbox")} className={attentionCount > 0 ? "has-alert" : undefined}>
                  <strong>{workspaceLoading ? "…" : attentionCount}</strong><span>sinyal / uyarı</span><small>{observedChangeCount} yeni gelişme</small>
                </button>
                <button type="button" onClick={() => handleSidebarSelect("tasks")}>
                  <strong>{workspaceLoading ? "…" : openInternalTasks}</strong><span>iç görev</span><small>{repositoryWorkItems} kaynak işi</small>
                </button>
                <button type="button" onClick={() => handleQuickAction("vps")}>
                  <strong>{workspaceLoading ? "…" : `${activeServices}/${totalServices || "?"}`}</strong><span>aktif servis</span><small>VPS</small>
                </button>
                <button type="button" onClick={() => handleRepairNavigate("settings", "setup-connections")} className={blockedIntegrations > 0 ? "has-alert" : undefined}>
                  <strong>{workspaceLoading ? "…" : blockedIntegrations}</strong><span>eksik bağlantı</span><small>{observedLabel}</small>
                </button>
              </div>

              <section className="today-focus-panel" aria-label="Bugünkü öncelikler" data-testid="today-focus-panel">
                <div className="today-focus-heading">
                  <div>
                    <span>Bugün</span>
                    <strong>AION'un gördüğü öncelikler</strong>
                  </div>
                  <button type="button" onClick={() => handleQuickAction("brief")}>Günlük brief</button>
                </div>
                <div className="today-focus-list">
                  {(topPriorities.length > 0 ? topPriorities : ["Canlı kaynaklar yükleniyor; öncelikler birazdan netleşecek."]).map((priority, index) => (
                    <button key={`${priority}-${index}`} type="button" onClick={() => handleAskFromWorkspace(`AION, şu önceliği gerçek kaynaklardan incele ve sıradaki güvenli adımı söyle: ${priority}`)}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <p>{priority}</p>
                    </button>
                  ))}
                </div>
              </section>

              <p className="status-note" aria-live="polite" data-testid="interaction-status">
                {statusNote}
              </p>
            </div>
              ) : (
                <WorkspaceView
                  key={activeItem}
                  view={activeItem as WorkspaceViewId}
                  status={systemStatus}
                  settings={aionSettings}
                  integrations={aionIntegrations}
                  profile={personalProfile}
                  sessions={sessions}
                  loading={workspaceLoading}
                  onRefresh={() => { void refreshWorkspace(true); }}
                  onAsk={handleAskFromWorkspace}
                  onOpenSession={(sessionId) => { void handleOpenSession(sessionId); }}
                  onDeleteSession={(sessionId) => { void handleDeleteSession(sessionId); }}
                  onOpenTheme={() => setThemePickerOpen(true)}
                  onNavigate={handleRepairNavigate}
                />
              )}
            </div>
            <button
              type="button"
              className="v2-chat-fab"
              onClick={openChat}
              aria-label="AION sohbetini aç"
              data-testid="global-chat-fab"
            >
              <MessageCircle size={20} aria-hidden="true" />
              <span>Sohbet</span>
            </button>
          </>
        )}
      </main>
    </div>
  );
}
