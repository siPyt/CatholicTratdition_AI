import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import './Tab3.css';

const Tab3: React.FC = () => {
  return (
    <IonPage className="pathways-page">
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>Common-Man Interface</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="pathways-content">
        <div className="pathways-shell">
          <section className="pathways-hero">
            <p className="section-label">Accessible entry points</p>
            <h1>The interface should lower the barrier without flattening the theology.</h1>
            <p>
              Your instinct here is sound. The product wins when a user can choose the mode of help they need before they know
              the technical names for the tradition behind it.
            </p>
          </section>

          <section className="pathway-grid">
            <article className="pathway-card">
              <h2>Ask a Father</h2>
              <p>Bias retrieval toward early Church voices when the user wants patristic witness and tone.</p>
            </article>

            <article className="pathway-card">
              <h2>Logical Proofs</h2>
              <p>Route the answer through Thomistic demonstration, objections, and replies when precision matters.</p>
            </article>

            <article className="pathway-card">
              <h2>Explain Like I&apos;m 10</h2>
              <p>Keep the doctrine intact while simplifying vocabulary, analogies, and pacing for first-time learners.</p>
            </article>
          </section>

          <section className="flow-panel">
            <p className="section-label">Question flow</p>
            <ol>
              <li>The user chooses a human-readable entry point instead of navigating academic categories.</li>
              <li>The system retrieves across Scripture, Fathers, councils, and trusted teachers.</li>
              <li>The final synthesis yields to Thomistic coherence before the answer is returned.</li>
            </ol>
          </section>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Tab3;
