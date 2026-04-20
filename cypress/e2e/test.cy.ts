describe('Catholic Tradition AI UI', () => {
  it('opens the chat selector on the root route', () => {
    cy.visit('/')

    cy.contains('Choose a chat').scrollIntoView().should('be.visible')
    cy.contains('Logical Proofs').scrollIntoView().should('exist')
    cy.contains('Papal Documents').scrollIntoView().should('exist')
    cy.contains('Handbook of Dogmatic Sources').scrollIntoView().should('exist')
    cy.contains('Starter question:').should('not.exist')
  })

  it('opens Logical Proofs in a clean chat screen with an empty composer', () => {
    cy.visit('/')

    cy.contains('article', 'Logical Proofs').within(() => {
      cy.contains('Open Chat').scrollIntoView().click({ force: true })
    })

    cy.location('pathname').should('eq', '/tab1')
    cy.contains('Source-selected chat').scrollIntoView().should('be.visible')
    cy.contains('Logical Proofs').scrollIntoView().should('exist')
    cy.get('textarea#chat-input').should('have.value', '')
    cy.get('textarea#chat-input').should('have.attr', 'placeholder', 'Write your question here.')
    cy.contains('Suggested prompts').should('not.exist')
    cy.contains('Give me a Thomistic argument for the existence of God and explain each step.').should('not.exist')
  })

  it('opens the pre-Vatican II papal chat branch', () => {
    cy.visit('/')

    cy.contains('article', 'Papal Documents').within(() => {
      cy.contains('Pre-Vatican II').click()
    })

    cy.location('pathname').should('eq', '/tab1')
    cy.contains('Papal Documents: Pre-Vatican II').scrollIntoView().should('exist')
    cy.get('textarea#chat-input').should('have.value', '')
  })

  it('opens the handbook mode and shows its source guidance', () => {
    cy.visit('/')

    cy.contains('article', 'Handbook of Dogmatic Sources').within(() => {
      cy.contains('Open Chat').scrollIntoView().click({ force: true })
    })

    cy.location('pathname').should('eq', '/tab1')
    cy.contains('Handbook of Dogmatic Sources').scrollIntoView().should('exist')
    cy.contains('approved handbook source set').scrollIntoView().should('exist')
  })

  it('shows the Ott certainty reference in the Sources tab', () => {
    cy.visit('/tab2')

    cy.contains('How the handbook mode should speak about certainty').scrollIntoView().should('exist')
    cy.contains('1. De Fide').scrollIntoView().should('exist')
    cy.contains('6. Sententia Probabilis').scrollIntoView().should('exist')
    cy.contains('Absolute / infallible').scrollIntoView().should('exist')
  })

  it('keeps proofs answers Aquinas-first when both Aquinas and Suarez are returned', () => {
    cy.intercept('POST', '/api/retrieve', (request) => {
      expect(request.body.mode).to.eq('proofs')
      expect(request.body.query).to.eq('What is the argument from motion?')

      request.reply({
        statusCode: 200,
        body: {
          count: 2,
          results: [
            {
              id: 'aquinas-motion',
              citation: 'Thomas Aquinas, Summa Theologiae, Prima Pars, Question 2, Article 3',
              summary: 'Aquinas presents the argument from motion as the first way.',
              text: 'The first and more manifest way is the argument from motion.',
              score: 98
            },
            {
              id: 'suarez-causality',
              citation: 'Francisco Suarez, Disputationes Metaphysicae, disp. 12, sec. 1',
              summary: 'Suarez sharpens the metaphysical account of causality.',
              text: 'Suarez distinguishes the relevant kinds of causes.',
              score: 91
            }
          ]
        }
      })
    }).as('proofsRetrieve')

    cy.intercept('POST', '/api/chat', (request) => {
      expect(request.body.mode).to.eq('proofs')
      expect(request.body.messages.at(-1)?.content).to.eq('What is the argument from motion?')

      request.reply({
        statusCode: 200,
        body: {
          content: 'Aquinas argues from motion to a first unmoved mover. Suarez then refines how causal language should be understood within metaphysics.',
          mode: 'proofs',
          model: 'test-model',
          usage: null
        }
      })
    }).as('proofsChat')

    cy.visit('/tab1?mode=proofs')
    cy.get('textarea#chat-input').type('What is the argument from motion?')
    cy.get('form.chat-composer').submit()

    cy.wait('@proofsRetrieve')
    cy.wait('@proofsChat')

    cy.get('.retrieval-card').first().should('contain.text', 'Thomas Aquinas, Summa Theologiae, Prima Pars, Question 2, Article 3')
    cy.get('.retrieval-card').eq(1).should('contain.text', 'Francisco Suarez, Disputationes Metaphysicae, disp. 12, sec. 1')
    cy.get('.chat-bubble-assistant').last().invoke('text').then((text) => {
      expect(text.indexOf('Aquinas')).to.be.lessThan(text.indexOf('Suarez'))
    })
  })

  it('supports a Suarez-only fallback in proofs mode without exposing website provenance', () => {
    cy.intercept('POST', '/api/retrieve', {
      statusCode: 200,
      body: {
        count: 1,
        results: [
          {
            id: 'suarez-fallback',
            citation: 'Francisco Suarez, Disputationes Metaphysicae, disp. 13, sec. 9',
            summary: 'Suarez treats efficient causality directly in this section.',
            text: 'There are several kinds of causes, including efficient cause.',
            score: 93
          }
        ]
      }
    }).as('suarezRetrieve')

    cy.intercept('POST', '/api/chat', (request) => {
      expect(request.body.mode).to.eq('proofs')

      request.reply({
        statusCode: 200,
        body: {
          content: 'Suarez treats the question through efficient causality and related distinctions in Francisco Suarez, Disputationes Metaphysicae, disp. 13, sec. 9.',
          mode: 'proofs',
          model: 'test-model',
          usage: null
        }
      })
    }).as('suarezChat')

    cy.visit('/tab1?mode=proofs')
    cy.get('textarea#chat-input').type('How many kinds of causes are there?')
  cy.get('form.chat-composer').submit()

    cy.wait('@suarezRetrieve')
    cy.wait('@suarezChat')

    cy.get('.retrieval-card').should('have.length', 1)
    cy.get('.retrieval-card').first().should('contain.text', 'Francisco Suarez, Disputationes Metaphysicae, disp. 13, sec. 9')
    cy.get('.chat-bubble-assistant').last().should('contain.text', 'Francisco Suarez, Disputationes Metaphysicae, disp. 13, sec. 9')
    cy.get('.chat-panel').should('not.contain.text', 'sydneypenner.ca')
    cy.get('.chat-panel').should('not.contain.text', 'New Advent')
  })
})