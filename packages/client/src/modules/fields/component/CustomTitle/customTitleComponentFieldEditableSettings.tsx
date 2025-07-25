import React, { useCallback, useMemo } from 'react';
import { createForm, Field, useField, useFieldSchema, useForm } from '@tachybase/schema';

import _ from 'lodash';
import { useTranslation } from 'react-i18next';

import { useAPIClient } from '../../../../api-client';
import { EditableSchemaSettings } from '../../../../application/schema-settings-editable';
import { useFormBlockContext } from '../../../../block-provider';
import { useCollection_deprecated, useCollectionManager_deprecated } from '../../../../collection-manager';
import { useCollectionFilterOptionsV2, useSortFields } from '../../../../collection-manager/action-hooks';
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
  useIsMuiltipleAble,
  useIsSelectFieldMode,
} from '../../../../schema-component/antd/form-item/FormItem.Settings';
import { useColumnSchema } from '../../../../schema-component/antd/table-v2/Table.Column.Decorator';
import {
  BaseVariableProvider,
  getShouldChange,
  IsDisabledParams,
  useFormulaTitleOptions,
  VariableInput,
} from '../../../../schema-settings';
import { useIsShowMultipleSwitch } from '../../../../schema-settings/hooks/useIsShowMultipleSwitch';
import { useLocalVariables, useVariables } from '../../../../variables';
import {
  createEditableDesignable,
  useEditableDesignable,
} from '../../../blocks/data-blocks/form-editor/EditableDesignable';

