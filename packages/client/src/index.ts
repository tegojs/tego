// 重置浏览器样式
import 'antd/dist/reset.css';
import './global.less';

export * from './built-in/acl';
export * from './api-client';
export * from './application';
export * from './async-data-provider';
export * from './block-provider';
export * from './collection-manager';

export * from './common';
export * from './style/css-variable';
export * from './data-source';
export * from './built-in/document-title';
export * from './filter-provider';
export * from './flag-provider';
export * from './style/theme';
export * from './hooks';
export * from './i18n';
export * from './icon';
export { default as locale } from './locale';
export * from './built-in';
export * from './built-in/pinned-list';
export * from './built-in/pm';
export * from './powered-by';
export * from './record-provider';
export * from './route-switch';
export * from './schema-component';
export * from './schema-initializer';
export * from './schema-items';
export * from './schema-settings';
export * from './schema-templates';
export * from './style';
export type { CustomToken } from './style/theme';
export * from './built-in/system-settings';
export * from './testUtils';
export * from './user';
export * from './variables';

export { withDynamicSchemaProps } from './application/hoc/withDynamicSchemaProps';

export * from './modules/blocks/BlockSchemaToolbar';
export * from './modules/blocks/data-blocks/details-multi/setDataLoadingModeSettingsItem';
export * from './modules/blocks/data-blocks/form';
export * from './modules/blocks/data-blocks/table';
export * from './modules/blocks/data-blocks/table-selector';
export { useTranslation } from 'react-i18next';
export * from 'react-i18next';
export { useHotkeys } from 'react-hotkeys-hook';

export * from './modules/blocks/useParentRecordCommon';

export { DynamicPage } from './built-in/dynamic-page/DynamicPage';
