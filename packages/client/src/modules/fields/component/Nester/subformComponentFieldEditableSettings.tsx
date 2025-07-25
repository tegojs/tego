import { Field, useField, useFieldSchema } from '@tachybase/schema';

import { useTranslation } from 'react-i18next';

import { EditableSchemaSettings } from '../../../../application/schema-settings-editable';
import { useFormBlockType } from '../../../../block-provider';
import { useFieldComponentName } from '../../../../common/useFieldComponentName';
import { useCollectionField } from '../../../../data-source';
import { useFieldModeOptions, useIsAddNewForm } from '../../../../schema-component';
import { isSubMode } from '../../../../schema-component/antd/association-field/util';
import {
  useIsFieldReadPretty,
  useIsFormReadPretty,
} from '../../../../schema-component/antd/form-item/FormItem.Settings';

export const subformComponentFieldEditableSettings = new EditableSchemaSettings({
  name: 'editableFieldSettings:component:Nester',
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
            options: fieldModeOptions,
            allowClear: false,
            showSearch: false,
            onChange(mode) {
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
      name: 'allowMultiple',
      useVisible() {
        const isFieldReadPretty = useIsFieldReadPretty();
        const collectionField = useCollectionField();
        return !isFieldReadPretty && ['hasMany', 'belongsToMany'].includes(collectionField?.type);
      },
      useSchema() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const fieldSchema = useFieldSchema();
        return {
          type: 'boolean',
          default:
            fieldSchema['x-component-props']?.multiple === undefined ? true : fieldSchema['x-component-props'].multiple,
          'x-decorator': 'FormItem',
          'x-component': 'Checkbox',
          'x-content': '{{t("Allow multiple")}}',
          'x-component-props': {
            onInput(e) {
              const value = e?.target?.checked ?? false;
              const schema = {
                ['x-uid']: fieldSchema['x-uid'],
              };
              fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
              field.componentProps = field.componentProps || {};

              fieldSchema['x-component-props'].multiple = value;
              field.componentProps.multiple = value;

              schema['x-component-props'] = fieldSchema['x-component-props'];
            },
          },
        };
      },
    },
    {
      name: 'allowDissociate',
      useVisible() {
        const { type } = useFormBlockType();
        return !useIsFormReadPretty() && type === 'update';
      },
      useSchema() {
        const field = useField<Field>();
        const fieldSchema = useFieldSchema();
        return {
          type: 'boolean',
          default: fieldSchema['x-component-props']?.allowDissociate !== false,
          'x-decorator': 'FormItem',
          'x-component': 'Checkbox',
          'x-content': '{{t("Allow dissociate")}}',
          'x-component-props': {
            onInput(e) {
              const value = e?.target?.checked ?? false;
              const schema = {
                ['x-uid']: fieldSchema['x-uid'],
              };
              fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
              field.componentProps = field.componentProps || {};

              fieldSchema['x-component-props'].allowDissociate = value;
              field.componentProps.allowDissociate = value;

              schema['x-component-props'] = fieldSchema['x-component-props'];
            },
          },
        };
      },
    },
  ],
});
