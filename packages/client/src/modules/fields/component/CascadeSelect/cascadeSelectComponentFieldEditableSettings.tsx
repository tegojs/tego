import { Field, useField, useFieldSchema } from '@tachybase/schema';

import { useTranslation } from 'react-i18next';

import { EditableSchemaSettings } from '../../../../application/schema-settings-editable';
import { useFieldComponentName } from '../../../../common/useFieldComponentName';
import { useCollectionField } from '../../../../data-source';
import { useFieldModeOptions, useIsAddNewForm } from '../../../../schema-component';
import { isSubMode } from '../../../../schema-component/antd/association-field/util';
import { useTitleFieldOptions } from '../../../../schema-component/antd/form-item/FormItem.Settings';
import { useEditableDesignable } from '../../../blocks/data-blocks/form-editor/EditableDesignable';

export const cascadeSelectComponentFieldEditableSettings = new EditableSchemaSettings({
  name: 'editableFieldSettings:component:CascadeSelect',
  items: [
    {
      name: 'fieldComponent',
      useSchema() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const fieldSchema = useFieldSchema();
        const fieldModeOptions = useFieldModeOptions();
        const isAddNewForm = useIsAddNewForm();
        const fieldComponentName = useFieldComponentName();
        return {
          type: 'string',
          title: '{{t("Field component")}}',
          default: fieldComponentName,
          'x-decorator': 'FormItem',
          'x-component': 'Select',
          'x-component-props': {
            allowClear: false,
            showSearch: false,
            options: fieldModeOptions,
            onChange: (mode) => {
              const schema = {
                ['x-uid']: fieldSchema['x-uid'],
              };
              fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
              fieldSchema['x-component-props']['mode'] = mode;
              schema['x-component-props'] = fieldSchema['x-component-props'];
              field.componentProps = field.componentProps || {};
              field.componentProps.mode = mode;

              // 子表单状态不允许设置默认值
              if (isSubMode(fieldSchema) && isAddNewForm) {
                // @ts-ignore
                schema.default = null;
                fieldSchema.default = null;
                field.setInitialValue(null);
                field.setValue(null);
              }
            },
          },
        };
      },
    },
    {
      name: 'titleField',
      useSchema() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const fieldSchema = useFieldSchema();
        const options = useTitleFieldOptions();
        const collectionField = useCollectionField();
        return {
          type: 'string',
          title: '{{t("Title field")}}',
          default: field?.componentProps?.fieldNames?.label,
          'x-decorator': 'FormItem',
          'x-component': 'Select',
          'x-component-props': {
            allowClear: false,
            showSearch: false,
            options,
            onChange(label) {
              const schema = {
                ['x-uid']: fieldSchema['x-uid'],
              };
              const fieldNames = {
                ...collectionField?.uiSchema?.['x-component-props']?.['fieldNames'],
                ...field.componentProps.fieldNames,
                label,
              };
              fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
              fieldSchema['x-component-props']['fieldNames'] = fieldNames;
              schema['x-component-props'] = fieldSchema['x-component-props'];
              field.componentProps.fieldNames = fieldSchema['x-component-props'].fieldNames;
            },
          },
        };
      },
    },
  ],
});
