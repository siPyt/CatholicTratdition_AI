import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import './Tab2.css';

const Tab2: React.FC = () => {
  return (
    <IonPage className="authority-page">
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>Method</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="authority-content">
        <div className="authority-shell">
          <section className="authority-hero">
            <p className="section-label">How the app answers</p>
            <h1>This screen should explain the method, not just the brand story.</h1>
            <p>
              Catholic Tradition AI is built to give one public-facing experience with three distinct answer modes. The app can
              already return text answers, accept browser voice input when supported, and read replies aloud through ElevenLabs.
            </p>
          </section>

          <section className="authority-tree" aria-label="Hierarchy of authority">
            <article className="tree-node roots-node">
              <p className="tree-kicker">Source priority</p>
              <h2>Fathers and tradition</h2>
              <p>Patristic witness gives the app historical rootedness and keeps the Church&apos;s earliest mind close at hand.</p>
            </article>

            <article className="tree-node trunk-node">
              <p className="tree-kicker">Integrating logic</p>
              <h2>Thomistic synthesis</h2>
              <p>Aquinas remains the structural spine when the answer needs distinctions, demonstrations, objections, and replies.</p>
            </article>

            <article className="tree-node fruit-node">
              <p className="tree-kicker">Delivery layer</p>
              <h2>Public clarity</h2>
              <p>The final answer should remain intelligible for the actual user in front of the screen, not only for specialists.</p>
            </article>
          </section>

          <section className="operations-grid">
            <article className="protocol-block">
              <p className="section-label">Current capabilities</p>
              <h3>What the app already does</h3>
              <ul className="method-list">
                <li>Unified chat in a single screen.</li>
                <li>Mode-aware prompting for Fathers, proofs, and apologetics.</li>
                <li>Optional browser voice input where supported.</li>
                <li>Optional spoken playback for assistant replies.</li>
                <li>Conversation persistence in local browser storage.</li>
              </ul>
            </article>

            <article className="protocol-block">
              <p className="section-label">Answer commitments</p>
              <h3>What the model should keep doing</h3>
              <ul className="method-list">
                <li>Stay recognizably Catholic in doctrine and tone.</li>
                <li>Use the selected mode without collapsing every answer into the same voice.</li>
                <li>Cite works canonically rather than citing websites in user-facing answers.</li>
                <li>Keep the final response understandable for non-specialists when public explanation is needed.</li>
              </ul>
            </article>
          </section>

          <section className="protocol-panel">
            <p className="section-label">Developer shorthand</p>
            <div className="protocol-block">
              <h3>YieldToThomas()</h3>
              <p>
                As an internal design principle, this still works: let the app stay broad in presentation while the final
                theological synthesis yields to Thomistic coherence when tensions need resolution.
              </p>
            </div>
          </section>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Tab2;
