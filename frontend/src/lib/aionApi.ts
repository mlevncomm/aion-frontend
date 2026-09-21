import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";

const CHAT_SESSION_KEY = "aion-live-chat-session";
// The mini model answers but does not call tools; the pro model does. AION is
// only useful when it can act, so the tool-capable free model is the default.
export const DEFAULT_AION_MODEL = "nex-agi/nex-n2.5-pro:free";
// Keep the paid-model prohibition intact while giving a stalled free model a
// second route. OpenRouter's `free` router itself is zero-cost and tool-capable.
const FALLBACK_AION_MODEL = "openrouter/free";
const TURN_POLL_INTERVAL_MS = 900;
// The backend retries a stalled round on the next free model itself, so the
// browser only steps in when the whole turn has gone quiet for much longer.
const TURN_STALL_TIMEOUT_MS = 150_000;
const TURN_ABSOLUTE_TIMEOUT_MS = 240_000;

export interface AgentChatSession {
  session_id: string;
  title: string;
  provider: string;
  model: string;
  effort?: string;
  cwd?: string;
  permission_mode?: string;
  running: boolean;
  preview?: string;
  created_ms?: number;
  updated_ms?: number;
  message_count?: number;
  surface?: string;
}

interface AgentChatEvent {
  seq: number;
  ts_ms: number;
  kind: string;
  payload: Record<string, unknown>;
}

interface AgentChatSnapshot {
  session: AgentChatSession;
  events: AgentChatEvent[];
}

interface TurnAccepted {
  turn_id: string;
  session_id: string;
}

export type AionApprovalDecision = "allow" | "deny";

export interface AionApprovalRequest {
  approvalId: string;
  name: string;
  summary: string;
  input: Record<string, unknown>;
}

type AionApprovalHandler = (request: AionApprovalRequest) => Promise<AionApprovalDecision>;

/** One visible step of a running turn (a tool AION is using right now). */
export interface AionTurnStep {
  id: string;
  name: string;
  done: boolean;
  failed?: boolean;
}

type AionProgressHandler = (steps: AionTurnStep[]) => void;

export interface AionStatusSummary {
  observed_at?: number;
  stale?: boolean;
  projects?: unknown[];
  alerts?: unknown[];
  vps?: unknown;
  vercel?: unknown;
  supabase?: unknown;
  [key: string]: unknown;
}

export interface AionSettings {
  language?: string;
  provider?: string;
  model?: string;
  model_policy?: string;
  approvals?: string;
  notifications?: string;
  daily_brief?: string;
  voice?: string;
  trade?: string;
  [key: string]: unknown;
}

export interface AionPersonalProject {
  id: string;
  name: string;
  description: string;
  priority?: string;
  tracking?: string[];
  rules?: string[];
}

export interface AionPersonalProfile {
  owner: {
    id?: string;
    name?: string;
    language?: string;
    timezone?: string;
    assistant_name?: string;
    relationship?: string;
    success_definition?: string;
    communication?: Record<string, unknown>;
  };
  projects?: AionPersonalProject[];
  operating_rules?: string[];
  tracked_areas?: string[];
  workflows?: Array<{ id: string; name: string; goal: string }>;
  autonomy?: {
    automatic?: string[];
    approval_required?: string[];
    denied_by_default?: string[];
  };
  product_contract?: {
    source?: string;
    principles?: string[];
  };
}

export interface AionIntegrationInfo {
  status?: string;
  configured?: boolean;
  observed_at?: number;
  error?: string;
  help?: string;
  host?: string;
  projects?: unknown[];
  deployments?: unknown[];
  tables?: string[];
  secret_fields?: string[];
  public_fields?: string[];
  [key: string]: unknown;
}

export interface AionIntegrations {
  vercel: AionIntegrationInfo;
  supabase: AionIntegrationInfo;
  elevenlabs: AionIntegrationInfo;
  aion_trade: AionIntegrationInfo;
}

export interface AionVoiceSettings {
  provider: "elevenlabs" | "local";
  speed: number;
  stability: number;
  similarity_boost: number;
  style: number;
  pronunciations: Record<string, string>;
  custom_pronunciations: Record<string, string>;
}

export interface AionReadinessRepair {
  label: string;
  surface: string;
  anchor: string;
}

