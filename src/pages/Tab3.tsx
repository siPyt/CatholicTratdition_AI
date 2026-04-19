import { IonButton, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { chatModeOptions } from '../config/chatModes';
import './Tab3.css';

const Tab3: React.FC = () => {
  return (
    <IonPage className="pathways-page">
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>Launch</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="pathways-content">
        <div className="pathways-shell">
          <section className="pathways-hero">
            <p className="section-label">Start from here</p>
            <h1>Launch straight into the mode and question style that matches the user in front of you.</h1>
            <p>
              These cards are no longer just labels. Each one can send the user back into Chat with the right mode selected and
              a starter question loaded for immediate use.
            </p>
          </section>

          <section className="pathway-grid">
            {chatModeOptions.map((option) => (
              <article key={option.mode} className="pathway-card">
                <h2>{option.label}</h2>
                <p>{option.summary}</p>
                <p className="pathway-example">Starter question: {option.featuredPrompt}</p>
                <IonButton
                  routerLink={`/tab1?mode=${option.mode}&prompt=${encodeURIComponent(option.featuredPrompt)}`}
                  expand="block"
                >
                  Open In Chat
                </IonButton>
              </article>
            ))}
          </section>

          <section className="flow-panel">
            <p className="section-label">What happens next</p>
            <div className="launch-grid">
              <article>
                <h3>1. Choose the mode</h3>
                <p>Pick the tone and explanatory depth before the first message is even sent.</p>
              </article>
              <article>
                <h3>2. Land in chat</h3>
                <p>The app opens the main conversation screen with the right mode and a starter question ready to refine or send.</p>
              </article>
              <article>
                <h3>3. Continue the thread</h3>
                <p>The conversation persists locally, so the user can keep exploring without losing context between tabs.</p>
              </article>
            </div>
          </section>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Tab3;
