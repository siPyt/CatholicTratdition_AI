import { IonButton, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import './Tab3.css';

const Tab3: React.FC = () => {
  return (
    <IonPage className="pathways-page">
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>Chats</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="pathways-content">
        <div className="pathways-shell">
          <section className="pathways-hero">
            <p className="section-label">Choose a chat</p>
            <h1 className="brand-masthead">
              Catholic Tradition <span className="brand-masthead-ai">AI</span>
            </h1>
            <p className="hero-instruction">Open the source set you want, then ask the question in chat.</p>
            <p>Each card opens the same clean chat window with a different authority profile behind it.</p>
          </section>

          <section className="pathway-grid">
            <article className="pathway-card">
              <h2>Logical Proofs</h2>
              <p>Open a scholastic chat centered on argument, distinctions, and indexed source support.</p>
              <p className="pathway-example">Starter question: Give me a Thomistic argument for the existence of God and explain each step.</p>
              <IonButton routerLink={`/tab1?mode=proofs&prompt=${encodeURIComponent('Give me a Thomistic argument for the existence of God and explain each step.')}`} expand="block">
                Open Chat
              </IonButton>
            </article>

            <article className="pathway-card">
              <h2>Ask a Father</h2>
              <p>Open a patristic chat focused on the voice and witness of the early Church.</p>
              <p className="pathway-example">Starter question: How did the early Church Fathers speak about the Eucharist as the real presence of Christ?</p>
              <IonButton routerLink={`/tab1?mode=fathers&prompt=${encodeURIComponent('How did the early Church Fathers speak about the Eucharist as the real presence of Christ?')}`} expand="block">
                Open Chat
              </IonButton>
            </article>

            <article className="pathway-card">
              <h2>Apologetic Answers</h2>
              <p>Open a public-facing Catholic chat for clear explanations without heavy jargon.</p>
              <p className="pathway-example">Starter question: How would you explain Marian devotion to a Protestant friend without using insider jargon?</p>
              <IonButton routerLink={`/tab1?mode=apologetics&prompt=${encodeURIComponent('How would you explain Marian devotion to a Protestant friend without using insider jargon?')}`} expand="block">
                Open Chat
              </IonButton>
            </article>

            <article className="pathway-card">
              <h2>Papal Documents</h2>
              <p>Choose whether the chat should stay with pre-Vatican II popes or span the full papal archive.</p>
              <div className="pathway-actions">
                <IonButton routerLink={`/tab1?mode=papalPreVaticanII&prompt=${encodeURIComponent('What did pre-Vatican II popes teach about the kingship of Christ?')}`} expand="block">
                  Pre-Vatican II
                </IonButton>
                <IonButton routerLink={`/tab1?mode=papalAll&prompt=${encodeURIComponent('How have papal documents explained grace across the centuries?')}`} expand="block" fill="outline">
                  All Popes
                </IonButton>
              </div>
            </article>

            <article className="pathway-card">
              <h2>Handbook of Dogmatic Sources</h2>
              <p>Ask doctrinal questions, identify the theological note, and receive concise handbook answers from the approved dogmatic source set.</p>
              <p className="pathway-example">Starter question: What is the theological note on sanctifying grace, actual grace, and justification?</p>
              <IonButton routerLink={`/tab1?mode=dogmaticSources&prompt=${encodeURIComponent('What is the theological note on sanctifying grace, actual grace, and justification?')}`} expand="block">
                Open Chat
              </IonButton>
            </article>
          </section>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Tab3;
