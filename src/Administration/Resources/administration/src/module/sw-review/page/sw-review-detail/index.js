import template from './sw-review-detail.html.twig';
import './sw-review-detail.scss';

const { Component, Mixin } = Shopware;
const { Criteria } = Shopware.Data;
const { warn } = Shopware.Utils.debug;

Component.register('sw-review-detail', {
    template,

    inject: ['repositoryFactory', 'context'],

    mixins: [
        Mixin.getByName('placeholder'),
        Mixin.getByName('notification')
    ],

    data() {
        return {
            isLoading: null,
            reviewId: null,
            review: {},
            product: null
        };
    },

    created() {
        this.createdComponent();
    },

    watch: {
        '$route.params.id'() {
            this.createdComponent();
        }
    },

    computed: {
        repository() {
            return this.repositoryFactory.create('product_review');
        },
        productRepository() {
            return this.repositoryFactory.create('product');
        }
    },

    methods: {
        createdComponent() {
            if (this.$route.params.id) {
                this.reviewId = this.$route.params.id;

                this.loadEntityData();
            }
        },
        loadEntityData() {
            this.isLoading = true;
            const criteria = new Criteria();
            criteria.addAssociation('customer');
            criteria.addAssociation('salesChannel');

            this.repository.get(this.reviewId, this.context, criteria).then((review) => {
                this.review = review;
                this.productRepository.get(this.review.productId, this.context).then(product => {
                    this.product = product;
                });
                this.isLoading = false;
            });
        },

        onSave() {
            const reviewName = this.review.title;
            const titleSaveSuccess = this.$tc('sw-review.detail.titleSaveSuccess');
            const messageSaveSuccess = this.$tc('sw-review.detail.messageSaveSuccess', 0, { name: reviewName });
            const titleSaveError = this.$tc('global.notification.notificationSaveErrorTitle');
            const messageSaveError = this.$tc(
                'global.notification.notificationSaveErrorMessage', 0, { entityName: reviewName }
            );
            this.repository.save(this.review, this.context).then(() => {
                this.createNotificationSuccess({
                    title: titleSaveSuccess,
                    message: messageSaveSuccess
                });
            }).catch((exception) => {
                this.createNotificationError({
                    title: titleSaveError,
                    message: messageSaveError
                });
                warn(this._name, exception.message, exception.response);
                throw exception;
            });
        }
    }
});
