import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import './Tab3.css';

const Tab3: React.FC = () => {
  return (
    <IonPage className="pathways-page">
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>Public Entry Points</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="pathways-content">
        <div className="pathways-shell">
          <section className="pathways-hero">
            <p className="section-label">Accessible entry points</p>
            <h1>The app should feel public-facing, clear, and persuasive before it feels scholastic.</h1>
            <p>
              The product works best when a visitor can choose a mode of explanation that matches their background, especially
              when they are curious, skeptical, or not Catholic at all.
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
              <h2>Apologetic Answers</h2>
              <p>Answer in a popular, intelligible mode that helps non-Catholics and first-time inquirers grasp the point without jargon.</p>
            </article>
          </section>

          <section className="flow-panel">
            <p className="section-label">Question flow</p>
            <ol>
              <li>The user chooses a human-readable entry point instead of navigating academic categories.</li>
              <li>The system retrieves across Scripture, Fathers, councils, and trusted teachers.</li>
              <li>The final synthesis stays publicly intelligible while still yielding to Thomistic coherence before the answer is returned.</li>
            </ol>
          </section>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Tab3;
