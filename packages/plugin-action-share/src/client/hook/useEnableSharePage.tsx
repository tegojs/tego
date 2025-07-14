import { useDesignable, useSchemaToolbar, useTranslation } from '@tachybase/client';
import { useFieldSchema } from '@tachybase/schema';

export const useEnablePageShare = () => {
  const { dn } = useDesignable();
  const { t } = useTranslation();
  const fieldSchema = useFieldSchema();
  const { title } = useSchemaToolbar();
  return {
    title: t('Enable Share page'),
    checked: fieldSchema['x-component-props']?.enableSharePage,
    onChange(v) {
      fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
      fieldSchema['x-component-props']['enableSharePage'] = v;
      fieldSchema['x-extend-components'] = {
        ...fieldSchema['x-extend-components'],
        ShareButton: {
          name: 'ShareButton',
          component: 'ShareButton',
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
    },
  };
};
