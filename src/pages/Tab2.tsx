import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import './Tab2.css';

const ottGrades = [
  {
    title: '1. De Fide',
    subtitle: 'Highest certainty',
    description: 'Truths immediately revealed by God and formally defined by the Church.',
    example: 'Examples: the Trinity, the Real Presence, the Immaculate Conception.',
    aiLogic: 'AI logic: state these as absolute and irreformable. Denial is heresy.'
  },
  {
    title: '2. De Fide Ecclesiastica',
    subtitle: 'Catholic truths',
    description: 'Truths not directly revealed, but taught infallibly because they are bound closely to Revelation.',
    example: 'Examples: the validity of a particular papal election, the canonization of a saint.',
    aiLogic: 'AI logic: treat these as effectively certain within Catholic teaching.'
  },
  {
    title: '3. Sententia Fidei Proxima',
    subtitle: 'Proximate to faith',
    description: 'Teachings widely held to be revealed, though not yet solemnly defined by the Church.',
    example: 'Example: that the Blessed Trinity is known only by Revelation and not by reason alone.',
    aiLogic: 'AI logic: describe these as nearly defined, but not formally closed.'
  },
  {
    title: '4. Sententia Certa',
    subtitle: 'Theologically certain',
    description: 'Conclusions that follow from revealed truth together with reason.',
    example: 'Example: the primary purpose of marriage is the procreation and education of children.',
    aiLogic: 'AI logic: present these as firm theological conclusions that should not be set aside lightly.'
  },
  {
    title: '5. Sententia Communis',
    subtitle: 'Common teaching',
    description: 'Doctrinal positions commonly held in the theological schools without formal definition.',
    example: 'Example: baseline school agreement on aspects of how grace works in the soul.',
    aiLogic: 'AI logic: use these as the normal consensus position unless the question turns on a school dispute.'
  },
  {
    title: '6. Sententia Probabilis',
    subtitle: 'Probable opinion',
    description: 'Well-supported opinions that remain open to legitimate debate.',
    example: 'Example: whether Judas received Holy Communion at the Last Supper.',
    aiLogic: 'AI logic: answer with nuance and make room for more than one defensible view.'
  }
];

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
              <p>Lets the user ask doctrinal questions, identify the theological note, and receive handbook-style answers from the approved dogmatic source set.</p>
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

          <section className="ott-reference-panel">
            <div className="ott-reference-header">
              <p className="section-label">Theological notes</p>
              <h3>How the handbook mode should speak about certainty</h3>
              <p>
                In Handbook of Dogmatic Sources, the AI should connect its answer to the proper theological note whenever that grade is clear enough to name responsibly.
              </p>
            </div>

            <div className="ott-grade-grid" aria-label="Theological notes reference">
              {ottGrades.map((grade) => (
                <article key={grade.title} className="ott-grade-card">
                  <p className="tree-kicker">{grade.subtitle}</p>
                  <h4>{grade.title}</h4>
                  <p>{grade.description}</p>
                  <p>{grade.example}</p>
                  <p className="ott-grade-logic">{grade.aiLogic}</p>
                </article>
              ))}
            </div>

            <div className="ott-table-wrap" aria-label="Theological notes comparison table">
              <table className="ott-table">
                <thead>
                  <tr>
                    <th>Grade</th>
                    <th>Certainty</th>
                    <th>Censure for denial</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>De Fide</td>
                    <td>Absolute / infallible</td>
                    <td>Heresy</td>
                  </tr>
                  <tr>
                    <td>Sententia Certa</td>
                    <td>High / logical certainty</td>
                    <td>Error in theology</td>
                  </tr>
                  <tr>
                    <td>Sententia Communis</td>
                    <td>High / consensus</td>
                    <td>Temerarious</td>
                  </tr>
                  <tr>
                    <td>Sententia Probabilis</td>
                    <td>Moderate / debatable</td>
                    <td>None</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Tab2;