export interface AionReadinessCriterion {
  id: string;
  label: string;
  state: "READY" | "ACTION_REQUIRED" | "OWNER_CONNECTION_REQUIRED" | "VERIFY_ON_DEVICE";
  detail: string;
  /** Present only while the criterion is not READY: the surface that fixes it. */
  action?: AionReadinessRepair;
}

export interface AionReadiness {
  contract: string;
  state: "READY" | "READY_WITH_OWNER_ACTIONS" | "ACTION_REQUIRED";
  criteria: AionReadinessCriterion[];
  connected_accounts: string[];
  reauth_accounts: string[];
  hard_blockers: string[];
  owner_actions: string[];
  observed_at?: number;
}

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  language?: string;
  gender?: string;
  accent?: string;
  description?: string;
}

export interface MarketplacePlugin {
  id: string;
  display_name: string;
  description?: string;
  category?: string;
  featured?: boolean;
  status?: string;
  /** Name of the AION tool this account unlocks, when it binds a native one. */
  native_tool?: string | null;
  live_callable?: boolean;
  oauth_client_configured?: boolean;
  oauth_client_family?: string | null;
  auth_standard?: Record<string, unknown>;
  auth?: Record<string, unknown>;
  fallback_auth?: Record<string, unknown>;
  post_install_hint_md?: string;
  unavailable_reason?: string | null;
}

export interface MarketplaceCatalog {
  plugins: MarketplacePlugin[];
  total: number;
  connected: number;
  category_order?: string[];
}

export interface AionOAuthClients {
  callback_url: string;
  families: Record<string, { configured: boolean; secret_configured: boolean }>;
}

export interface AionDevice {
  id: string;
  name: string;
  platform: string;
  capabilities: string[];
  permissions: Record<string, boolean>;
  created_at?: number;
  last_seen?: number | null;
  status: "ONLINE" | "OFFLINE";
  revoked?: boolean;
}

export interface AionDeviceCommand {
  id: string;
  device_id: string;
  command: string;
  args: Record<string, unknown>;
  status: "queued" | "running" | "done" | "error";
  created_at?: number | null;
  finished_at?: number | null;
  result?: string | null;
}

export interface AionDevicePairing {
  pairing_id: string;
  pairing_token: string;
  expires_at: number;
  expires_in_seconds: number;
}

export interface AionTaskItem {
  id: string;
  project: string;
  title: string;
  note?: string;
  priority?: "critical" | "high" | "normal" | "low";
  status?: "pending" | "completed";
  created_at?: number;
  updated_at?: number;
  completed_at?: number | null;
}

export interface AionConversationMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
}

export async function getAionStatus(): Promise<AionStatusSummary> {
  return apiGet<AionStatusSummary>("/aion/status");
}

export async function getAionReadiness(): Promise<AionReadiness> {
  return apiGet<AionReadiness>("/aion/readiness");
}

export async function getAionSettings(): Promise<AionSettings> {
  return apiGet<AionSettings>("/aion/settings");
}

export async function getAionProfile(): Promise<AionPersonalProfile> {
  return apiGet<AionPersonalProfile>("/aion/profile");
}

export async function getAionIntegrations(): Promise<AionIntegrations> {
  return apiGet<AionIntegrations>("/aion/integrations");
}

export async function saveAionIntegration(
  provider: "vercel" | "supabase" | "elevenlabs",
  values: { token?: string; host?: string; publishable_key?: string; api_key?: string; voice_id?: string },
): Promise<Record<string, unknown>> {
  return apiPost<Record<string, unknown>>(`/aion/integrations/${provider}`, values);
}

export async function disconnectAionIntegration(provider: "vercel" | "supabase" | "elevenlabs"): Promise<Record<string, unknown>> {
  return apiDelete<Record<string, unknown>>(`/aion/integrations/${provider}`);
}

export async function listElevenLabsVoices(): Promise<ElevenLabsVoice[]> {
  const result = await apiGet<{ voices: ElevenLabsVoice[] }>("/aion/integrations/elevenlabs/voices");
  return result.voices ?? [];
}

export async function previewElevenLabsVoices(apiKey: string): Promise<ElevenLabsVoice[]> {
  const result = await apiPost<{ voices: ElevenLabsVoice[] }>("/aion/integrations/elevenlabs/voices/preview", { api_key: apiKey });
  return result.voices ?? [];
}

