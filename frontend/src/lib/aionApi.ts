import { apiDelete, apiGet, apiPost } from "@/lib/api";

const CHAT_SESSION_KEY = "aion-live-chat-session";
export const DEFAULT_AION_MODEL = "nex-agi/nex-n2.5-mini:free";

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

export interface AionReadinessCriterion {
  id: string;
  label: string;
  state: "READY" | "ACTION_REQUIRED" | "OWNER_CONNECTION_REQUIRED" | "VERIFY_ON_DEVICE";
  detail: string;
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

export async function listAionTasks(): Promise<AionTaskItem[]> {
  const result = await apiGet<{ items: AionTaskItem[] }>("/aion/tasks");
  return result.items ?? [];
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

export async function createAionChatSession(): Promise<string> {
  const session = await apiPost<AgentChatSession>("/agent-chat/sessions", {
    provider: "openrouter",
    model: DEFAULT_AION_MODEL,
    permission_mode: "ask",
    title: "AION",
    surface: "jarvis",
  });
  selectAionChatSession(session.session_id);
  return session.session_id;
}

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

export async function resetAionChatSession(): Promise<string> {
  sessionStorage.removeItem(CHAT_SESSION_KEY);
  return createAionChatSession();
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

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export async function sendAionMessage(
  text: string,
  sessionId?: string,
  inputMode: "text" | "voice" = "text",
): Promise<{ sessionId: string; text: string }> {
  const activeSession = sessionId ?? await ensureAionChatSession();
  const accepted = await apiPost<TurnAccepted>(
    `/agent-chat/sessions/${encodeURIComponent(activeSession)}/messages`,
    {
      text,
      input_mode: inputMode,
      attachments: [],
      tool_choices: [],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Istanbul",
    },
  );

  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    const snapshot = await apiGet<AgentChatSnapshot>(`/agent-chat/sessions/${encodeURIComponent(activeSession)}`);
    const result = turnFinished(snapshot.events, accepted.turn_id);
    if (result.done) {
      if (result.error) throw new Error(result.error);
      const answer = assistantTextForTurn(snapshot.events, accepted.turn_id) || snapshot.session.preview?.trim();
      if (!answer) throw new Error("AION boş bir yanıt döndürdü.");
      return { sessionId: activeSession, text: answer };
    }
    await wait(450);
  }
  throw new Error("AION yanıtı zaman aşımına uğradı.");
}

export async function speakWithAion(text: string): Promise<HTMLAudioElement> {
  const response = await fetch("/api/aion/tts", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) throw new Error(`TTS ${response.status}`);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.addEventListener("ended", () => URL.revokeObjectURL(url), { once: true });
  audio.addEventListener("error", () => URL.revokeObjectURL(url), { once: true });
  return audio;
}

export async function backendSessionActive(): Promise<boolean> {
  const response = await fetch("/api/config", { credentials: "same-origin", cache: "no-store" });
  return response.ok;
}

export async function createBackendSession(controlKey: string): Promise<boolean> {
  const response = await fetch("/api/ui/session", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ control_key: controlKey }),
  });
  return response.ok;
}
