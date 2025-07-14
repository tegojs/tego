import { createForm, Field, ISchema, useField, useFieldSchema, useForm } from '@tachybase/schema';

import { message, Select } from 'antd';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';

import { EditableSchemaSettings } from '../../../../application/schema-settings-editable';
import { useCollectionManager_deprecated } from '../../../../collection-manager';
import { useCollectionField, useDataSourceManager } from '../../../../data-source';
import { useActionContext, useCompile } from '../../../../schema-component';
import { useIsFieldReadPretty } from '../../../../schema-component/antd/form-item/FormItem.Settings';
import { useColumnSchema } from '../../../../schema-component/antd/table-v2/Table.Column.Decorator';
import { useEditableDesignable } from '../../../blocks/data-blocks/form-editor/EditableDesignable';

const UnitConversion = ({ unitConversionType }) => {
  const form = useForm();
  const { t } = useTranslation();
  return (
    <Select
      defaultValue={unitConversionType || '*'}
      style={{ width: 160 }}
      onChange={(value) => {
        form.setValuesIn('unitConversionType', value);
      }}
    >
      <Select.Option value="*">{t('Multiply by')}</Select.Option>
      <Select.Option value="/">{t('Divide by')}</Select.Option>
    </Select>
  );
};

export const inputNumberComponentFieldEditableSettings = new EditableSchemaSettings({
  name: 'editableFieldSettings:component:InputNumber',
  items: [
    {
      name: 'fieldComponent',
      useVisible() {
        const collectionField = useCollectionField();
        const dm = useDataSourceManager();
        if (!collectionField) return false;
        const collectionInterface = dm.collectionFieldInterfaceManager.getFieldInterface(
          collectionField?.interface,
        ) as any;
        return (
          Array.isArray(collectionInterface?.componentOptions) &&
          collectionInterface.componentOptions.length > 1 &&
          collectionInterface.componentOptions.filter((item) => !item.useVisible || item.useVisible()).length > 1
        );
      },
      useSchema() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const schema = useFieldSchema();
        const collectionField = useCollectionField();
        const dm = useDataSourceManager();
        const collectionInterface = dm.collectionFieldInterfaceManager.getFieldInterface(collectionField?.interface);
        const { fieldSchema: tableColumnSchema } = useColumnSchema();
        const fieldSchema = tableColumnSchema || schema;
        const compile = useCompile();
        const options =
          collectionInterface?.componentOptions
            ?.filter((item) => !item.useVisible || item.useVisible())
            ?.map((item) => {
              return {
                label: compile(item.label),
                value: item.value,
                useProps: item.useProps,
              };
            }) || [];
        return {
          type: 'string',
          title: '{{t("Field component")}}',
          default: fieldSchema['x-component-props']?.['component'] || options[0]?.value,
          'x-decorator': 'FormItem',
          'x-component': 'Select',
          'x-component-props': {
            options,
            allowClear: false,
            showSearch: false,
            onChange(component) {
              const componentOptions = options.find((item) => item.value === component);
              const componentProps = {
                component,
                ...componentOptions?.useProps?.(),
              };
              field.componentProps = componentProps;
              field.component = component;
              _.set(fieldSchema, 'x-component-props', componentProps);
            },
          },
        };
      },
    },
    {
      name: 'setSliderMAXNumber',
      useVisible() {
        const fieldSchema = useFieldSchema();
        return fieldSchema['x-component-props'].component === 'Slider';
      },
      useSchema() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const fieldSchema = useFieldSchema();
        return {
          type: 'number',
          title: t('Edit Slider Max'),
          default: fieldSchema['x-component-props']?.max,
          'x-decorator': 'FormItem',
          'x-component': 'InputNumber',
          'x-component-props': {
            onChange(number) {
              const min = field.componentProps['min'];
              if (min === undefined || min === null || number > min) {
                fieldSchema['x-component-props']['max'] = number;
                field.componentProps['max'] = number;
              } else {
                message.warning(t('Cannot be less than or equal to the minimum value'));
              }
            },
          },
        };
      },
    },
    {
      name: 'setSliderMinNumber',
      useVisible() {
        const fieldSchema = useFieldSchema();
        return fieldSchema['x-component-props'].component === 'Slider';
      },
      useSchema() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const fieldSchema = useFieldSchema();
        return {
          type: 'number',
          title: t('Edit Slider Min'),
          default: fieldSchema['x-component-props']?.min,
          'x-decorator': 'FormItem',
          'x-component': 'InputNumber',
          'x-component-props': {
            onChange(number) {
              const max = field.componentProps['max'];
              if (max === undefined || max === null || number < max) {
                fieldSchema['x-component-props']['min'] = number;
                field.componentProps['min'] = number;
              } else {
                message.warning(t('Cannot be greater than or equal to the maximum value'));
              }
            },
          },
        };
      },
    },
    {
      name: 'displayFormat',
      useVisible() {
        const isFieldReadPretty = useIsFieldReadPretty();
        return isFieldReadPretty;
      },
      useSchema() {
        const schema = useFieldSchema();
        const { fieldSchema: tableColumnSchema } = useColumnSchema();
        const fieldSchema = tableColumnSchema || schema;
        const field = useField();
        const { t } = useTranslation();
        const { getCollectionJoinField } = useCollectionManager_deprecated();
        const collectionField = getCollectionJoinField(fieldSchema?.['x-collection-field']) || {};
        const { formatStyle, unitConversion, unitConversionType, separator, step, addonBefore, addonAfter } =
          fieldSchema['x-component-props'] || {};
        const { step: prescition } = collectionField?.uiSchema['x-component-props'] || {};
        const modalForm = createForm({
          initialValues: {
            formatStyle: formatStyle || 'normal',
            unitConversion: unitConversion,
            separator: separator || '0,0.00',
            step: step || prescition || '1',
            addonBefore: addonBefore,
            addonAfter: addonAfter,
          },
        });
        return {
          type: 'object',
          title: t('Format'),
          'x-decorator': 'FormItem',
          'x-component': 'Action',
          'x-component-props': {
            style: {
              width: '100%',
            },
          },
          properties: {
            modal: {
              type: 'void',
              'x-component': 'Action.Modal',
              'x-component-props': {
                fullScreenButton: false,
              },
              title: t('Format'),
              'x-decorator': 'FormV2',
              'x-decorator-props': {
                componentType: 'div',
                form: modalForm,
              },
              properties: {
                formatStyle: {
                  type: 'string',
                  enum: [
                    {
                      value: 'normal',
                      label: t('Normal'),
                    },
                    {
                      value: 'scientifix',
                      label: t('Scientifix notation'),
                    },
                  ],
                  'x-decorator': 'FormItem',
                  'x-component': 'Select',
                  title: "{{t('Style')}}",
                },
                unitConversion: {
                  type: 'number',
                  'x-decorator': 'FormItem',
                  'x-component': 'InputNumber',
                  title: "{{t('Unit conversion')}}",
                  'x-component-props': {
                    style: { width: '100%' },
                    addonBefore: <UnitConversion unitConversionType={unitConversionType} />,
                  },
                },
                separator: {
                  type: 'string',
                  enum: [
                    {
                      value: '0,0.00',
                      label: t('100,000.00'),
                    },
                    {
                      value: '0.0,00',
                      label: t('100.000,00'),
                    },
                    {
                      value: '0 0,00',
                      label: t('100 000.00'),
                    },
                    {
                      value: '0.00',
                      label: t('100000.00'),
                    },
                  ],
                  'x-decorator': 'FormItem',
                  'x-component': 'Select',
                  title: "{{t('Separator')}}",
                },
                step: {
                  type: 'string',
                  title: '{{t("Precision")}}',
                  'x-component': 'Select',
                  'x-decorator': 'FormItem',
                  enum: [
                    { value: '1', label: '1' },
                    { value: '0.1', label: '1.0' },
                    { value: '0.01', label: '1.00' },
                    { value: '0.001', label: '1.000' },
                    { value: '0.0001', label: '1.0000' },
                    { value: '0.00001', label: '1.00000' },
                  ],
                },
                addonBefore: {
                  type: 'string',
                  title: '{{t("Prefix")}}',
                  'x-component': 'Input',
                  'x-decorator': 'FormItem',
                },
                addonAfter: {
                  type: 'string',
                  title: '{{t("Suffix")}}',
                  'x-component': 'Input',
                  'x-decorator': 'FormItem',
                },
                footer: {
                  'x-component': 'Action.Modal.Footer',
                  type: 'void',
                  properties: {
                    cancel: {
                      title: '{{t("Cancel")}}',
                      'x-component': 'Action',
                      'x-use-component-props': 'useCancelActionProps',
                    },
                    submit: {
                      title: '{{t("Submit")}}',
                      'x-component': 'Action',
                      'x-use-component-props': () => {
                        const form = useForm();
                        const ctx = useActionContext();
                        return {
                          async onClick() {
                            const data = form.values;
                            const schema = {
                              ['x-uid']: fieldSchema['x-uid'],
                            };
                            schema['x-component-props'] = fieldSchema['x-component-props'] || {};
                            fieldSchema['x-component-props'] = {
                              ...fieldSchema['x-component-props'],
                              ...data,
                            };
                            schema['x-component-props'] = fieldSchema['x-component-props'];
                            field.componentProps = fieldSchema['x-component-props'];
                            //子表格/表格卡片
                            const parts = (field.path.entire as string).split('.');
                            parts.pop();
                            const modifiedString = parts.join('.');
                            field.query(`${modifiedString}.*[0:].${fieldSchema.name}`).forEach((f) => {
                              if (f.props.name === fieldSchema.name) {
                                f.setComponentProps({ ...data });
                              }
                            });
                            ctx?.setVisible?.(false);
                          },
                        };
                      },
                    },
                  },
                },
              },
            },
          },
        };
      },
    },
  ],
});