export async function getAionVoiceSettings(): Promise<AionVoiceSettings> {
  return apiGet<AionVoiceSettings>("/aion/voice/settings");
}

export async function saveAionVoiceSettings(settings: {
  speed: number;
  stability: number;
  similarity_boost: number;
  style: number;
  pronunciations: Record<string, string>;
}): Promise<AionVoiceSettings> {
  return apiPost<AionVoiceSettings>("/aion/voice/settings", settings);
}

export async function getMarketplacePlugins(): Promise<MarketplaceCatalog> {
  return apiGet<MarketplaceCatalog>("/marketplace/plugins");
}

export async function connectMarketplaceToken(pluginId: string, token: string, instanceUrl?: string): Promise<Record<string, unknown>> {
  return apiPost<Record<string, unknown>>(`/marketplace/plugins/${encodeURIComponent(pluginId)}/connect/pat`, {
    token,
    ...(instanceUrl ? { instance_url: instanceUrl } : {}),
  });
}

export async function startMarketplaceConnect(pluginId: string, instanceUrl?: string): Promise<Record<string, unknown>> {
  return apiPost<Record<string, unknown>>(`/marketplace/plugins/${encodeURIComponent(pluginId)}/connect/start`, instanceUrl ? { instance_url: instanceUrl } : {});
}

export async function pollMarketplaceConnect(pluginId: string, flowId: string): Promise<Record<string, unknown>> {
  return apiGet<Record<string, unknown>>(`/marketplace/plugins/${encodeURIComponent(pluginId)}/connect/poll/${encodeURIComponent(flowId)}`);
}

export async function disconnectMarketplacePlugin(pluginId: string): Promise<Record<string, unknown>> {
  return apiDelete<Record<string, unknown>>(`/marketplace/plugins/${encodeURIComponent(pluginId)}`);
}

export async function getAionOAuthClients(): Promise<AionOAuthClients> {
  return apiGet<AionOAuthClients>("/aion/oauth-clients");
}

export async function saveAionOAuthClient(
  family: string,
  clientId: string,
  clientSecret?: string,
): Promise<Record<string, unknown>> {
  return apiPost<Record<string, unknown>>(`/aion/oauth-clients/${encodeURIComponent(family)}`, {
    client_id: clientId,
    ...(clientSecret ? { client_secret: clientSecret } : {}),
  });
}

export async function deleteAionOAuthClient(family: string): Promise<Record<string, unknown>> {
  return apiDelete<Record<string, unknown>>(`/aion/oauth-clients/${encodeURIComponent(family)}`);
}

export async function getAionDevices(): Promise<AionDevice[]> {
  const result = await apiGet<{ items: AionDevice[] }>("/aion/devices");
  return result.items ?? [];
}

export async function getAionDeviceCommands(): Promise<AionDeviceCommand[]> {
  const result = await apiGet<{ items: AionDeviceCommand[] }>("/aion/devices/commands");
  return result.items ?? [];
}

export async function createAionDevicePairing(): Promise<AionDevicePairing> {
  return apiPost<AionDevicePairing>("/aion/devices/pairing", {});
}

export async function updateAionDevicePermissions(deviceId: string, permissions: Record<string, boolean>): Promise<AionDevice> {
  return apiPatch<AionDevice>(`/aion/devices/${encodeURIComponent(deviceId)}/permissions`, { permissions });
}

export async function revokeAionDevice(deviceId: string): Promise<void> {
  await apiDelete<void>(`/aion/devices/${encodeURIComponent(deviceId)}`);
}

export async function queueAionDeviceCommand(
  deviceId: string,
  command: "open_url" | "open_app" | "notify",
  args: Record<string, string>,
): Promise<Record<string, unknown>> {
  return apiPost<Record<string, unknown>>(`/aion/devices/${encodeURIComponent(deviceId)}/commands/${command}`, { args });
}

export async function mutateAionTask(payload: {
  action: "list" | "create" | "update" | "complete" | "reopen";
  task_id?: string;
  project?: string;
  title?: string;
  note?: string;
  priority?: "critical" | "high" | "normal" | "low";
}): Promise<AionTaskItem | { items: AionTaskItem[] }> {
  return apiPost<AionTaskItem | { items: AionTaskItem[] }>("/aion/tasks", payload);
}

export async function getAionControlKey(): Promise<{ key: string; masked: string }> {
  return apiGet<{ key: string; masked: string }>("/control/api-key");
}

