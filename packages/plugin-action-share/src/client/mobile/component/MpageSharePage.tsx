import { SchemaSettingsSwitchItem, useDesignable, useSchemaToolbar, useTranslation } from '@tachybase/client';

export const MEnableSharePage = ({ fieldSchema }) => {
  const { t } = useTranslation();
  const { title } = useSchemaToolbar();
  const { dn } = useDesignable();
  return (
    <SchemaSettingsSwitchItem
      checked={fieldSchema['x-component-props']?.enableSharePage}
      title={t('Enable Share page')}
      onChange={async (v) => {
        fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
        fieldSchema['x-component-props']['enableSharePage'] = v;
        fieldSchema['x-extend-components'] = {
          ...fieldSchema['x-extend-components'],
          sharePage: {
            name: 'sharePage',
            component: 'MShareModal',
          },
        };
        if (!fieldSchema.title) {
          fieldSchema.title = title;
        }
        dn.emit('patch', {
          schema: {
            ['x-uid']: fieldSchema['x-uid'],
            ['x-component-props']: fieldSchema['x-component-props'],
            ['x-extend-components']: fieldSchema['x-extend-components'],
            title: fieldSchema.title,
          },
        });
        dn.refresh();
      }}
    />
  );
};
