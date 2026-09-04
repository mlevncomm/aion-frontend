import { useCallback, useEffect, useRef, useState } from "react";
import { HermesChat } from "@/lib/hermesChat";
import type { HermesState } from "@/lib/hermesChat";

const ANSI_ESCAPE_REGEX = /\x1b\[[0-9;]*[a-zA-Z]|\r/g;

function stripAnsi(text: string): string {
  return text.replace(ANSI_ESCAPE_REGEX, "");
}

export interface UseHermesChatReturn {
  state: HermesState;
  error: Error | null;
  isSending: boolean;
  assistantText: string;
  send: (prompt: string) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export function useHermesChat(): UseHermesChatReturn {
  const chatRef = useRef<HermesChat | null>(null);
  const [state, setState] = useState<HermesState>("disconnected");
  const [error, setError] = useState<Error | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [assistantText, setAssistantText] = useState("");
  const assistantBufferRef = useRef<string>("");

  useEffect(() => {
    const chat = new HermesChat();
    chatRef.current = chat;

    chat.onState((newState, err) => {
      setState(newState);
      setError(err ?? null);
    });

    chat.onData((rawLine) => {
      const clean = stripAnsi(rawLine);
      if (clean) {
        assistantBufferRef.current += clean;
        setAssistantText(assistantBufferRef.current);
      }
    });

    return () => {
      chat.close();
      chatRef.current = null;
    };
  }, []);

  const connect = useCallback(async () => {
    const chat = chatRef.current;
    if (!chat) return;
    if (chat.getState() === "connected" || chat.getState() === "connecting") return;
    await chat.connect({ resume: true });
  }, []);

  const disconnect = useCallback(() => {
    const chat = chatRef.current;
    if (chat) {
      chat.close();
    }
  }, []);

  const send = useCallback((prompt: string) => {
    const chat = chatRef.current;
    if (!chat || chat.getState() !== "connected") {
      setError(new Error("Not connected"));
      return;
    }
    setIsSending(true);
    assistantBufferRef.current = "";
    setAssistantText("");
    try {
      chat.sendPrompt(prompt);
    } catch (e) {
      setIsSending(false);
      setError(e instanceof Error ? e : new Error(String(e)));
    }
  }, []);

  useEffect(() => {
    if (state === "connected" && isSending && assistantBufferRef.current) {
      setIsSending(false);
    }
  }, [state, isSending]);

  return { state, error, isSending, assistantText, send, connect, disconnect };
}