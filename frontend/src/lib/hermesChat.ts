export type HermesState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error' | 'closed';

export interface HermesCallbacks {
  onData?: (data: string) => void;
  onState?: (state: HermesState, error?: Error) => void;
}

export interface ConnectOptions {
  resume?: boolean;
  profile?: string;
}

export class HermesChat {
  private ws: WebSocket | null = null;
  private decoder = new TextDecoder('utf-8', { fatal: false });
  private buffer = '';
  private state: HermesState = 'disconnected';
  private callbacks: HermesCallbacks = {};
  private connectTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly timeoutMs = 10000;
  private baseUrl: string;
  private profile?: string;

  constructor(options?: { baseUrl?: string }) {
    this.baseUrl = options?.baseUrl ?? this.resolveBaseUrl();
  }

  private resolveBaseUrl(): string {
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_HERMES_API_BASE) {
      return import.meta.env.VITE_HERMES_API_BASE;
    }
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return '';
  }

  private setState(newState: HermesState, error?: Error): void {
    if (this.state === newState) return;
    this.state = newState;
    this.callbacks.onState?.(newState, error);
  }

  connect(options: ConnectOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.state === 'connected' || this.state === 'connecting') {
        resolve();
        return;
      }

      this.profile = options.profile;
      this.setState('connecting');

      this.connectTimeout = setTimeout(() => {
        this.cleanup();
        this.setState('error', new Error('Connection timeout'));
        reject(new Error('Connection timeout'));
      }, this.timeoutMs);

      this.fetchTicket()
        .then((ticket) => this.openWebSocket(ticket))
        .then(() => {
          if (this.connectTimeout) {
            clearTimeout(this.connectTimeout);
            this.connectTimeout = null;
          }
          this.setState('connected');
          resolve();
        })
        .catch((err) => {
          if (this.connectTimeout) {
            clearTimeout(this.connectTimeout);
            this.connectTimeout = null;
          }
          this.cleanup();
          this.setState('error', err);
          reject(err);
        });
    });
  }

  private async fetchTicket(): Promise<string> {
    const url = `${this.baseUrl}/api/auth/ws-ticket`;
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: this.profile }),
    });

    if (!res.ok) {
      throw new Error(`Failed to get WS ticket: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    if (!data?.ticket) {
      throw new Error('Invalid ticket response');
    }
    return data.ticket;
  }

  private openWebSocket(ticket: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const proto = this.baseUrl.startsWith('https:') ? 'wss:' : 'ws:';
      const wsUrl = `${proto}//${new URL(this.baseUrl).host}/api/pty?ticket=${encodeURIComponent(ticket)}`;

      this.ws = new WebSocket(wsUrl);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => resolve();
      this.ws.onerror = () => reject(new Error('WebSocket error'));
      this.ws.onclose = (e) => {
        if (this.state !== 'closed') {
          this.setState('error', new Error(`WebSocket closed: ${e.code} ${e.reason}`));
        }
      };
      this.ws.onmessage = (event) => this.handleMessage(event.data);
    });
  }

  private handleMessage(data: ArrayBuffer | string): void {
    if (typeof data === 'string') {
      this.buffer += data;
    } else {
      this.buffer += this.decoder.decode(data, { stream: true });
    }

    let newlineIndex: number;
    while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, newlineIndex);
      this.buffer = this.buffer.slice(newlineIndex + 1);
      if (line) this.callbacks.onData?.(line);
    }
  }

  sendPrompt(text: string): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected');
    }
    this.ws.send(text + '\r');
  }

  onData(callback: (data: string) => void): void {
    this.callbacks.onData = callback;
  }

  onState(callback: (state: HermesState, error?: Error) => void): void {
    this.callbacks.onState = callback;
  }

  close(): void {
    this.setState('closed');
    this.cleanup();
  }

  private cleanup(): void {
    if (this.connectTimeout) {
      clearTimeout(this.connectTimeout);
      this.connectTimeout = null;
    }
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      this.ws.onmessage = null;
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }
    this.buffer = '';
  }

  getState(): HermesState {
    return this.state;
  }
}