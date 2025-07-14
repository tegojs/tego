import { Field, useField, useFieldSchema } from '@tachybase/schema';

import { useTranslation } from 'react-i18next';

import { SchemaSettings } from '../../../../application/schema-settings/SchemaSettings';
import { useCollection_deprecated, useCollectionManager_deprecated } from '../../../../collection-manager';
import { useDataSourceManager } from '../../../../data-source';
import { useCompile, useDesignable } from '../../../../schema-component';
import { useColumnSchema } from '../../../../schema-component/antd/table-v2/Table.Column.Decorator';

export const multipleComponentFieldSettings = new SchemaSettings({
  name: 'fieldSettings:component:multiple',
  items: [
    {
      name: 'fieldComponent',
      type: 'select',
      useComponentProps() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const { fieldSchema: tableColumnSchema } = useColumnSchema();
        const { getCollectionJoinField } = useCollectionManager_deprecated();
        const dm = useDataSourceManager();
        const schema = useFieldSchema();
        const fieldSchema = tableColumnSchema || schema;
        const collectionField = getCollectionJoinField(fieldSchema['x-collection-field']);
        const collectionInterface = dm.collectionFieldInterfaceManager.getFieldInterface(collectionField?.interface);
        const compile = useCompile();
        const fieldModeOptions = [{ label: t('Select'), value: 'multiple' }];
        collectionInterface?.componentOptions
          ?.filter((item) => !item.useVisible || item.useVisible())
          ?.forEach((item) => {
            if (!fieldModeOptions?.find((modeItem) => modeItem.value === item.value)) {
              fieldModeOptions?.push({
                label: compile(item.label),
                value: item.value,
              });
            }
          });
        const { dn } = useDesignable();

        return {
          title: t('Field component'),
          options: fieldModeOptions,
          value: fieldSchema['x-component-props']?.mode || 'multiple',
          onChange(mode) {
            const schema = {
              ['x-uid']: fieldSchema['x-uid'],
            };
            fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
            fieldSchema['x-component-props']['mode'] = mode;
            fieldSchema['x-component-props']['multiple'] = true;
            schema['x-component-props'] = fieldSchema['x-component-props'];
            field.componentProps = field.componentProps || {};
            field.componentProps.mode = mode;
            field.componentProps.multiple = true;

            void dn.emit('patch', {
              schema,
            });
            dn.refresh();
          },
        };
      },
    },
  ],
});
