import { IonButton, IonChip, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import './Tab1.css';

const Tab1: React.FC = () => {
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
              A broad public name is the right wrapper here because it tells ordinary people what they are entering:
              Catholic answers rooted in the deposit of faith, not disconnected opinion.
            </p>
            <div className="hero-actions">
              <IonButton size="default">Ask a Father</IonButton>
              <IonButton fill="outline" size="default">Logical Proofs</IonButton>
              <IonButton fill="clear" size="default">Explain Like I&apos;m 10</IonButton>
            </div>
            <div className="hero-chips" aria-label="Suggested domains">
              <IonChip>tradition.ai</IonChip>
              <IonChip>catholiclogic.ai</IonChip>
              <IonChip>YieldToThomas()</IonChip>
            </div>
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
