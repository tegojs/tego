import React from 'react';
// import { useCollectionField } from '../utils';
import { createForm, Field, ISchema, useField, useFieldSchema, useForm } from '@tachybase/schema';

import _ from 'lodash';
import { useTranslation } from 'react-i18next';

import { EditableSchemaSettings } from '../../../../application/schema-settings-editable';
import { useFormBlockContext } from '../../../../block-provider';
import {
  useCollection_deprecated,
  useCollectionManager_deprecated,
  useSortFields,
} from '../../../../collection-manager';
import { useCollectionFilterOptionsV2 } from '../../../../collection-manager/action-hooks';
import { useFieldComponentName } from '../../../../common/useFieldComponentName';
import { useCollectionField } from '../../../../data-source';
import { FlagProvider, useFlag } from '../../../../flag-provider';
import { useRecord } from '../../../../record-provider';
import {
  removeNullCondition,
  useActionContext,
  useFieldModeOptions,
  useIsAddNewForm,
} from '../../../../schema-component';
import { isSubMode } from '../../../../schema-component/antd/association-field/util';
import { DynamicComponentProps } from '../../../../schema-component/antd/filter/DynamicComponent';
import {
  useIsAssociationField,
  useIsFieldReadPretty,
  useTitleFieldOptions,
} from '../../../../schema-component/antd/form-item/FormItem.Settings';
import { useColumnSchema } from '../../../../schema-component/antd/table-v2/Table.Column.Decorator';
import { BaseVariableProvider, getShouldChange, IsDisabledParams, VariableInput } from '../../../../schema-settings';
import { useLocalVariables, useVariables } from '../../../../variables';
import { useEditableDesignable } from '../../../blocks/data-blocks/form-editor/EditableDesignable';

