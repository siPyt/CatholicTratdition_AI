import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import './Tab2.css';

const Tab2: React.FC = () => {
  return (
    <IonPage className="authority-page">
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>Authority Flow</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="authority-content">
        <div className="authority-shell">
          <section className="authority-hero">
            <p className="section-label">Internal logic</p>
            <h1>The public wrapper can stay broad while the reasoning layer stays Thomistic.</h1>
            <p>
              That is the core strategic advantage in your concept. The user sees a welcoming doorway into Catholic tradition;
              the model still resolves ambiguity by yielding to a stable hierarchy of authority.
            </p>
          </section>

          <section className="authority-tree" aria-label="Hierarchy of authority">
            <article className="tree-node roots-node">
              <p className="tree-kicker">The Roots</p>
              <h2>Patristics</h2>
              <p>Augustine, Ignatius, Chrysostom, and the early witnesses form the inherited soil of the project.</p>
            </article>

            <article className="tree-node trunk-node">
              <p className="tree-kicker">The Trunk</p>
              <h2>Thomas Aquinas</h2>
              <p>The Summa becomes the integrating logic: distinctions, objections, replies, and a disciplined final synthesis.</p>
            </article>

            <article className="tree-node fruit-node">
              <p className="tree-kicker">The Fruit</p>
              <h2>The User</h2>
              <p>People receive practical answers for modern questions without needing graduate training in theology first.</p>
            </article>
          </section>

          <section className="protocol-panel">
            <p className="section-label">Protocol language</p>
            <div className="protocol-block">
              <h3>YieldToThomas()</h3>
              <p>
                Use this as an actual internal naming convention for the last theological consistency pass. It is memorable,
                legible to developers, and explains the project&apos;s doctrinal spine without changing the public brand.
              </p>
            </div>
          </section>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Tab2;