export async function listAionChatSessions(limit = 40): Promise<AgentChatSession[]> {
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const result = await apiGet<{ sessions: AgentChatSession[] }>(
    `/agent-chat/sessions?surface=jarvis&limit=${safeLimit}`,
  );
  return result.sessions ?? [];
}

export async function loadAionChatSession(sessionId: string): Promise<{
  session: AgentChatSession;
  messages: AionConversationMessage[];
}> {
  const snapshot = await apiGet<AgentChatSnapshot>(`/agent-chat/sessions/${encodeURIComponent(sessionId)}`);
  const messages: AionConversationMessage[] = [];
  for (const event of snapshot.events) {
    if (event.kind === "user_message") {
      const visible = event.payload.typed ?? event.payload.text;
      if (typeof visible === "string" && visible.trim()) {
        messages.push({ id: `user-${event.seq}`, role: "user", text: visible.trim() });
      }
    }
    if (event.kind === "assistant_text") {
      const text = event.payload.text;
      if (typeof text === "string" && text.trim()) {
        messages.push({ id: `assistant-${event.seq}`, role: "assistant", text: text.trim() });
      }
    }
  }
  return { session: snapshot.session, messages };
}

export function selectAionChatSession(sessionId: string): void {
  sessionStorage.setItem(CHAT_SESSION_KEY, sessionId);
}

export async function deleteAionChatSession(sessionId: string): Promise<void> {
  await apiDelete(`/agent-chat/sessions/${encodeURIComponent(sessionId)}`);
  if (sessionStorage.getItem(CHAT_SESSION_KEY) === sessionId) {
    sessionStorage.removeItem(CHAT_SESSION_KEY);
  }
}

export async function createAionChatSession(model = DEFAULT_AION_MODEL): Promise<string> {
  const session = await apiPost<AgentChatSession>("/agent-chat/sessions", {
    provider: "openrouter",
    model,
    permission_mode: "ask",
    title: "AION",
    surface: "jarvis",
  });
  selectAionChatSession(session.session_id);
  return session.session_id;
}

/** The guard's message when the session's model is no longer free + tools. */
const MODEL_GUARD_ERROR = /Ücretsiz uygun model bulunamadı/i;

export async function ensureAionChatSession(): Promise<string> {
  const current = sessionStorage.getItem(CHAT_SESSION_KEY);
  if (current) {
    try {
      const snapshot = await apiGet<AgentChatSnapshot>(`/agent-chat/sessions/${encodeURIComponent(current)}`);
      // AION used the generic `agent` surface before connected-account tools
      // were safely bounded. Migrate the browser to the dedicated Jarvis/AION
      // surface so future turns can use real connected services through the
      // ToolExecutor risk/approval gates. Old sessions remain persisted.
      if (snapshot.session.surface === "jarvis") return current;
      sessionStorage.removeItem(CHAT_SESSION_KEY);
    } catch {
      sessionStorage.removeItem(CHAT_SESSION_KEY);
    }
  }
  return createAionChatSession();
}

export async function resetAionChatSession(model = DEFAULT_AION_MODEL): Promise<string> {
  sessionStorage.removeItem(CHAT_SESSION_KEY);
  return createAionChatSession(model);
}

function eventTurnId(event: AgentChatEvent): string {
  const value = event.payload.turn_id;
  return typeof value === "string" ? value : "";
}

function assistantTextForTurn(events: AgentChatEvent[], turnId: string): string {
  const matching = events.filter((event) => event.kind === "assistant_text" && eventTurnId(event) === turnId);
  const latest = matching.at(-1)?.payload.text;
  return typeof latest === "string" ? latest.trim() : "";
}

function turnFinished(events: AgentChatEvent[], turnId: string): { done: boolean; error?: string } {
  const event = events.find((item) => item.kind === "turn_finished" && eventTurnId(item) === turnId);
  if (!event) return { done: false };
  const status = event.payload.status;
  const error = event.payload.error;
  return {
    done: true,
    error: status === "done" ? undefined : typeof error === "string" && error ? error : "AION yanıtı tamamlanamadı.",
  };
}

