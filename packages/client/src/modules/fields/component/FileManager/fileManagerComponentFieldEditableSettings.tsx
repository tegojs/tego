import { Field, useField, useFieldSchema, useForm } from '@tachybase/schema';

import { useTranslation } from 'react-i18next';

import { EditableSchemaSettings } from '../../../../application/schema-settings-editable';
import { useFieldComponentName } from '../../../../common/useFieldComponentName';
import { useFieldModeOptions, useIsAddNewForm } from '../../../../schema-component';
import { isSubMode } from '../../../../schema-component/antd/association-field/util';
import {
  useIsAssociationField,
  useIsFieldReadPretty,
} from '../../../../schema-component/antd/form-item/FormItem.Settings';
import { useColumnSchema } from '../../../../schema-component/antd/table-v2/Table.Column.Decorator';
import { useIsShowMultipleSwitch } from '../../../../schema-settings/hooks/useIsShowMultipleSwitch';
import { useEditableDesignable } from '../../../blocks/data-blocks/form-editor/EditableDesignable';

export const fileManagerComponentFieldEditableSettings = new EditableSchemaSettings({
  name: 'editableFieldSettings:component:FileManager',
  items: [
    {
      name: 'fieldComponent',
      useSchema() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const isAddNewForm = useIsAddNewForm();
        const fieldComponentName = useFieldComponentName();
        const { fieldSchema: tableColumnSchema, collectionField } = useColumnSchema();
        const schema = useFieldSchema();
        const fieldSchema = tableColumnSchema || schema;
        const fieldModeOptions = useFieldModeOptions({ fieldSchema: tableColumnSchema, collectionField });
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
      name: 'quickUpload',
      useVisible() {
        const { fieldSchema: tableColumnSchema } = useColumnSchema();
        const field = useField();
        const form = useForm();
        const isReadPretty = tableColumnSchema?.['x-read-pretty'] || field.readPretty || form.readPretty;
        return !isReadPretty;
      },
      useSchema() {
        const field = useField<Field>();
        const { fieldSchema: tableColumnSchema } = useColumnSchema();
        const schema = useFieldSchema();
        const fieldSchema = tableColumnSchema || schema;
        return {
          type: 'boolean',
          default: fieldSchema['x-component-props']?.quickUpload !== (false as boolean),
          'x-decorator': 'FormItem',
          'x-component': 'Checkbox',
          'x-content': '{{t("Quick upload")}}',
          'x-component-props': {
            onInput: (e) => {
              const value = e?.target?.checked ?? false;
              const schema = {
                ['x-uid']: fieldSchema['x-uid'],
              };
              field.componentProps.quickUpload = value;
              fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
              fieldSchema['x-component-props'].quickUpload = value;
              schema['x-component-props'] = fieldSchema['x-component-props'];
            },
          },
        };
      },
    },
    {
      name: 'selectFile',
      useVisible() {
        const { fieldSchema: tableColumnSchema } = useColumnSchema();
        const field = useField();
        const form = useForm();
        const isReadPretty = tableColumnSchema?.['x-read-pretty'] || field.readPretty || form.readPretty;
        return !isReadPretty;
      },
      useSchema() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const { fieldSchema: tableColumnSchema } = useColumnSchema();
        const schema = useFieldSchema();
        const fieldSchema = tableColumnSchema || schema;
        return {
          type: 'boolean',
          default: fieldSchema['x-component-props']?.selectFile !== (false as boolean),
          'x-decorator': 'FormItem',
          'x-component': 'Checkbox',
          'x-content': '{{t("Select file")}}',
          'x-component-props': {
            onInput: (e) => {
              const value = e?.target?.checked ?? false;
              const schema = {
                ['x-uid']: fieldSchema['x-uid'],
              };
              field.componentProps.selectFile = value;
              fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
              fieldSchema['x-component-props'].selectFile = value;
              schema['x-component-props'] = fieldSchema['x-component-props'];
            },
          },
        };
      },
    },
    {
      name: 'size',
      type: 'select',
      useVisible() {
        const readPretty = useIsFieldReadPretty();
        const { fieldSchema: tableColumnSchema } = useColumnSchema();
        return readPretty && !tableColumnSchema;
      },
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
    },
    {
      name: 'allowMultiple',
      useSchema() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const { fieldSchema: tableColumnSchema } = useColumnSchema();
        const schema = useFieldSchema();
        const fieldSchema = tableColumnSchema || schema;
        return {
          type: 'boolean',
          default:
            fieldSchema['x-component-props']?.multiple === undefined ? true : fieldSchema['x-component-props'].multiple,
          'x-decorator': 'FormItem',
          'x-component': 'Checkbox',
          'x-content': '{{t("Allow multiple")}}',
          'x-component-props': {
            onInput: (e) => {
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
      useVisible() {
        const isAssociationField = useIsAssociationField();
        const IsShowMultipleSwitch = useIsShowMultipleSwitch();
        return isAssociationField && IsShowMultipleSwitch();
      },
    },
  ],
});