export const CustomTitleComponentFieldEditableSettings = new EditableSchemaSettings({
  name: 'editableFieldSettings:component:CustomTitle',
  items: [
    {
      name: 'fieldComponent',
      useSchema() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const isAddNewForm = useIsAddNewForm();
        const fieldMode = useFieldComponentName();
        const collectionFieldCurrent = useCollectionField();
        const { fieldSchema: tableColumnSchema, collectionField } = useColumnSchema();
        const schema = useFieldSchema();
        const fieldSchema = tableColumnSchema || schema;
        const fieldModeOptions = useFieldModeOptions({ fieldSchema: tableColumnSchema, collectionField });
        const isMuiltipleSelect = ['select'].includes(collectionFieldCurrent?.interface);
        const optionsMuiltipleSelect = [
          { label: t('Select'), value: 'Select' },
          { label: t('Radio group'), value: 'Radio group' },
        ];
        return {
          type: 'string',
          title: '{{t("Field component")}}',
          default: fieldMode,
          'x-decorator': 'FormItem',
          'x-component': 'Select',
          'x-component-props': {
            allowClear: false,
            showSearch: false,
            options: isMuiltipleSelect ? optionsMuiltipleSelect : fieldModeOptions,
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
                field?.setInitialValue?.(null);
                field?.setValue?.(null);
              }
            },
          },
        };
      },
      useVisible: useIsMuiltipleAble,
    },
    {
      name: 'customTitle',
      useVisible: useIsMuiltipleAble,
      useSchema() {
        const schema = useFieldSchema();
        const { fieldSchema: tableColumnSchema } = useColumnSchema();
        const fieldSchema = tableColumnSchema || schema;
        const { t } = useTranslation();
        const options = useFormulaTitleOptions();
        const def = fieldSchema['x-component-props']?.fieldNames?.formula;
        const field = useField();
        const modalForm = createForm({
          initialValues: { formula: def },
        });
        return {
          type: 'object',
          title: t('Custom option label'),
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
              title: t('Custom option label'),
              'x-decorator': 'FormV2',
              'x-decorator-props': {
                componentType: 'div',
                form: modalForm,
              },
              properties: {
                formula: {
                  required: true,
                  'x-decorator': 'FormItem',
                  'x-component': 'Variable.TextArea',
                  'x-component-props': {
                    scope: options,
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
                            let formula = form.values.formula;
                            if (formula) {
                              const componentProps = {
                                ...fieldSchema['x-component-props'],
                                fieldNames: {
                                  ...fieldSchema['x-component-props']?.['fieldNames'],
                                  formula,
                                },
                              };
                              field.componentProps = {
                                ...field.componentProps,
                                fieldNames: {
                                  ...field.componentProps?.fieldNames,
                                  formula,
                                },
                              };
                              fieldSchema['x-component-props'] = componentProps;
                            }
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
      name: 'setTheDataScope',
      useSchema() {
        const { t } = useTranslation();
        const { getCollectionJoinField, getAllCollectionsInheritChain } = useCollectionManager_deprecated();
        const { getField } = useCollection_deprecated();
        const { form } = useFormBlockContext();
        const record = useRecord();
        const { fieldSchema: tableColumnSchema, collectionField: tableColumnField } = useColumnSchema();
        const schema = useFieldSchema();
        const fieldSchema = tableColumnSchema || schema;
        const collectionField =
          tableColumnField ||
          getField(fieldSchema['name']) ||
          getCollectionJoinField(fieldSchema['x-collection-field']);
        const { getFields } = useCollectionFilterOptionsV2(collectionField?.target);
        const { isInSubForm, isInSubTable } = useFlag() || {};
        const variables = useVariables();
        const localVariables = useLocalVariables();
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
                  type: 'object',
                  // default: fieldSchema?.['x-component-props']?.service?.params?.filter || {},
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
                    dynamicComponent: dynamicComponent,
                    // value: fieldSchema?.['x-component-props']?.service?.params?.filter || {},
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
                            _.set(fieldSchema['x-component-props'], 'service.params.filter', filter);
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
      useVisible() {
        const isSelectFieldMode = useIsSelectFieldMode();
        const isFieldReadPretty = useIsFieldReadPretty();
        return isSelectFieldMode && !isFieldReadPretty;
      },
    },
    {
      name: 'setDefaultSortingRules',
      useSchema() {
        const field = useField();
        const { t } = useTranslation();
        const fieldSchema = useFieldSchema();
        const { getField } = useCollection_deprecated();
        const { getCollectionJoinField } = useCollectionManager_deprecated();
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

                            field.query(new RegExp(`[0-9]+\\.${fieldSchema.name}$`)).forEach((item) => {
                              _.set(item, 'componentProps.service.params.sort', sortArr);
                            });
                            _.set(fieldSchema, 'x-component-props.service.params.sort', sortArr);
                            // props?.onSubmitCallBack?.(sortArr);
                            field.componentProps = fieldSchema['x-component-props'];
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
      useComponentProps() {
        const { fieldSchema } = useColumnSchema();
        return {
          fieldSchema,
        };
      },
      useVisible() {
        const isSelectFieldMode = useIsSelectFieldMode();
        const isFieldReadPretty = useIsFieldReadPretty();
        return isSelectFieldMode && !isFieldReadPretty;
      },
    },
    {
      name: 'quickCreate',
      useSchema() {
        const { t } = useTranslation();
        const api = useAPIClient();
        const field = useField<Field>();
        const fieldSchema = useFieldSchema();
        const eddn = useMemo(() => {
          return createEditableDesignable({ t, api, current: fieldSchema, model: field });
        }, [t, api, fieldSchema, field]);
        return {
          type: 'string',
          title: '{{t("Quick create")}}',
          default: field.componentProps?.addMode || 'none',
          'x-decorator': 'FormItem',
          'x-component': 'Select',
          'x-component-props': {
            allowClear: false,
            showSearch: false,
            options: [
              { label: t('None'), value: 'none' },
              { label: t('Dropdown'), value: 'quickAdd' },
              { label: t('Pop-up'), value: 'modalAdd' },
            ],
            onChange: (mode) => {
              if (mode === 'modalAdd') {
                const hasAddNew = fieldSchema.reduceProperties((buf, schema) => {
                  if (schema['x-component'] === 'Action') {
                    return schema;
                  }
                  return buf;
                }, null);

                if (!hasAddNew) {
                  const addNewActionschema = {
                    'x-action': 'create',
                    'x-acl-action': 'create',
                    title: "{{t('Add new')}}",
                    // 'x-designer': 'Action.Designer',
                    'x-toolbar': 'ActionSchemaToolbar',
                    'x-settings': 'actionSettings:addNew',
                    'x-component': 'Action',
                    'x-decorator': 'ACLActionProvider',
                    'x-component-props': {
                      openMode: 'drawer',
                      type: 'default',
                      component: 'CreateRecordAction',
                    },
                  };
                  eddn.insertAdjacent('afterBegin', addNewActionschema);
                }
              }
              const schema = {
                ['x-uid']: fieldSchema['x-uid'],
              };
              fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
              fieldSchema['x-component-props']['addMode'] = mode;
              schema['x-component-props'] = fieldSchema['x-component-props'];
              field.componentProps = field.componentProps || {};
              field.componentProps.addMode = mode;
            },
          },
        };
      },
      useVisible() {
        const isAssociationField = useIsAssociationField();
        const readPretty = useIsFieldReadPretty();
        const { fieldSchema } = useColumnSchema();
        return isAssociationField && !fieldSchema && !readPretty;
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
        const { refresh } = useEditableDesignable();
        return {
          type: 'boolean',
          // title: '{{t("Allow multiple")}}',
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
              refresh();
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
    {
      name: 'enableLink',
      useSchema() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const { fieldSchema: tableColumnSchema } = useColumnSchema();
        const schema = useFieldSchema();
        const fieldSchema = tableColumnSchema || schema;
        const { refresh } = useEditableDesignable();
        return {
          type: 'boolean',
          // title: '{{t("Enable link")}}',
          default: fieldSchema['x-component-props']?.enableLink !== false,
          'x-decorator': 'FormItem',
          'x-component': 'Checkbox',
          'x-content': '{{t("Enable link")}}',
          'x-component-props': {
            onInput(e) {
              const flag = e?.target?.checked ?? false;
              fieldSchema['x-component-props'] = {
                ...fieldSchema?.['x-component-props'],
                enableLink: flag,
              };
              field.componentProps['enableLink'] = flag;
              refresh();
            },
          },
        };
      },
      useVisible() {
        const readPretty = useIsFieldReadPretty();
        return useIsAssociationField() && readPretty;
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
