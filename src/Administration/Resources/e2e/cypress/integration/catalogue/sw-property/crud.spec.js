// / <reference types="Cypress" />

import PropertyPageObject from '../../../support/pages/module/sw-property.page-object';

describe('Property: Test crud operations', () => {
    beforeEach(() => {
        cy.setToInitialState()
            .then(() => {
                cy.loginViaApi();
            })
            .then(() => {
                return cy.createPropertyFixture({
                    options: [{ name: 'Red' }, { name: 'Yellow' }, { name: 'Green' }]
                });
            })
            .then(() => {
                cy.openInitialPage(`${Cypress.env('admin')}#/sw/property/index`);
            });
    });

    it('@package @catalogue: create and read property', () => {
        const page = new PropertyPageObject();

        // Request we want to wait for later
        cy.server();
        cy.route({
            url: '/api/v1/property-group?_response=true',
            method: 'post'
        }).as('saveData');

        // Add property group
        cy.get('a[href="#/sw/property/create"]').click();

        cy.get('input[name=sw-field--group-name]').type('1 Coleur');
        cy.get(page.elements.propertySaveAction).click();

        // Verify property in listing
        cy.wait('@saveData').then((xhr) => {
            expect(xhr).to.have.property('status', 200);
        });
        cy.get(page.elements.smartBarBack).click();
        cy.get('.sw-data-grid__cell--0 .sw-data-grid__cell-content').click();
        cy.get(`${page.elements.dataGridRow}--0 a`).contains('1 Coleur');
    });

    it('@package @catalogue: update and read property', () => {
        const page = new PropertyPageObject();

        // Request we want to wait for later
        cy.server();
        cy.route({
            url: '/api/v1/property-group/**',
            method: 'patch'
        }).as('saveData');

        // Add option to property group
        cy.clickContextMenuItem(
            '.sw-property-list__edit-action',
            page.elements.contextMenuButton,
            `${page.elements.dataGridRow}--0`
        );
        cy.get(page.elements.cardTitle).contains('Basic information');

        cy.get('.sw-property-option-list').scrollIntoView();
        cy.get('.sw-property-option-list__add-button').click();
        cy.get('input[name=sw-field--currentOption-name]').type('Bleu');
        cy.get('input[name=sw-field--currentOption-position]').type('1');
        cy.get(`${page.elements.modal} .sw-colorpicker .sw-colorpicker__previewWrapper`).click();
        cy.get(`${page.elements.modal} .sw-colorpicker .sw-colorpicker__input`).clear();
        cy.get(`${page.elements.modal} .sw-colorpicker .sw-colorpicker__input`).type('#189eff');
        cy.get(`${page.elements.modal} .sw-colorpicker .sw-colorpicker__input`).type('{enter}');
        cy.get(`.sw-modal__footer ${page.elements.primaryButton}`).click();
        cy.get(page.elements.modal).should('not.exist');
        cy.get(page.elements.propertySaveAction).click();

        // Verify new options in listing
        cy.wait('@saveData').then((xhr) => {
            expect(xhr).to.have.property('status', 200);
        });
        cy.get(page.elements.smartBarBack).click();
        cy.get(`${page.elements.dataGridRow}--0`).contains('Bleu');
    });

    it('@package @catalogue: delete property', () => {
        const page = new PropertyPageObject();

        // Request we want to wait for later
        cy.server();
        cy.route({
            url: '/api/v1/property-group/**',
            method: 'delete'
        }).as('deleteData');

        // Delete option in property
        cy.clickContextMenuItem(
            '.sw-property-list__edit-action',
            page.elements.contextMenuButton,
            `${page.elements.dataGridRow}--0`
        );
        cy.get(page.elements.loader).should('not.exist');

        cy.get('.sw-property-option-list').scrollIntoView();
        cy.clickContextMenuItem(
            `${page.elements.contextMenu}-item--danger`,
            page.elements.contextMenuButton,
            `${page.elements.gridRow}--0`
        );

        cy.get(`${page.elements.gridRow}--0.is--deleted`).should('be.visible');
        cy.get(page.elements.propertySaveAction).click();
        cy.get(page.elements.successIcon).should('be.visible');
        cy.get(`${page.elements.gridRow}--2`).should('not.exist');

        // Delete property in listing
        cy.get(page.elements.smartBarBack).click();
        cy.get(`${page.elements.dataGridRow}--0 a`).contains('Color');
        cy.clickContextMenuItem(
            `${page.elements.contextMenu}-item--danger`,
            page.elements.contextMenuButton,
            `${page.elements.dataGridRow}--0`
        );
        cy.get(`${page.elements.modal} .sw-property-list__confirm-delete-text`)
            .contains('Are you sure you really want to delete the property "Color"?');

        cy.get(`${page.elements.modal}__footer button${page.elements.primaryButton}`).click();


        // Verify new options in listing
        cy.wait('@deleteData').then((xhr) => {
            expect(xhr).to.have.property('status', 204);
        });
        cy.get(page.elements.modal).should('not.exist');
        cy.get(page.elements.emptyState).should('be.visible');
    });
});
