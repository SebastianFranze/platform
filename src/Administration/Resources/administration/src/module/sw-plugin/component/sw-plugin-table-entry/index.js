import template from './sw-plugin-table-entry.html.twig';
import './sw-plugin-table-entry.scss';

const { Component } = Shopware;

Component.register('sw-plugin-table-entry', {
    template,

    props: {
        icon: {
            type: String,
            required: false
        },

        iconPath: {
            type: String,
            required: false
        },

        title: {
            type: String,
            required: true
        },

        subtitle: {
            type: String,
            required: true
        }
    }
});