function pendingApprovalForTurn(
  events: AgentChatEvent[],
  turnId: string,
  handled: Set<string>,
): AionApprovalRequest | null {
  const resolved = new Set(
    events
      .filter((item) => item.kind === "approval_resolved" && eventTurnId(item) === turnId)
      .map((item) => typeof item.payload.approval_id === "string" ? item.payload.approval_id : "")
      .filter(Boolean),
  );
  for (const item of events) {
    if (item.kind !== "approval_required" || eventTurnId(item) !== turnId) continue;
    const approvalId = typeof item.payload.approval_id === "string" ? item.payload.approval_id : "";
    if (!approvalId || resolved.has(approvalId) || handled.has(approvalId)) continue;
    const rawInput = item.payload.input;
    return {
      approvalId,
      name: typeof item.payload.name === "string" ? item.payload.name : "AION işlemi",
      summary: typeof item.payload.summary === "string" ? item.payload.summary : "AION bir işlem için onay istiyor.",
      input: rawInput && typeof rawInput === "object" && !Array.isArray(rawInput) ? rawInput as Record<string, unknown> : {},
    };
  }
  return null;
}

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

class AionTurnStalledError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AionTurnStalledError";
  }
}

async function cancelAionTurn(sessionId: string): Promise<void> {
  await apiPost(`/agent-chat/sessions/${encodeURIComponent(sessionId)}/cancel`, {}).catch(() => undefined);
}

async function switchAionSessionModel(sessionId: string, model: string): Promise<void> {
  await apiPatch<AgentChatSession>(`/agent-chat/sessions/${encodeURIComponent(sessionId)}`, { model });
}

async function resolveAionApproval(
  sessionId: string,
  approvalId: string,
  decision: AionApprovalDecision,
): Promise<void> {
  await apiPost(`/agent-chat/sessions/${encodeURIComponent(sessionId)}/approvals/${encodeURIComponent(approvalId)}`, { decision });
}

function stepsForTurn(events: AgentChatEvent[], turnId: string): AionTurnStep[] {
  const steps = new Map<string, AionTurnStep>();
  for (const event of events) {
    if (eventTurnId(event) !== turnId) continue;
    const callId = typeof event.payload.call_id === "string" ? event.payload.call_id : String(event.seq);
    if (event.kind === "tool_call") {
      const name = typeof event.payload.name === "string" ? event.payload.name : "araç";
      steps.set(callId, { id: callId, name, done: false });
    } else if (event.kind === "tool_result") {
      const current = steps.get(callId);
      const name = typeof event.payload.name === "string" ? event.payload.name : current?.name ?? "araç";
      steps.set(callId, { id: callId, name, done: true, failed: event.payload.is_error === true });
    }
  }
  return [...steps.values()];
}

async function waitForAionTurn(
  sessionId: string,
  turnId: string,
  onApproval?: AionApprovalHandler,
  onProgress?: AionProgressHandler,
): Promise<string> {
  let deadlineAt = Date.now() + TURN_ABSOLUTE_TIMEOUT_MS;
  let lastProgressAt = Date.now();
  let lastSeq = -1;
  const handledApprovals = new Set<string>();

  while (Date.now() < deadlineAt) {
    const snapshot = await apiGet<AgentChatSnapshot>(`/agent-chat/sessions/${encodeURIComponent(sessionId)}`);
    const newestSeq = snapshot.events.at(-1)?.seq ?? -1;
    if (newestSeq !== lastSeq) {
      lastSeq = newestSeq;
      lastProgressAt = Date.now();
      onProgress?.(stepsForTurn(snapshot.events, turnId));
    }

    const result = turnFinished(snapshot.events, turnId);
    if (result.done) {
      if (result.error) throw new Error(result.error);
      const answer = assistantTextForTurn(snapshot.events, turnId) || snapshot.session.preview?.trim();
      if (!answer) throw new Error("AION boş bir yanıt döndürdü.");
      return answer;
    }

    const approval = pendingApprovalForTurn(snapshot.events, turnId, handledApprovals);
    if (approval) {
      if (!onApproval) {
        await cancelAionTurn(sessionId);
        throw new Error("AION bir işlem için onay bekliyor fakat bu ekranda onay verilemiyor.");
      }
      handledApprovals.add(approval.approvalId);
      const decision = await onApproval(approval);
      await resolveAionApproval(sessionId, approval.approvalId, decision);
      // Human approval time is not model latency. Give the resumed turn a fresh
      // answer budget instead of cancelling it because the owner read the card.
      deadlineAt = Date.now() + TURN_ABSOLUTE_TIMEOUT_MS;
      lastProgressAt = Date.now();
      continue;
    }

    // A complex tool run may legitimately take time, so only call a turn
    // stalled when its event stream has made no progress for a full minute.
    // This catches the observed 2–5 minute provider queue without killing an
    // actively progressing workflow.
    if (Date.now() - lastProgressAt >= TURN_STALL_TIMEOUT_MS) {
      await cancelAionTurn(sessionId);
      throw new AionTurnStalledError("AION model yanıtı ilerlemedi; ücretsiz yedek modele geçiliyor.");
    }
    await wait(TURN_POLL_INTERVAL_MS);
  }

  await cancelAionTurn(sessionId);
  throw new AionTurnStalledError("AION yanıtı süre sınırını aştı; çalışan turn güvenli biçimde durduruldu.");
}

