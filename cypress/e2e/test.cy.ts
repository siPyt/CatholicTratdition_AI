describe('Catholic Tradition AI UI', () => {
  it('opens the chat selector on the root route', () => {
    cy.visit('/')

    cy.contains('Choose a chat').scrollIntoView().should('be.visible')
    cy.contains('Logical Proofs').scrollIntoView().should('exist')
    cy.contains('Papal Documents').scrollIntoView().should('exist')
    cy.contains('Handbook of Dogmatic Sources').scrollIntoView().should('exist')
  })

  it('opens Logical Proofs in the chat screen with the starter prompt loaded', () => {
    cy.visit('/')

    cy.contains('article', 'Logical Proofs').within(() => {
      cy.contains('Open Chat').scrollIntoView().click({ force: true })
    })

    cy.location('pathname').should('eq', '/tab1')
    cy.contains('Source-selected chat').scrollIntoView().should('be.visible')
    cy.contains('Logical Proofs').scrollIntoView().should('exist')
    cy.get('textarea#chat-input').should('contain.value', 'Give me a Thomistic argument for the existence of God and explain each step.')
  })

  it('opens the pre-Vatican II papal chat branch', () => {
    cy.visit('/')

    cy.contains('article', 'Papal Documents').within(() => {
      cy.contains('Pre-Vatican II').click()
    })

    cy.location('pathname').should('eq', '/tab1')
    cy.contains('Papal Documents: Pre-Vatican II').scrollIntoView().should('exist')
    cy.get('textarea#chat-input').should('contain.value', 'What did pre-Vatican II popes teach about the kingship of Christ?')
  })

  it('opens the handbook mode and shows its source guidance', () => {
    cy.visit('/')

    cy.contains('article', 'Handbook of Dogmatic Sources').within(() => {
      cy.contains('Open Chat').scrollIntoView().click({ force: true })
    })

    cy.location('pathname').should('eq', '/tab1')
    cy.contains('Handbook of Dogmatic Sources').scrollIntoView().should('exist')
    cy.contains('avoids formal citations in the reply').scrollIntoView().should('exist')
  })

  it('shows the Ott certainty reference in the Sources tab', () => {
    cy.visit('/tab2')

    cy.contains('How the handbook mode should speak about certainty').scrollIntoView().should('exist')
    cy.contains('1. De Fide').scrollIntoView().should('exist')
    cy.contains('6. Sententia Probabilis').scrollIntoView().should('exist')
    cy.contains('Absolute / infallible').scrollIntoView().should('exist')
  })
})