export const cascaderComponentFieldEditableSettings = new EditableSchemaSettings({
  name: 'editableFieldSettings:component:Cascader',
  items: [
    {
      name: 'fieldComponent',
      useVisible: useIsAssociationField,
      useSchema() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const { fieldSchema: tableColumnSchema, collectionField } = useColumnSchema();
        const schema = useFieldSchema();
        const fieldSchema = tableColumnSchema || schema;
        const fieldModeOptions = useFieldModeOptions({ fieldSchema: tableColumnSchema, collectionField });
        const isAddNewForm = useIsAddNewForm();
        const fieldMode = useFieldComponentName();
        return {
          type: 'string',
          title: '{{t("Field component")}}',
          default: fieldMode,
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
                field?.setInitialValue?.(null);
                field?.setValue?.(null);
              }
            },
          },
        };
      },
    },
    {
      name: 'setTheDataScope',
      useVisible() {
        const isFieldReadPretty = useIsFieldReadPretty();
        return !isFieldReadPretty;
      },
      useSchema() {
        const { getCollectionJoinField, getAllCollectionsInheritChain } = useCollectionManager_deprecated();
        const { getField } = useCollection_deprecated();
        const { t } = useTranslation();
        const { form } = useFormBlockContext();
        const record = useRecord();
        const field = useField();
        const { fieldSchema: tableColumnSchema, collectionField: tableColumnField } = useColumnSchema();
        const schema = useFieldSchema();
        const fieldSchema = tableColumnSchema || schema;
        const { isInSubForm, isInSubTable } = useFlag() || {};
        const collectionField =
          tableColumnField ||
          getField(fieldSchema['name']) ||
          getCollectionJoinField(fieldSchema['x-collection-field']);
        const variables = useVariables();
        const localVariables = useLocalVariables();
        const { getFields } = useCollectionFilterOptionsV2(collectionField?.target);
        const dynamicComponent = (props: DynamicComponentProps) => {
          return (
            <VariableInput
              {...props}
              form={form}
              collectionField={props.collectionField}
              record={record}
              shouldChange={getShouldChange({
                collectionField: props.collectionField,
                variables,
                localVariables,
                getAllCollectionsInheritChain,
              })}
            />
          );
        };
        const filterForm = createForm({
          initialValues: { filter: fieldSchema?.['x-component-props']?.service?.params?.filter || {} },
        });
        return {
          type: 'object',
          title: t('Set the data scope'),
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
              title: t('Set the data scope'),
              'x-decorator': 'FormV2',
              'x-decorator-props': {
                componentType: 'div',
                form: filterForm,
              },
              properties: {
                filter: {
                  enum: getFields(),
                  'x-decorator': (props) => (
                    <BaseVariableProvider {...props}>
                      <FlagProvider isInSubForm={isInSubForm} isInSubTable={isInSubTable}>
                        {props.children}
                      </FlagProvider>
                    </BaseVariableProvider>
                  ),
                  'x-decorator-props': {
                    isDisabled,
                  },
                  'x-component': 'Filter',
                  'x-component-props': {
                    collectionName: collectionField?.target,
                    dynamicComponent,
                  },
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
                            let filter = form.values.filter;
                            filter = removeNullCondition(filter);
                            _.set(field.componentProps, 'service.params.filter', filter);
                            const service = fieldSchema['x-component-props']?.service;
                            if (service) {
                              service.params['filter'] = filter;
                            } else {
                              fieldSchema['x-component-props']['service'] = {
                                params: {
                                  filter: { ...filter },
                                },
                              };
                            }
                            const componentProps = fieldSchema['x-component-props'];
                            const path = field.path?.splice(field.path?.length - 1, 1);
                            field.form.query(`${path.concat(`*.` + fieldSchema.name)}`).forEach((f) => {
                              f.componentProps = componentProps;
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
    {
      name: 'setDefaultSortingRules',
      useVisible() {
        const isFieldReadPretty = useIsFieldReadPretty();
        return !isFieldReadPretty;
      },
      useSchema() {
        const field = useField();
        const { t } = useTranslation();
        const currentSchema = useFieldSchema();
        const { getField } = useCollection_deprecated();
        const { getCollectionJoinField } = useCollectionManager_deprecated();
        const { columnSchema } = useColumnSchema();
        const fieldSchema = columnSchema ?? currentSchema;
        const collectionField =
          getField(fieldSchema['name']) || getCollectionJoinField(fieldSchema['x-collection-field']);
        const sortFields = useSortFields(collectionField?.target);
        const defaultSort = fieldSchema['x-component-props']?.service?.params?.sort || [];
        const sort = defaultSort?.map((item: string) => {
          return item?.startsWith('-')
            ? {
                field: item.substring(1),
                direction: 'desc',
              }
            : {
                field: item,
                direction: 'asc',
              };
        });
        const sortForm = createForm({
          initialValues: { sort: sort },
        });
        return {
          type: 'object',
          title: t('Set default sorting rules'),
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
              title: t('Set default sorting rules'),
              'x-decorator': 'FormV2',
              'x-decorator-props': {
                componentType: 'div',
                form: sortForm,
              },
              properties: {
                sort: {
                  type: 'array',
                  'x-component': 'ArrayItems',
                  'x-decorator': 'FormItem',
                  items: {
                    type: 'object',
                    properties: {
                      space: {
                        type: 'void',
                        'x-component': 'Space',
                        properties: {
                          sort: {
                            type: 'void',
                            'x-decorator': 'FormItem',
                            'x-component': 'ArrayItems.SortHandle',
                          },
                          field: {
                            type: 'string',
                            enum: sortFields,
                            required: true,
                            'x-decorator': 'FormItem',
                            'x-component': 'Select',
                            'x-component-props': {
                              style: {
                                width: 260,
                              },
                              optionLabelProp: 'fullLabel',
                            },
                          },
                          direction: {
                            type: 'string',
                            'x-decorator': 'FormItem',
                            'x-component': 'Radio.Group',
                            'x-component-props': {
                              optionType: 'button',
                            },
                            enum: [
                              {
                                label: t('ASC'),
                                value: 'asc',
                              },
                              {
                                label: t('DESC'),
                                value: 'desc',
                              },
                            ],
                          },
                          remove: {
                            type: 'void',
                            'x-decorator': 'FormItem',
                            'x-component': 'ArrayItems.Remove',
                          },
                        },
                      },
                    },
                  },
                  properties: {
                    add: {
                      type: 'void',
                      title: t('Add sort field'),
                      'x-component': 'ArrayItems.Addition',
                    },
                  },
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
                            let sort = form.values.sort;
                            const sortArr = sort.map((item) => {
                              return item.direction === 'desc' ? `-${item.field}` : item.field;
                            });
                            _.set(field.componentProps, 'service.params.sort', sortArr);
                            // props?.onSubmitCallBack?.(sortArr);
                            const service = fieldSchema['x-component-props']?.service;
                            if (service) {
                              service.params['sort'] = field.componentProps?.service.params?.sort;
                            } else {
                              fieldSchema['x-component-props']['service'] = {
                                params: {
                                  sort: field.componentProps?.service.params?.sort,
                                },
                              };
                            }
                            const componentProps = fieldSchema['x-component-props'];
                            const path = field.path?.splice(field.path?.length - 1, 1);
                            field.form.query(`${path.concat(`*.` + fieldSchema.name)}`).forEach((f) => {
                              f.componentProps = componentProps;
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
    {
      name: 'titleField',
      useVisible: useIsAssociationField,
      useSchema() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const options = useTitleFieldOptions();
        const { uiSchema, fieldSchema: tableColumnSchema, collectionField: tableColumnField } = useColumnSchema();
        const schema = useFieldSchema();
        const fieldSchema = tableColumnSchema || schema;
        const targetCollectionField = useCollectionField();
        const collectionField = tableColumnField || targetCollectionField;
        // 处理多对一关系标题显示
        const { getCollectionFields } = useCollectionManager_deprecated();
        const fieldNames = {
          ...collectionField?.uiSchema?.['x-component-props']?.['fieldNames'],
          ...field?.componentProps?.fieldNames,
          ...fieldSchema?.['x-component-props']?.['fieldNames'],
        };
        return {
          type: 'string',
          title: '{{t("Title field")}}',
          default: fieldNames?.label,
          'x-decorator': 'FormItem',
          'x-component': 'Select',
          'x-component-props': {
            options,
            allowClear: false,
            showSearch: false,
            onChange(label) {
              const schema = {
                ['x-uid']: fieldSchema['x-uid'],
              };
              const newFieldNames = {
                ...collectionField?.uiSchema?.['x-component-props']?.['fieldNames'],
                ...fieldSchema['x-component-props']?.['fieldNames'],
                label,
              };
              fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
              fieldSchema['x-component-props']['fieldNames'] = newFieldNames;
              // 处理多对一关系标题显示
              const target = getCollectionFields(collectionField.target).find((field) => field.name === label);
              if (target.interface === 'm2o') {
                fieldSchema['x-component-props']['x-next-title'] = {
                  label,
                  collection: target.collectionName,
                };
              } else {
                fieldSchema['x-component-props']['x-next-title'] = null;
              }
              schema['x-component-props'] = fieldSchema['x-component-props'];
              field.componentProps.fieldNames = fieldSchema['x-component-props'].fieldNames;
              const path = field.path?.splice(field.path?.length - 1, 1);
              field.form.query(`${path.concat(`*.` + fieldSchema.name)}`).forEach((f) => {
                f.componentProps.fieldNames = newFieldNames;
              });
            },
          },
        };
      },
    },
    {
      name: 'changeOnSelect',
      useVisible: useIsAssociationField,
      useSchema() {
        const { t } = useTranslation();
        const { fieldSchema: tableColumnSchema, collectionField } = useColumnSchema();
        const field = useField<Field>();
        const schema = useFieldSchema();
        const fieldSchema = tableColumnSchema || schema;
        return {
          type: 'boolean',
          default: !!fieldSchema?.['x-component-props']?.changeOnSelect,
          'x-decorator': 'FormItem',
          'x-component': 'Checkbox',
          'x-content': '{{t("Chang on Parent")}}',
          'x-component-props': {
            onInput(e) {
              const value = e?.target?.checked ?? false;
              fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
              field.componentProps = field.componentProps || {};
              fieldSchema['x-component-props']['changeOnSelect'] = value;
              field.componentProps.changeOnSelect = value;
            },
          },
        };
      },
    },
  ],
});

function isDisabled(params: IsDisabledParams) {
  const { option, collectionField, uiSchema } = params;

  if (!uiSchema || !collectionField) {
    return true;
  }

  // json 类型的字段，允许设置任意类型的值
  if (collectionField.interface === 'json') {
    return false;
  }

  // 数据范围支持选择 `对多` 、`对一` 的关系字段
  if (option.target) {
    return false;
  }

  if (['input', 'markdown', 'richText', 'textarea', 'username'].includes(collectionField.interface)) {
    return !['string', 'number'].includes(option.schema?.type);
  }

  if (collectionField.interface && option.interface) {
    return collectionField.interface !== option.interface;
  }

  if (uiSchema?.['x-component'] !== option.schema?.['x-component']) {
    return true;
  }

  return false;
}
