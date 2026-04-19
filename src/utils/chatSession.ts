import { ChatMode } from '../config/openAiPrompt';

export interface StoredChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
}

export interface StoredChatSession {
  mode: ChatMode;
  voiceRepliesEnabled: boolean;
  messages: StoredChatMessage[];
}

const CHAT_SESSION_KEY = 'catholic-tradition-ai/chat-session/v1';

function isValidMode(value: unknown): value is ChatMode {
  return value === 'fathers' || value === 'proofs' || value === 'apologetics' || value === 'dogmaticSources' || value === 'papalPreVaticanII' || value === 'papalAll';
}

export function loadChatSession(): StoredChatSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawSession = window.localStorage.getItem(CHAT_SESSION_KEY);
    if (!rawSession) {
      return null;
    }

    const parsed = JSON.parse(rawSession) as Partial<StoredChatSession>;
    if (!isValidMode(parsed.mode) || typeof parsed.voiceRepliesEnabled !== 'boolean' || !Array.isArray(parsed.messages)) {
      return null;
    }

    const messages = parsed.messages.filter(
      (message): message is StoredChatMessage =>
        Boolean(message) &&
        typeof message.id === 'string' &&
        (message.role === 'assistant' || message.role === 'user') &&
        typeof message.content === 'string' &&
        message.content.trim().length > 0
    );

    return {
      mode: parsed.mode,
      voiceRepliesEnabled: parsed.voiceRepliesEnabled,
      messages
    };
  } catch {
    return null;
  }
}

export function saveChatSession(session: StoredChatSession): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(CHAT_SESSION_KEY, JSON.stringify(session));
}