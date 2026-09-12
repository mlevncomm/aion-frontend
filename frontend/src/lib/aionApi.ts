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

export interface AionConversationMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
}

export async function getAionStatus(): Promise<AionStatusSummary> {
  return apiGet<AionStatusSummary>("/aion/status");
}

export async function getAionSettings(): Promise<AionSettings> {
  return apiGet<AionSettings>("/aion/settings");
}

export async function getAionControlKey(): Promise<{ key: string; masked: string }> {
  return apiGet<{ key: string; masked: string }>("/control/api-key");
}

export async function listAionChatSessions(limit = 40): Promise<AgentChatSession[]> {
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const result = await apiGet<{ sessions: AgentChatSession[] }>(
    `/agent-chat/sessions?surface=agent&limit=${safeLimit}`,
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
    surface: "agent",
  });
  selectAionChatSession(session.session_id);
  return session.session_id;
}

export async function ensureAionChatSession(): Promise<string> {
  const current = sessionStorage.getItem(CHAT_SESSION_KEY);
  if (current) {
    try {
      await apiGet<AgentChatSnapshot>(`/agent-chat/sessions/${encodeURIComponent(current)}`);
      return current;
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
