import { IonButton, IonChip, IonContent, IonHeader, IonIcon, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { copyOutline, micOutline, sendOutline, volumeHighOutline } from 'ionicons/icons';
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

interface RetrievalResult {
  id: string;
  citation: string;
  summary: string;
  text: string;
  score: number;
}

interface RetrievalResponse {
  results?: RetrievalResult[];
  count?: number;
  error?: string;
  details?: unknown;
}

interface TtsResponse {
  audioBase64?: string;
  contentType?: string;
  error?: string;
  details?: unknown;
}

type SpeechRecognitionConstructor = new () => SpeechRecognition;

const silentAudioDataUri = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//tQxAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAFAAAGbAAODg4ODhQUFBQUHBwcHBwiIiIiIigoKCgoLi4uLi40NDQ0NDs7Ozs7QUFBQUFHR0dHR05OTk5OVFRUVFRaWlpaWmBgYGBgZ2dnZ2dtbW1tbXNzc3NzeXl5eXmAgICAgIaGhoaGjIyMjIySkpKSkpmZmZmZn5+fn5+lpZWVlZWrq6urq7GxsbGxt7e3t7e9vb29vcPDw8PDycnJycnPz8/Pz9bW1tbW3Nzc3Nzi4uLi4ujq6urq7vLy8vL8/Pz8/P////////////8AAAAATGF2YzU4LjU0AAAAAAAAAAAAAAAAJAV8AAAAAAAABmw1JINLAAAAAAAAAAAAAAAAAAAA//tQxAADwAABpAAAACAAADSAAAAEtNKKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqr/+xDEAAPAAAGkAAAAIAAANIAAAAQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0ND';

const starterAssistantMessage: StoredChatMessage = {
  id: 'assistant-intro',
  role: 'assistant',
  content: 'Pick a source set, ask a question, and continue the thread here.'
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
  ],
  dogmaticSources: [
    'What is the theological note on grace?',
    'How is justification presented in handbook form?',
    'What is the theological note on original sin and baptism?'
  ],
  papalPreVaticanII: [
    'What did pre-Vatican II popes teach about the kingship of Christ?',
    'How did Leo XIII and Pius XII speak about grace and society?',
    'What did pre-Vatican II popes teach about Church authority?'
  ],
  papalAll: [
    'How have papal documents explained grace across the centuries?',
    'How have popes taught on faith and reason?',
    'What themes stay consistent across papal teaching on the Church?'
  ]
};

