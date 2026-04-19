import { IonButton, IonChip, IonContent, IonHeader, IonIcon, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { micOutline, sendOutline, volumeHighOutline } from 'ionicons/icons';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { chatModeOptions, getChatModeOption } from '../config/chatModes';
import { ChatMode } from '../config/openAiPrompt';
import { loadChatSession, saveChatSession, StoredChatMessage } from '../utils/chatSession';
import './Tab1.css';

interface ChatResponse {
  content?: string;
  error?: string;
}

interface TtsResponse {
  audioBase64?: string;
  contentType?: string;
  error?: string;
  details?: unknown;
}

type SpeechRecognitionConstructor = new () => SpeechRecognition;

const starterAssistantMessage: StoredChatMessage = {
  id: 'assistant-intro',
  role: 'assistant',
  content: 'Choose a mode, ask your question by typing or voice, and I will answer in text. If voice replies are enabled, I can also read the answer aloud.'
};

const starterPrompts: Record<ChatMode, string[]> = {
  fathers: [
    'How did the Fathers interpret John 6?',
    'What did Ignatius of Antioch say about Church unity?',
    'How did Augustine speak about grace and conversion?'
  ],
  proofs: [
    'Give me a Thomistic proof for God as first cause.',
    'Explain the difference between essence and existence.',
    'Show the objections and reply on faith and reason.'
  ],
  apologetics: [
    'Why do Catholics pray to saints?',
    'How would you explain confession to a Protestant friend?',
    'Why does the Catholic Church claim authority to teach?'
  ]
};

function sanitizeMode(mode: string | null): ChatMode | null {
  if (mode === 'fathers' || mode === 'proofs' || mode === 'apologetics') {
    return mode;
  }

  return null;
}

async function parseApiResponse<T extends { error?: string; details?: unknown }>(response: Response): Promise<T> {
  const rawBody = await response.text();

  if (!rawBody) {
    return {} as T;
  }

  try {
    return JSON.parse(rawBody) as T;
  } catch {
    return {
      error: rawBody.trim() || `Request failed with status ${response.status}.`
    } as T;
  }
}

function formatApiError(payload: { error?: string; details?: unknown }, fallback: string): string {
  if (typeof payload.error === 'string' && payload.error.includes('FUNCTION_INVOCATION_FAILED')) {
    return 'The serverless function failed before it could answer. Redeploy the app or review the Vercel function logs.';
  }

  if (typeof payload.error === 'string' && payload.error.trim().length > 0) {
    return payload.error;
  }

  if (typeof payload.details === 'string' && payload.details.trim().length > 0) {
    if (payload.details.includes('FUNCTION_INVOCATION_FAILED')) {
      return 'The serverless function failed before it could answer. Redeploy the app or review the Vercel function logs.';
    }

    return payload.details;
  }

  return fallback;
}

const Tab1: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const storedSession = loadChatSession();
  const [mode, setMode] = useState<ChatMode>(storedSession?.mode ?? 'apologetics');
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<StoredChatMessage[]>(storedSession?.messages.length ? storedSession.messages : [starterAssistantMessage]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [voiceRepliesEnabled, setVoiceRepliesEnabled] = useState(storedSession?.voiceRepliesEnabled ?? true);
  const [listeningSupported, setListeningSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeAudioMessageId, setActiveAudioMessageId] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const recognitionFactory = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!recognitionFactory) {
      return;
    }

    setListeningSupported(true);

    const Recognition = recognitionFactory as SpeechRecognitionConstructor;
    const recognition = new Recognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? '')
        .join(' ')
        .trim();

      setDraft(transcript);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setError('Voice input is unavailable right now. You can keep typing in the same chat.');
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    saveChatSession({
      mode,
      voiceRepliesEnabled,
      messages
    });
  }, [messages, mode, voiceRepliesEnabled]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const requestedMode = sanitizeMode(params.get('mode'));
    const requestedPrompt = params.get('prompt')?.trim();

    if (!requestedMode && !requestedPrompt) {
      return;
    }

    if (requestedMode) {
      setMode(requestedMode);
    }

    if (requestedPrompt) {
      setDraft(requestedPrompt);
    }

    history.replace('/tab1');
  }, [history, location.search]);

  const selectedMode = getChatModeOption(mode);

  const sendPrompt = async (prompt: string) => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || isSubmitting) {
      return;
    }

    const nextUserMessage: StoredChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmedPrompt
    };

    const nextMessages = [...messages, nextUserMessage];
    setMessages(nextMessages);
    setDraft('');
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mode,
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content
          }))
        })
      });

      const payload = await parseApiResponse<ChatResponse & { details?: unknown }>(response);
      if (!response.ok || !payload.content) {
        throw new Error(formatApiError(payload, 'The assistant could not answer that question.'));
      }

      const assistantMessage: StoredChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: payload.content
      };

      setMessages((currentMessages) => [...currentMessages, assistantMessage]);

      if (voiceRepliesEnabled) {
        await playAudioForMessage(assistantMessage);
      }
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Something went wrong while contacting the assistant.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await sendPrompt(draft);
  };

  const playAudioForMessage = async (message: StoredChatMessage) => {
    if (message.role !== 'assistant') {
      return;
    }

    setError('');
    setActiveAudioMessageId(message.id);

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: message.content })
      });

      const payload = await parseApiResponse<TtsResponse>(response);
      if (!response.ok || !payload.audioBase64) {
        throw new Error(formatApiError(payload, 'Voice playback is unavailable right now.'));
      }

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const contentType = payload.contentType || 'audio/mpeg';
      const audio = new Audio(`data:${contentType};base64,${payload.audioBase64}`);
      audioRef.current = audio;
      audio.onended = () => {
        setActiveAudioMessageId((currentId) => (currentId === message.id ? null : currentId));
      };
      await audio.play();
    } catch (caughtError) {
      const messageText = caughtError instanceof Error ? caughtError.message : 'Voice playback failed.';
      setError(messageText);
      setActiveAudioMessageId(null);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      return;
    }

    setError('');

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    recognitionRef.current.start();
    setIsListening(true);
  };

  const resetConversation = () => {
    setMessages([starterAssistantMessage]);
    setDraft('');
    setError('');
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setActiveAudioMessageId(null);
    }
  };

  return (
    <IonPage className="vision-page">
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>Catholic Tradition AI</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="vision-content">
        <div className="vision-shell">
          <section className="hero-card">
            <p className="eyebrow">2,000 years of wisdom, one conversation</p>
            <h1>Catholic Tradition AI</h1>
            <p className="hero-copy">
              Type or speak in one conversation view, receive a written answer, and optionally hear that answer spoken back in the same flow.
            </p>
            <div className="hero-actions" role="group" aria-label="Response modes">
              {chatModeOptions.map((option) => (
                <IonButton
                  key={option.mode}
                  size="default"
                  fill={mode === option.mode ? 'solid' : 'outline'}
                  onClick={() => setMode(option.mode)}
                >
                  {option.label}
                </IonButton>
              ))}
            </div>
            <div className="hero-chips" aria-label="Suggested domains">
              <IonChip>tradition.ai</IonChip>
              <IonChip>catholiclogic.ai</IonChip>
              <IonChip>YieldToThomas()</IonChip>
            </div>
          </section>

          <section className="chat-panel">
            <div className="chat-panel-header">
              <div>
                <p className="section-label">Live conversation</p>
                <h2>{selectedMode.label}</h2>
                <p className="chat-panel-copy">{selectedMode.starterGuidance}</p>
              </div>
              <div className="chat-panel-controls">
                <IonButton
                  fill={voiceRepliesEnabled ? 'solid' : 'outline'}
                  size="small"
                  onClick={() => setVoiceRepliesEnabled((currentValue) => !currentValue)}
                >
                  <IonIcon slot="start" icon={volumeHighOutline} />
                  {voiceRepliesEnabled ? 'Voice Replies On' : 'Voice Replies Off'}
                </IonButton>
                <IonButton fill="clear" size="small" onClick={resetConversation}>
                  New Thread
                </IonButton>
              </div>
            </div>

            <div className="prompt-strip" aria-label="Suggested prompts">
              {starterPrompts[mode].map((prompt) => (
                <IonButton key={prompt} fill="outline" size="small" onClick={() => setDraft(prompt)}>
                  {prompt}
                </IonButton>
              ))}
            </div>

            <div className="chat-thread" aria-live="polite">
              {messages.map((message) => (
                <article key={message.id} className={`chat-bubble chat-bubble-${message.role}`}>
                  <div className="chat-bubble-meta">
                    <span>{message.role === 'assistant' ? 'Catholic Tradition AI' : 'You'}</span>
                    {message.role === 'assistant' ? (
                      <IonButton
                        fill="clear"
                        size="small"
                        onClick={() => void playAudioForMessage(message)}
                        disabled={activeAudioMessageId === message.id}
                      >
                        <IonIcon slot="start" icon={volumeHighOutline} />
                        {activeAudioMessageId === message.id ? 'Speaking...' : 'Read Aloud'}
                      </IonButton>
                    ) : null}
                  </div>
                  <p>{message.content}</p>
                </article>
              ))}
            </div>

            <form className="chat-composer" onSubmit={handleSubmit}>
              <label className="chat-label" htmlFor="chat-input">Ask your question</label>
              <textarea
                id="chat-input"
                className="chat-input"
                rows={4}
                value={draft}
                placeholder={selectedMode.promptHint}
                onChange={(event) => setDraft(event.target.value)}
                disabled={isSubmitting}
              />

              <div className="chat-actions-row">
                <IonButton type="submit" disabled={isSubmitting || draft.trim().length === 0}>
                  <IonIcon slot="start" icon={sendOutline} />
                  {isSubmitting ? 'Sending...' : 'Send'}
                </IonButton>

                <IonButton
                  type="button"
                  fill="outline"
                  disabled={!listeningSupported}
                  onClick={toggleListening}
                >
                  <IonIcon slot="start" icon={micOutline} />
                  {listeningSupported ? (isListening ? 'Stop Listening' : 'Voice Input') : 'Voice Input Unavailable'}
                </IonButton>
              </div>

              {error ? <p className="chat-error">{error}</p> : null}
              <p className="chat-hint">
                {listeningSupported
                  ? 'Voice input uses your browser speech recognition when available. Typed and spoken questions stay in the same thread.'
                  : 'Voice input depends on browser speech recognition. Typing is available everywhere.'}
              </p>
            </form>
          </section>

          <section className="content-grid">
            <article className="info-panel">
              <p className="section-label">What this does</p>
              <h2>Three modes, one ongoing conversation.</h2>
              <ul>
                <li><strong>Ask a Father</strong> prioritizes patristic witness and early Christian tone.</li>
                <li><strong>Logical Proofs</strong> serves users who want arguments, distinctions, and academic structure.</li>
                <li><strong>Apologetic Answers</strong> explains Catholic teaching in a clear public-facing register.</li>
              </ul>
            </article>

            <article className="tagline-panel">
              <p className="section-label">Current session</p>
              <blockquote>{selectedMode.summary}</blockquote>
              <p>
                The conversation persists in your browser, so you can move between tabs without losing the thread.
              </p>
            </article>
          </section>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Tab1;
