import { Field, useField, useFieldSchema } from '@tachybase/schema';

import { useTranslation } from 'react-i18next';

import { EditableSchemaSettings } from '../../../../application/schema-settings-editable';
import { useColumnSchema } from '../../../../schema-component/antd/table-v2/Table.Column.Decorator';
import { useEditableDesignable } from '../../../blocks/data-blocks/form-editor/EditableDesignable';

export const checkboxComponentFieldEditableSettings = new EditableSchemaSettings({
  name: 'editableFieldSettings:component:Checkbox',
  items: [
    {
      name: 'fieldComponent',
      useSchema() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const { fieldSchema: tableColumnSchema } = useColumnSchema();
        const schema = useFieldSchema();
        const fieldSchema = tableColumnSchema || schema;
        const fieldModeOptions = [
          { label: t('Checkbox'), value: 'Checkbox' },
          { label: t('Radio group'), value: 'Radio group' },
        ];
        return {
          type: 'string',
          title: '{{t("Field component")}}',
          default: fieldSchema['x-component-props']?.mode || 'Checkbox',
          'x-decorator': 'FormItem',
          'x-component': 'Select',
          'x-component-props': {
            allowClear: false,
            showSearch: false,
            options: fieldModeOptions,
            onChange(mode) {
              const schema = {
                ['x-uid']: fieldSchema['x-uid'],
              };
              fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
              fieldSchema['x-component-props']['mode'] = mode;
              schema['x-component-props'] = fieldSchema['x-component-props'];
              field.componentProps = field.componentProps || {};
              field.componentProps.mode = mode;
            },
          },
        };
      },
    },
  ],
});
