import React from 'react';
import { Field, ISchema, useField, useFieldSchema } from '@tachybase/schema';

import _ from 'lodash';
import { useTranslation } from 'react-i18next';

import { SchemaSettings } from '../../../../application/schema-settings/SchemaSettings';
import { useFormBlockContext } from '../../../../block-provider';
import { useCollection_deprecated, useCollectionManager_deprecated } from '../../../../collection-manager';
import { useFieldComponentName } from '../../../../common/useFieldComponentName';
import { useCollectionField, useDataSourceManager } from '../../../../data-source';
import { useRecord } from '../../../../record-provider';
import {
  removeNullCondition,
  useCompile,
  useDesignable,
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
  useTitleFieldOptions,
} from '../../../../schema-component/antd/form-item/FormItem.Settings';
import { useColumnSchema } from '../../../../schema-component/antd/table-v2/Table.Column.Decorator';
import {
  EditFormulaTitleField,
  getShouldChange,
  useFormulaTitleOptions,
  useFormulaTitleVisible,
  VariableInput,
} from '../../../../schema-settings';
import { useIsShowMultipleSwitch } from '../../../../schema-settings/hooks/useIsShowMultipleSwitch';
import { SchemaSettingsDataScope } from '../../../../schema-settings/SchemaSettingsDataScope';
import { SchemaSettingsSortingRule } from '../../../../schema-settings/SchemaSettingsSortingRule';
import { useLocalVariables, useVariables } from '../../../../variables';

export const enableLink = {
  name: 'enableLink',
  type: 'switch',
  useVisible() {
    const field = useField();
    return field.readPretty;
  },
  useComponentProps() {
    const { t } = useTranslation();
    const field = useField<Field>();
    const { fieldSchema: tableColumnSchema } = useColumnSchema();
    const schema = useFieldSchema();
    const fieldSchema = tableColumnSchema || schema;
    const { dn } = useDesignable();
    return {
      title: t('Enable link'),
      checked: fieldSchema['x-component-props']?.enableLink !== false,
      onChange(flag) {
        fieldSchema['x-component-props'] = {
          ...fieldSchema?.['x-component-props'],
          enableLink: flag,
        };
        field.componentProps['enableLink'] = flag;
        dn.emit('patch', {
          schema: {
            'x-uid': fieldSchema['x-uid'],
            'x-component-props': {
              ...fieldSchema?.['x-component-props'],
            },
          },
        });
        dn.refresh();
      },
    };
  },
};

export const titleField: any = {
  name: 'titleField',
  type: 'select',
  useComponentProps() {
    const { t } = useTranslation();
    const field = useField<Field>();
    const { dn } = useDesignable();
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
      title: t('Title field'),
      options,
      value: fieldNames?.label,
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
          f.componentProps.fieldNames = fieldNames;
        });
        dn.emit('patch', {
          schema,
        });
        dn.refresh();
      },
    };
  },
};

export const allowMultiple: any = {
  name: 'allowMultiple',
  type: 'switch',
  useVisible() {
    const isFieldReadPretty = useIsFieldReadPretty();
    const collectionField = useCollectionField();
    return !isFieldReadPretty && ['hasMany', 'belongsToMany'].includes(collectionField?.type);
  },
  useComponentProps() {
    const { t } = useTranslation();
    const field = useField<Field>();
    const { fieldSchema: tableColumnSchema } = useColumnSchema();
    const schema = useFieldSchema();
    const fieldSchema = tableColumnSchema || schema;
    const { dn, refresh } = useDesignable();
    return {
      title: t('Allow multiple'),
      checked:
        fieldSchema['x-component-props']?.multiple === undefined ? true : fieldSchema['x-component-props'].multiple,
      onChange(value) {
        const schema = {
          ['x-uid']: fieldSchema['x-uid'],
        };
        fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
        field.componentProps = field.componentProps || {};

        fieldSchema['x-component-props'].multiple = value;
        field.componentProps.multiple = value;

        schema['x-component-props'] = fieldSchema['x-component-props'];
        dn.emit('patch', {
          schema,
        });
        refresh();
      },
    };
  },
};

export const quickCreate: any = {
  name: 'quickCreate',
  type: 'select',
  useComponentProps() {
    const { t } = useTranslation();
    const field = useField<Field>();
    const fieldSchema = useFieldSchema();
    const { dn, insertAdjacent } = useDesignable();
    return {
      title: t('Quick create'),
      options: [
        { label: t('None'), value: 'none' },
        { label: t('Dropdown'), value: 'quickAdd' },
        { label: t('Pop-up'), value: 'modalAdd' },
      ],
      value: field.componentProps?.addMode || 'none',
      onChange(mode) {
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
            insertAdjacent('afterBegin', addNewActionschema);
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
        dn.emit('patch', {
          schema,
        });
        dn.refresh();
      },
    };
  },
};

export const setDefaultSortingRules = {
  name: 'setDefaultSortingRules',
  Component: SchemaSettingsSortingRule,
};

