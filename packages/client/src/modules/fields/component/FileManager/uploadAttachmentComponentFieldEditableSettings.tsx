import { Field, useField, useFieldSchema } from '@tachybase/schema';

import { useTranslation } from 'react-i18next';

import { EditableSchemaSettings } from '../../../../application/schema-settings-editable';
import { useIsFieldReadPretty } from '../../../../schema-component/antd/form-item/FormItem.Settings';
import { useColumnSchema } from '../../../../schema-component/antd/table-v2/Table.Column.Decorator';
import { useEditableDesignable } from '../../../blocks/data-blocks/form-editor/EditableDesignable';

export const uploadAttachmentComponentFieldEditableSettings = new EditableSchemaSettings({
  name: 'editableFieldSettings:component:Upload.Attachment',
  items: [
    {
      name: 'size',
      useSchema() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const fieldSchema = useFieldSchema();
        return {
          type: 'string',
          title: t('Size'),
          default: field?.componentProps?.size || 'default',
          'x-decorator': 'FormItem',
          'x-component': 'Select',
          'x-component-props': {
            allowClear: false,
            showSearch: false,
            options: [
              { label: t('Large'), value: 'large' },
              { label: t('Default'), value: 'default' },
              { label: t('Small'), value: 'small' },
            ],
            onChange(size) {
              const schema = {
                ['x-uid']: fieldSchema['x-uid'],
              };
              fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
              fieldSchema['x-component-props']['size'] = size;
              schema['x-component-props'] = fieldSchema['x-component-props'];
              field.componentProps = field.componentProps || {};
              field.componentProps.size = size;
            },
          },
        };
      },
      useVisible() {
        const readPretty = useIsFieldReadPretty();
        return readPretty;
      },
    },
    {
      name: 'showCount',
      useSchema() {
        const { t } = useTranslation();
        const { fieldSchema: tableColumnSchema } = useColumnSchema();
        const schema = useFieldSchema();
        const showCountSchema = tableColumnSchema || schema;
        return {
          type: 'number',
          title: t('Show Count'),
          default: showCountSchema?.['x-component-props']?.['showCount'] || 1,
          'x-decorator': 'FormItem',
          'x-component': 'InputNumber',
          'x-component-props': {
            precision: 0,
            min: 0,
            max: 5,
            onChange: (showCount) => {
              const props = showCountSchema['x-component-props'] || {};
              props.showCount = showCount;
              const schema = {
                ['x-uid']: showCountSchema['x-uid'],
                ['x-component-props']: props,
              };
            },
          },
        };
      },
    },
  ],
});