function sanitizeMode(mode: string | null): ChatMode | null {
  if (mode === 'fathers' || mode === 'proofs' || mode === 'apologetics' || mode === 'dogmaticSources' || mode === 'papalPreVaticanII' || mode === 'papalAll') {
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
  const [retrievalResults, setRetrievalResults] = useState<RetrievalResult[]>([]);
  const [retrievalQuery, setRetrievalQuery] = useState('');
  const [isRetrieving, setIsRetrieving] = useState(false);
  const [voiceRepliesEnabled, setVoiceRepliesEnabled] = useState(storedSession?.voiceRepliesEnabled ?? true);
  const [listeningSupported, setListeningSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeAudioMessageId, setActiveAudioMessageId] = useState<string | null>(null);
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioRequestIdRef = useRef(0);
  const copyFeedbackTimeoutRef = useRef<number | null>(null);
  const audioUnlockedRef = useRef(false);

  const clearConversationState = (nextDraft = '') => {
    setMessages([starterAssistantMessage]);
    setDraft(nextDraft);
    setError('');
    setRetrievalQuery('');
    setRetrievalResults([]);
    stopAudioPlayback();
  };

  const switchMode = (nextMode: ChatMode, nextDraft = '') => {
    setMode(nextMode);
    clearConversationState(nextDraft);
  };

  const stopAudioPlayback = () => {
    audioRequestIdRef.current += 1;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    setActiveAudioMessageId(null);
  };

  const unlockAudioPlayback = async () => {
    if (audioUnlockedRef.current || typeof Audio === 'undefined') {
      return;
    }

    try {
      const probeAudio = new Audio(silentAudioDataUri);
      probeAudio.muted = true;
      probeAudio.setAttribute('playsinline', 'true');
      await probeAudio.play();
      probeAudio.pause();
      probeAudio.currentTime = 0;
      audioUnlockedRef.current = true;
    } catch {
      audioUnlockedRef.current = false;
    }
  };

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
      stopAudioPlayback();
      if (copyFeedbackTimeoutRef.current) {
        window.clearTimeout(copyFeedbackTimeoutRef.current);
      }
    };
  }, []);

  const showCopyFeedback = (itemId: string) => {
    setCopiedItemId(itemId);

    if (copyFeedbackTimeoutRef.current) {
      window.clearTimeout(copyFeedbackTimeoutRef.current);
    }

    copyFeedbackTimeoutRef.current = window.setTimeout(() => {
      setCopiedItemId((currentValue) => (currentValue === itemId ? null : currentValue));
      copyFeedbackTimeoutRef.current = null;
    }, 1800);
  };

  const fallbackCopyText = (text: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', 'true');
    textArea.style.position = 'absolute';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  };

  const copyText = async (text: string, itemId: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        fallbackCopyText(text);
      }

      setError('');
      showCopyFeedback(itemId);
    } catch {
      setError('Copy failed. Select the text manually and copy it from the browser.');
    }
  };

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
      switchMode(requestedMode, requestedPrompt ?? '');
    } else if (requestedPrompt) {
      setDraft(requestedPrompt);
    }

    history.replace('/tab1');
  }, [history, location.search]);

  const selectedMode = getChatModeOption(mode);
  const usesLocalCorpus = mode === 'fathers' || mode === 'proofs' || mode === 'apologetics';

  const loadRetrievalPreview = async (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setRetrievalQuery('');
      setRetrievalResults([]);
      return [] as RetrievalResult[];
    }

    setIsRetrieving(true);

    try {
      const response = await fetch('/api/retrieve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: trimmedQuery,
          mode,
          limit: 3
        })
      });

      const payload = await parseApiResponse<RetrievalResponse>(response);
      if (!response.ok) {
        throw new Error(formatApiError(payload, 'Source retrieval is unavailable right now.'));
      }

      const results = Array.isArray(payload.results) ? payload.results : [];
      setRetrievalQuery(trimmedQuery);
      setRetrievalResults(results);
      return results;
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Source retrieval failed.';
      setError(message);
      setRetrievalQuery(trimmedQuery);
      setRetrievalResults([]);
      return [] as RetrievalResult[];
    } finally {
      setIsRetrieving(false);
    }
  };

  const sendPrompt = async (prompt: string) => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || isSubmitting) {
      return;
    }

    stopAudioPlayback();

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
      if (usesLocalCorpus) {
        await loadRetrievalPreview(trimmedPrompt);
      } else {
        setRetrievalQuery('');
        setRetrievalResults([]);
      }

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
    await unlockAudioPlayback();
    await sendPrompt(draft);
  };

  const playAudioForMessage = async (message: StoredChatMessage) => {
    if (message.role !== 'assistant') {
      return;
    }

    await unlockAudioPlayback();

    if (activeAudioMessageId === message.id && audioRef.current) {
      stopAudioPlayback();
      return;
    }

    stopAudioPlayback();
    setError('');
    const playbackRequestId = audioRequestIdRef.current;

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

      if (playbackRequestId !== audioRequestIdRef.current) {
        return;
      }

      const contentType = payload.contentType || 'audio/mpeg';
      const audio = new Audio(`data:${contentType};base64,${payload.audioBase64}`);
      audio.volume = 1;
      audio.setAttribute('playsinline', 'true');
      audioRef.current = audio;
      setActiveAudioMessageId(message.id);

      const clearPlaybackState = () => {
        if (audioRef.current === audio) {
          audioRef.current = null;
        }
        setActiveAudioMessageId((currentId) => (currentId === message.id ? null : currentId));
      };

      audio.onended = clearPlaybackState;
      audio.onpause = clearPlaybackState;
      audio.onerror = clearPlaybackState;
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
    clearConversationState();
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
            <p className="eyebrow">Source-selected chat</p>
            <h1>{selectedMode.label}</h1>
            <p className="hero-copy">{selectedMode.summary}</p>
            <div className="hero-actions" role="group" aria-label="Response modes">
              {chatModeOptions.map((option) => (
                <IonButton
                  key={option.mode}
                  size="default"
                  fill={mode === option.mode ? 'solid' : 'outline'}
                  onClick={() => switchMode(option.mode)}
                >
                  {option.label}
                </IonButton>
              ))}
            </div>
          </section>

          <section className="chat-panel">
            <div className="chat-panel-header">
              <div>
                <p className="section-label">Chat</p>
                <h2>Ask and continue</h2>
                <p className="chat-panel-copy">{selectedMode.starterGuidance}</p>
              </div>
              <div className="chat-panel-controls">
                <IonButton
                  fill={voiceRepliesEnabled ? 'solid' : 'outline'}
                  className="voice-toggle-button"
                  onClick={() => {
                    if (!voiceRepliesEnabled) {
                      void unlockAudioPlayback();
                    }
                    setVoiceRepliesEnabled((currentValue) => !currentValue);
                  }}
                >
                  <IonIcon slot="start" icon={volumeHighOutline} />
                  {voiceRepliesEnabled ? 'Speak Replies: On' : 'Speak Replies: Off'}
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

            {usesLocalCorpus ? <section className="retrieval-panel" aria-live="polite">
              <div className="retrieval-panel-header">
                <div>
                  <p className="section-label">Sources</p>
                  <h3>Preview the indexed passages</h3>
                </div>
                <IonButton
                  fill="outline"
                  size="small"
                  disabled={!usesLocalCorpus || draft.trim().length === 0 || isRetrieving || isSubmitting}
                  onClick={() => void loadRetrievalPreview(draft)}
                >
                  {isRetrieving ? 'Loading Sources...' : 'Preview Sources'}
                </IonButton>
              </div>

              {retrievalQuery ? (
                <p className="retrieval-panel-copy">
                  Query preview: <strong>{retrievalQuery}</strong>
                </p>
              ) : !usesLocalCorpus ? (
                <p className="retrieval-panel-copy">
                  This mode is constrained to its handbook source set only. Source preview is off until a local approved corpus is added.
                </p>
              ) : (
                <p className="retrieval-panel-copy">
                  Preview the canonical sources before you send, or send normally and the same retrieval pass will ground the answer.
                </p>
              )}

              {retrievalResults.length > 0 ? (
                <div className="retrieval-grid">
                  {retrievalResults.map((result) => (
                    <article key={result.id} className="retrieval-card">
                      <div className="retrieval-card-meta">
                        <span>{result.citation}</span>
                        <div className="retrieval-card-actions">
                          <IonChip>Score {result.score}</IonChip>
                          <IonButton
                            fill="clear"
                            size="small"
                            onClick={() => void copyText(`${result.citation}\n\n${result.summary}\n\n${result.text}`, `retrieval-${result.id}`)}
                          >
                            <IonIcon slot="start" icon={copyOutline} />
                            {copiedItemId === `retrieval-${result.id}` ? 'Copied' : 'Copy'}
                          </IonButton>
                        </div>
                      </div>
                      <p className="retrieval-summary">{result.summary}</p>
                      <p className="retrieval-text">{result.text}</p>
                    </article>
                  ))}
                </div>
              ) : retrievalQuery && !isRetrieving ? (
                <p className="retrieval-empty">No indexed passages matched this exact prompt yet.</p>
              ) : null}
            </section> : null}

            <div className="chat-thread" aria-live="polite">
              {messages.map((message) => (
                <article key={message.id} className={`chat-bubble chat-bubble-${message.role}`}>
                  <div className="chat-bubble-meta">
                    <span>{message.role === 'assistant' ? 'Catholic Tradition AI' : 'You'}</span>
                    <div className="chat-bubble-actions">
                      <IonButton
                        className="copy-text-button"
                        fill="clear"
                        onClick={() => void copyText(message.content, message.id)}
                      >
                        <IonIcon slot="start" icon={copyOutline} />
                        {copiedItemId === message.id ? 'Copied' : 'Copy'}
                      </IonButton>
                      {message.role === 'assistant' ? (
                        <IonButton
                          className="speak-aloud-button"
                          fill="clear"
                          onClick={() => void playAudioForMessage(message)}
                        >
                          <IonIcon slot="start" icon={volumeHighOutline} />
                          {activeAudioMessageId === message.id ? 'Stop Audio' : 'Speak Aloud'}
                        </IonButton>
                      ) : null}
                    </div>
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
                  disabled={!activeAudioMessageId}
                  onClick={stopAudioPlayback}
                >
                  <IonIcon slot="start" icon={volumeHighOutline} />
                  Stop Audio
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

                <IonButton
                  type="button"
                  fill="clear"
                  disabled={!usesLocalCorpus || draft.trim().length === 0 || isRetrieving || isSubmitting}
                  onClick={() => void loadRetrievalPreview(draft)}
                >
                  Preview Sources
                </IonButton>
              </div>

              {error ? <p className="chat-error">{error}</p> : null}
              <p className="chat-hint">
                {listeningSupported
                  ? 'Voice input stays in the same thread as typed questions.'
                  : 'Typing is always available.'}
              </p>
            </form>
          </section>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Tab1;
