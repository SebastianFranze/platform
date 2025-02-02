// / <reference types="Cypress" />

import ManufacturerPageObject from '../../../support/pages/module/sw-manufacturer.page-object';

describe('Manufacturer: Test crud operations', () => {
    beforeEach(() => {
        cy.setToInitialState()
            .then(() => {
                cy.loginViaApi();
            })
            .then(() => {
                return cy.createDefaultFixture('product-manufacturer');
            })
            .then(() => {
                cy.openInitialPage(`${Cypress.env('admin')}#/sw/manufacturer/index`);
            });
    });

    it('@catalogue: create and read manufacturer', () => {
        const page = new ManufacturerPageObject();

        // Request we want to wait for later
        cy.server();
        cy.route({
            url: '/api/v1/product-manufacturer',
            method: 'post'
        }).as('saveData');

        cy.get(`${page.elements.smartBarHeader} > h2`).contains('Manufacturer');
        cy.get(page.elements.primaryButton).contains('Add manufacturer').click();
        cy.url().should('contain', '#/sw/manufacturer/create');

        cy.get('input[name=name]').clear().type('MAN-U-FACTURE');
        cy.get('input[name=link]').clear().type('https://google.com/doodles');
        cy.get(page.elements.manufacturerSave).click();

        // Verify updated manufacturer
        cy.wait('@saveData').then((xhr) => {
            expect(xhr).to.have.property('status', 204);
        });
        cy.get(page.elements.smartBarBack).click();
    });


    it('@catalogue: edit and read manufacturer', () => {
        const page = new ManufacturerPageObject();

        // Request we want to wait for later
        cy.server();
        cy.route({
            url: '/api/v1/product-manufacturer/**',
            method: 'patch'
        }).as('saveData');

        // Edit base data
        cy.get(`${page.elements.dataGridRow}--0 a`).click();
        cy.get('input[name=name]').clear().type('What does it means?(TM)');
        cy.get('input[name=link]').clear().type('https://google.com/doodles');
        cy.get(page.elements.manufacturerSave).click();

        // Verify updated manufacturer
        cy.wait('@saveData').then((xhr) => {
            expect(xhr).to.have.property('status', 204);
        });
            cy.get(page.elements.successIcon).should('be.visible');
    });

    it('@catalogue: delete manufacturer', () => {
        const page = new ManufacturerPageObject();

        // Request we want to wait for later
        cy.server();
        cy.route({
            url: '/api/v1/product-manufacturer/**',
            method: 'delete'
        }).as('saveData');

        // Delete manufacturer
        cy.clickContextMenuItem(
            '.sw-context-menu-item--danger',
            page.elements.contextMenuButton,
            `${page.elements.dataGridRow}--0`
        );
        cy.get(`${page.elements.modal} ${page.elements.modal}__body p`).contains(
            'Are you sure you want to delete this item?'
        );
        cy.get(`${page.elements.modal}__footer ${page.elements.primaryButton}`).click();
        cy.get(page.elements.modal).should('not.exist');

        // Verify updated manufacturer
        cy.wait('@saveData').then((xhr) => {
            expect(xhr).to.have.property('status', 204);
        });
        cy.get(page.elements.smartBarAmount).contains('1');
    });
});
