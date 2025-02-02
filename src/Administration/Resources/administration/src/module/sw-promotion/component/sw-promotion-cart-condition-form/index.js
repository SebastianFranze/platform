import { PromotionPermissions } from 'src/module/sw-promotion/helper/promotion.helper';
import template from './sw-promotion-cart-condition-form.html.twig';
import './sw-promotion-cart-condition-form.scss';

const { Application, Component } = Shopware;
const { Criteria } = Shopware.Data;

Component.register('sw-promotion-cart-condition-form', {
    template,

    inject: ['repositoryFactory', 'context'],

    props: {
        promotion: {
            type: Object,
            required: false,
            default: null
        }
    },
    data() {
        return {
            syncService: null,
            httpClient: null,
            packagerKeys: [],
            sorterKeys: []
        };
    },
    computed: {

        repositoryGroups() {
            return this.repositoryFactory.create('promotion_setgroup');
        },

        ruleFilter() {
            const criteria = new Criteria();

            criteria.addFilter(Criteria.multi('AND', [
                Criteria.equalsAny('conditions.type', [
                    'cartHasDeliveryFreeItem', 'cartWeight', 'cartLineItemsInCart', 'cartLineItemsInCartCount',
                    'cartGoodsCount', 'cartGoodsPrice'
                ]),
                Criteria.not('AND', [Criteria.equalsAny('conditions.type', ['cartCartAmount'])])
            ]));

            return criteria;
        },

        packagers() {
            const result = [];

            this.packagerKeys.forEach((keyValue) => {
                result.push(
                    {
                        key: keyValue,
                        name: this.$tc(`sw-promotion.setgroup.packager.${keyValue}`)
                    }
                );
            });
            return result;
        },

        sorters() {
            const result = [];

            this.sorterKeys.forEach((keyValue) => {
                result.push(
                    {
                        key: keyValue,
                        name: this.$tc(`sw-promotion.setgroup.sorter.${keyValue}`)
                    }
                );
            });

            return result;
        },

        isEditingDisabled() {
            if (this.promotion === null) {
                return true;
            }

            return !PromotionPermissions.isEditingAllowed(this.promotion);
        }
    },
    watch: {
        promotion() {
            this.loadSetGroups();
        }
    },
    created() {
        this.createdComponent();
    },
    methods: {
        createdComponent() {
            this.syncService = Application.getContainer('service').syncService;
            this.httpClient = this.syncService.httpClient;

            if (this.promotion) {
                this.loadSetGroups();
            }

            this.loadPackagers().then((keys) => {
                this.packagerKeys = keys;
            });

            this.loadSorters().then((keys) => {
                this.sorterKeys = keys;
            });
        },

        loadSetGroups() {
            const criteria = new Criteria();
            criteria.addFilter(
                Criteria.equals('promotionId', this.promotion.id)
            );

            this.repositoryGroups.search(criteria, this.context).then((groups) => {
                this.promotion.setgroups = groups;
            });
        },

        addSetGroup() {
            const newGroup = this.repositoryGroups.create(this.context);
            newGroup.promotionId = this.promotion.id;
            newGroup.value = 2;
            newGroup.packagerKey = 'COUNT';
            newGroup.sorterKey = 'PRICE_DESC';

            this.promotion.setgroups.push(newGroup);
        },

        duplicateSetGroup(group) {
            const newGroup = this.repositoryGroups.create(this.context);
            newGroup.promotionId = group.promotionId;
            newGroup.value = group.value;
            newGroup.packagerKey = group.packagerKey;
            newGroup.sorterKey = group.sorterKey;

            this.promotion.setgroups.push(newGroup);
        },

        deleteSetGroup(group) {
            // add to delete list for the save process
            const deleteIds = this.$store.state.swPromotionDetail.setGroupIdsDelete;
            deleteIds.push(group.id);
            this.$store.commit('swPromotionDetail/setSetGroupIdsDelete', deleteIds);

            // remove also from entity for the view rendering
            this.promotion.setgroups = this.promotion.setgroups.filter((g) => {
                return g.id !== group.id;
            });
        },

        async loadPackagers() {
            return this.httpClient.get(
                '/_action/promotion/setgroup/packager',
                {
                    headers: this.syncService.getBasicHeaders()
                }
            ).then((response) => {
                return response.data;
            });
        },
        async loadSorters() {
            return this.httpClient.get(
                '/_action/promotion/setgroup/sorter',
                {
                    headers: this.syncService.getBasicHeaders()
                }
            ).then((response) => {
                return response.data;
            });
        }
    }
});
