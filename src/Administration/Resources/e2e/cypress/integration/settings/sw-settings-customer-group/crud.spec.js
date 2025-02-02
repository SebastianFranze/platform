// / <reference types="Cypress" />

import SettingsPageObject from '../../../support/pages/module/sw-settings.page-object';
import SalesChannelPageObject from '../../../support/pages/module/sw-sales-channel.page-object';

describe('Customer group: Test crud operations', () => {
    beforeEach(() => {
        cy.setToInitialState().then(() => {
            cy.loginViaApi();
        }).then(() => {
            return cy.createDefaultFixture('customer-group');
        }).then(() => {
            cy.openInitialPage(`${Cypress.env('admin')}#/sw/settings/customer/group/index`);
        });
    });

    it('@package @settings: create and read customer group', () => {
        const page = new SettingsPageObject();
        const salesChannelPage = new SalesChannelPageObject();

        // Request we want to wait for later
        cy.server();
        cy.route({
            url: '/api/v1/customer-group',
            method: 'post'
        }).as('saveData');

        // Create customer-group
        cy.get('.sw-settings-customer-group-list').should('be.visible');
        cy.get('a[href="#/sw/settings/customer/group/create"]').click();

        cy.get('#sw-field--customerGroup-name').type('E2E Merchant');
        cy.get('input#sw-field--castedValue-1').click();

        cy.get(page.elements.customerGroupSaveAction).should('be.enabled');
        cy.get(page.elements.customerGroupSaveAction).click();

        // Verify and check usage of customer-group
        cy.wait('@saveData').then((xhr) => {
            expect(xhr).to.have.property('status', 204);
        });

        cy.get(page.elements.smartBarBack).click();
        cy.get(`${page.elements.dataGridRow}--1 .sw-data-grid__cell--name`).should('be.visible')
            .contains('E2E Merchant');

        // Check usage of customer group in customer
        cy.clickMainMenuItem({
            targetPath: '#/sw/customer/index',
            mainMenuId: 'sw-customer'
        });
        cy.get('.sw-customer-list__content').should('be.visible');
        cy.get('a[href="#/sw/customer/create"]').click();
        cy.get('select[name=sw-field--customer-groupId]').select('E2E Merchant');

        // Check usage of customer group in sales channel
        salesChannelPage.openSalesChannel('Headless');
        cy.get('.sw-sales-channel-detail__select-navigation-category-id').scrollIntoView();
        cy.get('.sw-sales-channel-detail__select-customer-group').typeSingleSelectAndCheck('E2E Merchant');
    });

    it('@package @settings: update and read customer group', () => {
        const page = new SettingsPageObject();

        // Request we want to wait for later
        cy.server();
        cy.route({
            url: '/api/v1/customer-group/*',
            method: 'patch'
        }).as('saveData');

        // Edit base data
        cy.get('.sw-settings-customer-group-list').should('be.visible');
        cy.clickContextMenuItem(
            '.sw-entity-listing__context-menu-edit-action',
            page.elements.contextMenuButton,
            `${page.elements.dataGridRow}--0`
        );

        cy.get('#sw-field--customerGroup-name').clear();
        cy.get('#sw-field--customerGroup-name').type('E2E Merchant');
        cy.get(page.elements.customerGroupSaveAction).should('be.enabled');
        cy.get(page.elements.customerGroupSaveAction).click();

        // Verify and check usage of customer-group
        cy.wait('@saveData').then((xhr) => {
            expect(xhr).to.have.property('status', 204);
        });

        cy.get(page.elements.smartBarBack).click();
        cy.get(`${page.elements.dataGridRow}--0 .sw-data-grid__cell--name`).should('be.visible')
            .contains('E2E Merchant');
    });

    it('@package @settings: delete customer group', () => {
        const page = new SettingsPageObject();

        // Request we want to wait for later
        cy.server();
        cy.route({
            url: '/api/v1/customer-group/*',
            method: 'delete'
        }).as('deleteData');

        // Delete customer group
        cy.get('.sw-settings-customer-group-list').should('be.visible');
        cy.clickContextMenuItem(
            `${page.elements.contextMenu}-item--danger`,
            page.elements.contextMenuButton,
            `${page.elements.dataGridRow}--0`
        );

        cy.get('.sw-modal__body')
            .contains('Are you sure you want to delete this item?');
        cy.get(`${page.elements.modal}__footer button${page.elements.primaryButton}`).click();
        cy.get(page.elements.modal).should('not.exist');

        // Verify deletion
        cy.wait('@deleteData').then((xhr) => {
            expect(xhr).to.have.property('status', 204);
        });
    });
});
