/** Initializer */
import initializers from 'src/app/init';

/** View Adapter */
import VueAdapter from 'src/app/adapter/view/vue.adapter';

/** Services */
import MenuService from 'src/app/service/menu.service';
import LoginService from 'src/core/service/login.service';
import EntityMappingService from 'src/core/service/entity-mapping.service';
import JsonApiParser from 'src/core/service/jsonapi-parser.service';
import ValidationService from 'src/core/service/validation.service';
import RuleConditionService from 'src/app/service/rule-condition.service';
import ProductStreamConditionService from 'src/app/service/product-stream-condition.service';
import StateStyleService from 'src/app/service/state-style.service';
import CustomFieldService from 'src/app/service/custom-field.service';
import SearchTypeService from 'src/app/service/search-type.service';
import ShortcutService from 'src/app/service/shortcut.service';
import LicenseViolationsService from 'src/app/service/license-violations.service';
import LocaleToLanguageService from 'src/app/service/locale-to-language.service';
import addPluginUpdatesListener from 'src/core/service/plugin-updates-listener.service';
import addShopwareUpdatesListener from 'src/core/service/shopware-updates-listener.service';
import 'src/app/decorator';

/** Import global styles */
import 'src/app/assets/scss/all.scss';

/** Application Bootstrapper */
const { Application } = Shopware;

const factoryContainer = Application.getContainer('factory');

/** Create View Adapter */
const adapter = new VueAdapter({
    componentFactory: factoryContainer.component,
    stateFactory: factoryContainer.state,
    filterFactory: factoryContainer.filter,
    directiveFactory: factoryContainer.directive,
    localeFactory: factoryContainer.locale
});

Application.setViewAdapter(adapter);

// Add initializers
Object.keys(initializers).forEach((key) => {
    const initializer = initializers[key];
    Application.addInitializer(key, initializer);
});

// Add service providers
Application
    .addServiceProvider('menuService', () => {
        return MenuService(factoryContainer.module);
    })
    .addServiceProvider('loginService', () => {
        const serviceContainer = Application.getContainer('service');
        const initContainer = Application.getContainer('init');
        const loginService = LoginService(initContainer.httpClient, serviceContainer.context);

        addPluginUpdatesListener(loginService, serviceContainer);
        addShopwareUpdatesListener(loginService, serviceContainer);

        return loginService;
    })
    .addServiceProvider('jsonApiParserService', () => {
        return JsonApiParser;
    })
    .addServiceProvider('validationService', () => {
        return ValidationService;
    })
    .addServiceProvider('ruleConditionDataProviderService', () => {
        return RuleConditionService();
    })
    .addServiceProvider('productStreamConditionService', () => {
        return ProductStreamConditionService();
    })
    .addServiceProvider('customFieldDataProviderService', () => {
        return CustomFieldService();
    })
    .addServiceProvider('stateStyleDataProviderService', () => {
        return StateStyleService();
    })
    .addServiceProvider('searchTypeService', () => {
        return SearchTypeService();
    })
    .addServiceProvider('localeToLanguageService', () => {
        return LocaleToLanguageService();
    })
    .addServiceProvider('entityMappingService', () => {
        return EntityMappingService;
    })
    .addServiceProvider('shortcutService', () => {
        return ShortcutService(factoryContainer.shortcut);
    })
    .addServiceProvider('licenseViolationService', () => {
        return LicenseViolationsService(Application.getContainer('service').storeService);
    });
