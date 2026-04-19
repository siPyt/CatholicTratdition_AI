import { IonButton, IonChip, IonContent, IonHeader, IonIcon, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { micOutline, sendOutline, volumeHighOutline } from 'ionicons/icons';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { ChatMode } from '../config/openAiPrompt';
import './Tab1.css';

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
}

interface ChatResponse {
  content?: string;
  error?: string;
}

interface TtsResponse {
  audioBase64?: string;
  contentType?: string;
  error?: string;
}

type SpeechRecognitionConstructor = new () => SpeechRecognition;

const modeOptions: Array<{ mode: ChatMode; label: string; promptHint: string }> = [
  {
    mode: 'fathers',
    label: 'Ask a Father',
    promptHint: 'What did the early Fathers say about the Eucharist?'
  },
  {
    mode: 'proofs',
    label: 'Logical Proofs',
    promptHint: 'Give me a Thomistic argument for God as first cause.'
  },
  {
    mode: 'apologetics',
    label: 'Apologetic Answers',
    promptHint: 'How would you explain Marian devotion to a Protestant friend?'
  }
];

const starterMessages: Record<ChatMode, string> = {
  fathers: 'Use the Fathers when helpful and explain their witness in a way a modern reader can follow.',
  proofs: 'Use a more academic register and show the logic clearly.',
  apologetics: 'Explain the answer clearly for someone outside the Catholic tradition.'
};

const Tab1: React.FC = () => {
  const [mode, setMode] = useState<ChatMode>('apologetics');
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'assistant-intro',
      role: 'assistant',
      content: 'Choose a mode, ask your question by typing or voice, and I will answer in text. If voice replies are enabled, I can also read the answer aloud.'
    }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [voiceRepliesEnabled, setVoiceRepliesEnabled] = useState(true);
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

  const selectedMode = modeOptions.find((option) => option.mode === mode) ?? modeOptions[2];

  const sendPrompt = async (prompt: string) => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || isSubmitting) {
      return;
    }

    const nextUserMessage: ChatMessage = {
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

      const payload = (await response.json()) as ChatResponse;
      if (!response.ok || !payload.content) {
        throw new Error(payload.error || 'The assistant could not answer that question.');
      }

      const assistantMessage: ChatMessage = {
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

  const playAudioForMessage = async (message: ChatMessage) => {
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

      const payload = (await response.json()) as TtsResponse;
      if (!response.ok || !payload.audioBase64) {
        throw new Error(payload.error || 'Voice playback is unavailable right now.');
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
              {modeOptions.map((option) => (
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
                <p className="chat-panel-copy">{starterMessages[mode]}</p>
              </div>
              <IonButton
                fill={voiceRepliesEnabled ? 'solid' : 'outline'}
                size="small"
                onClick={() => setVoiceRepliesEnabled((currentValue) => !currentValue)}
              >
                <IonIcon slot="start" icon={volumeHighOutline} />
                {voiceRepliesEnabled ? 'Voice Replies On' : 'Voice Replies Off'}
              </IonButton>
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
              <p className="section-label">Why the wrapper works</p>
              <h2>Broad enough for search, precise enough for trust.</h2>
              <ul>
                <li><strong>Catholic</strong> makes the promise legible to people searching for answers and teaching.</li>
                <li><strong>Tradition</strong> signals continuity with the Church rather than a personality-driven feed.</li>
                <li><strong>AI</strong> clarifies that this is an interactive guide, not a static archive.</li>
              </ul>
            </article>

            <article className="tagline-panel">
              <p className="section-label">Positioning options</p>
              <blockquote>
                Catholic Tradition AI: 2,000 Years of Wisdom, One Conversation.
              </blockquote>
              <blockquote>
                Catholic Tradition AI: From the Church Fathers to the Angelic Doctor.
              </blockquote>
              <p>
                The first is the stronger front-door line because it is broader, clearer, and more welcoming to non-specialists.
              </p>
            </article>
          </section>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Tab1;