export const setTheDataScope: any = {
  name: 'setTheDataScope',
  Component: SchemaSettingsDataScope,
  useComponentProps() {
    const { getCollectionJoinField, getAllCollectionsInheritChain } = useCollectionManager_deprecated();
    const { getField } = useCollection_deprecated();
    const { form } = useFormBlockContext();
    const record = useRecord();
    const field = useField();
    const { fieldSchema: tableColumnSchema, collectionField: tableColumnField } = useColumnSchema();
    const schema = useFieldSchema();
    const fieldSchema = tableColumnSchema || schema;
    const collectionField =
      tableColumnField || getField(fieldSchema['name']) || getCollectionJoinField(fieldSchema['x-collection-field']);
    const variables = useVariables();
    const localVariables = useLocalVariables();
    const { dn } = useDesignable();
    return {
      collectionName: collectionField?.target,
      defaultFilter: fieldSchema?.['x-component-props']?.service?.params?.filter || {},
      form,
      dynamicComponent: (props: DynamicComponentProps) => {
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
      },
      onSubmit: ({ filter }) => {
        filter = removeNullCondition(filter);
        _.set(fieldSchema['x-component-props'], 'service.params.filter', filter);
        dn.emit('patch', {
          schema: {
            ['x-uid']: fieldSchema['x-uid'],
            'x-component-props': fieldSchema['x-component-props'],
          },
        });
      },
    };
  },
};

export const fieldComponent: any = {
  name: 'fieldComponent',
  type: 'select',
  useComponentProps() {
    const { t } = useTranslation();
    const field = useField<Field>();
    const collectionFieldCurrent = useCollectionField();

    const { fieldSchema: tableColumnSchema, collectionField } = useColumnSchema();

    const schema = useFieldSchema();
    const fieldSchema = tableColumnSchema || schema;

    const fieldModeOptions = useFieldModeOptions({ fieldSchema: tableColumnSchema, collectionField });

    const isAddNewForm = useIsAddNewForm();
    const fieldMode = useFieldComponentName();
    const { dn } = useDesignable();

    const isMuiltipleSelect = ['select', 'multipleSelect'].includes(collectionFieldCurrent?.interface);

    const optionsMuiltipleSelect = [
      { label: t('Select'), value: 'Select' },
      { label: t('Radio group'), value: 'Radio group' },
    ];
    if (collectionFieldCurrent?.interface === 'multipleSelect') {
      const index = optionsMuiltipleSelect.findIndex((item) => {
        return item.value === 'Radio group';
      });
      optionsMuiltipleSelect.splice(index, 1);
    }
    const dm = useDataSourceManager();
    const collectionInterface = dm.collectionFieldInterfaceManager.getFieldInterface(collectionFieldCurrent?.interface);
    const compile = useCompile();
    if (fieldSchema['x-component-props']['multiple']) {
      const index = fieldModeOptions.findIndex((item) => item.value === 'Radio group');
      fieldModeOptions.splice(index, 1);
    }

    const componentOptions = isMuiltipleSelect ? optionsMuiltipleSelect : fieldModeOptions;
    collectionInterface?.componentOptions
      ?.filter((item) => !item.useVisible || item.useVisible())
      ?.forEach((item) => {
        if (!componentOptions?.find((modeItem) => modeItem.value === item.value)) {
          componentOptions?.push({
            label: compile(item.label),
            value: item.value,
          });
        }
      });
    return {
      title: t('Field component'),
      options: componentOptions,
      value: fieldMode,
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

        void dn.emit('patch', {
          schema,
        });
        dn.refresh();
      },
    };
  },
};

export const CustomTitle = {
  name: 'customTitle',
  type: 'modal',
  useComponentProps() {
    const schema = useFieldSchema();
    const { fieldSchema: tableColumnSchema } = useColumnSchema();
    const fieldSchema = tableColumnSchema || schema;
    const { t } = useTranslation();
    const { dn } = useDesignable();
    const options = useFormulaTitleOptions();
    const def = fieldSchema['x-component-props']?.fieldNames?.formula;
    const field = useField();

    return {
      title: t('Custom option label'),
      schema: {
        type: 'object',
        title: t('Custom option label'),
        properties: {
          formula: {
            required: true,
            'x-decorator': 'FormItem',
            'x-component': 'Variable.TextArea',
            'x-component-props': {
              scope: options,
            },
            default: def,
          },
        },
      } as ISchema,
      onSubmit: ({ formula }) => {
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
          dn.emit('patch', {
            schema: {
              'x-uid': fieldSchema['x-uid'],
              'x-component-props': componentProps,
            },
          });
        }
        dn.refresh();
      },
    };
  },
};

export const selectComponentFieldSettings = new SchemaSettings({
  name: 'fieldSettings:component:Select',
  items: [
    {
      ...fieldComponent,
    },
    {
      ...setTheDataScope,
      useVisible() {
        const isSelectFieldMode = useIsSelectFieldMode();
        const isFieldReadPretty = useIsFieldReadPretty();
        return isSelectFieldMode && !isFieldReadPretty;
      },
    },
    {
      ...setDefaultSortingRules,
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
      ...quickCreate,
      useVisible() {
        const isAssociationField = useIsAssociationField();
        const readPretty = useIsFieldReadPretty();
        const { fieldSchema } = useColumnSchema();
        return isAssociationField && !fieldSchema && !readPretty;
      },
    },
    {
      ...allowMultiple,
      useVisible() {
        const isAssociationField = useIsAssociationField();
        const IsShowMultipleSwitch = useIsShowMultipleSwitch();
        return isAssociationField && IsShowMultipleSwitch();
      },
    },
    {
      ...titleField,
      useVisible: useIsAssociationField,
    },
    {
      ...enableLink,
      useVisible() {
        const readPretty = useIsFieldReadPretty();
        return useIsAssociationField() && readPretty;
      },
    },
  ],
});
