import './component';
import './config';
import './preview';

const { Application } = Shopware;

Application.getContainer('service').cmsService.registerCmsElement({
    name: 'image',
    label: 'Image',
    component: 'sw-cms-el-image',
    configComponent: 'sw-cms-el-config-image',
    previewComponent: 'sw-cms-el-preview-image',
    defaultConfig: {
        media: {
            source: 'static',
            value: null,
            required: true,
            entity: {
                name: 'media'
            }
        },
        displayMode: {
            source: 'static',
            value: 'standard'
        },
        url: {
            source: 'static',
            value: null
        },
        newTab: {
            source: 'static',
            value: false
        },
        minHeight: {
            source: 'static',
            value: '340px'
        },
        verticalAlign: {
            source: 'static',
            value: null
        }
    }
});
