import { mapApiErrors } from 'src/app/service/map-errors.service';
import { mapState } from 'vuex';
import template from './sw-product-settings-form.html.twig';

const { Component } = Shopware;

Component.register('sw-product-settings-form', {
    template,

    computed: {
        ...mapState('swProductDetail', [
            'product',
            'parentProduct'
        ]),

        ...mapApiErrors('product', [
            'releaseDate',
            'stock',
            'minPurchase',
            'maxPurchase',
            'ean',
            'manufacturerNumber',
            'shippingFree',
            'markAsTopseller'
        ])
    }
});