export async function sendAionMessage(
  text: string,
  sessionId?: string,
  inputMode: "text" | "voice" = "text",
  onApproval?: AionApprovalHandler,
  onProgress?: AionProgressHandler,
): Promise<{ sessionId: string; text: string }> {
  let activeSession = sessionId ?? await ensureAionChatSession();
  const body = {
    text,
    input_mode: inputMode,
    attachments: [],
    tool_choices: [],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Istanbul",
  };
  let usedFallback = false;

  while (true) {
    const accepted = await apiPost<TurnAccepted>(
      `/agent-chat/sessions/${encodeURIComponent(activeSession)}/messages`,
      body,
    );

    try {
      const answer = await waitForAionTurn(activeSession, accepted.turn_id, onApproval, onProgress);
      return { sessionId: activeSession, text: answer };
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const shouldFallback = !usedFallback && (
        error instanceof AionTurnStalledError
        || MODEL_GUARD_ERROR.test(message)
        || /zaman aşım/i.test(message)
      );
      if (!shouldFallback) throw error;

      usedFallback = true;
      await cancelAionTurn(activeSession);
      // A stall is retried on the same session and model: the backend walks
      // its own free-model chain. Only a model the free catalogue no longer
      // lists is swapped, so one slow answer never pins the chat to the weak
      // router for good.
      if (!MODEL_GUARD_ERROR.test(message)) continue;
      try {
        // Preserve the conversation when possible; only the model changes.
        await switchAionSessionModel(activeSession, FALLBACK_AION_MODEL);
      } catch {
        // If the old session cannot be patched, create one clean fallback
        // session rather than leaving the owner with a permanently dead chat.
        activeSession = await resetAionChatSession(FALLBACK_AION_MODEL);
      }
    }
  }
}

export async function speakWithAion(text: string, reusableAudio?: HTMLAudioElement): Promise<HTMLAudioElement> {
  // Synthesis measured at ~1.3s for a long sentence. A request still pending
  // after 12s is a stalled mobile connection, and the voice loop must be told
  // so rather than waiting on a promise that will never settle.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  let response: Response;
  try {
    response = await fetch("/api/aion/tts", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) throw new Error(`TTS ${response.status}`);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const audio = reusableAudio ?? new Audio();
  const previousObjectUrl = audio.dataset.aionObjectUrl;
  if (previousObjectUrl) URL.revokeObjectURL(previousObjectUrl);
  audio.src = url;
  audio.preload = "auto";
  audio.volume = 1;
  audio.dataset.aionObjectUrl = url;
  audio.addEventListener("ended", () => {
    if (audio.dataset.aionObjectUrl === url) {
      URL.revokeObjectURL(url);
      delete audio.dataset.aionObjectUrl;
    }
  }, { once: true });
  audio.addEventListener("error", () => {
    if (audio.dataset.aionObjectUrl === url) {
      URL.revokeObjectURL(url);
      delete audio.dataset.aionObjectUrl;
    }
  }, { once: true });
  return audio;
}

const SESSION_FETCH_TIMEOUT_MS = 12_000;

async function sessionFetch(path: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), SESSION_FETCH_TIMEOUT_MS);
  try {
    return await fetch(path, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

export async function backendSessionActive(): Promise<boolean> {
  const response = await sessionFetch("/api/config", { credentials: "same-origin", cache: "no-store" });
  return response.ok;
}

export async function createBackendSession(controlKey: string): Promise<boolean> {
  const response = await sessionFetch("/api/ui/session", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ control_key: controlKey }),
  });
  return response.ok;
}
