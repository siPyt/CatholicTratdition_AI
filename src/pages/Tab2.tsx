import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import './Tab2.css';

const Tab2: React.FC = () => {
  return (
    <IonPage className="authority-page">
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>Sources</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="authority-content">
        <div className="authority-shell">
          <section className="authority-hero">
            <p className="section-label">Source guide</p>
            <h1>Pick the source set that matches the question.</h1>
            <p>Each chat keeps a different authority profile so the user can choose the right lane before asking.</p>
          </section>

          <section className="authority-tree" aria-label="Source guide cards">
            <article className="tree-node roots-node">
              <p className="tree-kicker">Source set</p>
              <h2>Logical Proofs</h2>
              <p>Uses the indexed scholastic and apologetic corpus already loaded in the app.</p>
            </article>

            <article className="tree-node trunk-node">
	            <p className="tree-kicker">Source set</p>
	            <h2>Papal Documents</h2>
	            <p>Uses papal teaching as the target source family, with separate chats for Pre-Vatican II and All Popes.</p>
            </article>

            <article className="tree-node fruit-node">
	            <p className="tree-kicker">Source set</p>
	            <h2>Handbook of Dogmatic Sources</h2>
	            <p>Constrains the answer to Ott and Denzinger without showing formal citations in the reply.</p>
            </article>
          </section>

          <section className="operations-grid">
            <article className="protocol-block">
	            <p className="section-label">Chat behavior</p>
	            <h3>Clean chat screens</h3>
              <ul className="method-list">
	                <li>Each selector opens the main chat screen directly.</li>
	                <li>The thread stays in one place like a standard chat app.</li>
	                <li>Voice input and spoken playback stay available in chat.</li>
	                <li>The thread persists while moving between tabs.</li>
              </ul>
            </article>

            <article className="protocol-block">
	            <p className="section-label">Current limits</p>
	            <h3>How source control works</h3>
              <ul className="method-list">
	                <li>Logical Proofs and the existing indexed chats can preview local source passages.</li>
	                <li>Papal Documents and Handbook of Dogmatic Sources are prompt-constrained today, not locally indexed.</li>
	                <li>Papal answers are aimed at Vatican English papal documents.</li>
	                <li>Handbook mode suppresses citations because it is not text-verified.</li>
              </ul>
            </article>
          </section>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Tab2;
