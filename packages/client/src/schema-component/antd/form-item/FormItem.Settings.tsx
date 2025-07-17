import React from 'react';
import { ArrayCollapse, FormLayout } from '@tachybase/components';
import { Field, ISchema, useField, useFieldSchema } from '@tachybase/schema';

import _ from 'lodash';
import { useTranslation } from 'react-i18next';

import { SchemaSettings } from '../../../application/schema-settings';
import { useFormBlockContext } from '../../../block-provider/FormBlockProvider';
import {
  Collection_deprecated,
  useCollection_deprecated,
  useCollectionField_deprecated,
  useCollectionManager_deprecated,
} from '../../../collection-manager';
import { useCollection, useCollectionManager } from '../../../data-source';
import { useRecord } from '../../../record-provider';
import { useColumnSchema } from '../../../schema-component/antd/table-v2/Table.Column.Decorator';
import { generalSettingsItems } from '../../../schema-items/GeneralSettings';
import { useFormulaTitleOptions } from '../../../schema-settings';
import { useIsAllowToSetDefaultValue } from '../../../schema-settings/hooks/useIsAllowToSetDefaultValue';
import { useIsShowMultipleSwitch } from '../../../schema-settings/hooks/useIsShowMultipleSwitch';
import { isPatternDisabled } from '../../../schema-settings/isPatternDisabled';
import { ActionType } from '../../../schema-settings/LinkageRules/type';
import { SchemaSettingsDataScope } from '../../../schema-settings/SchemaSettingsDataScope';
import { SchemaSettingsDateFormat } from '../../../schema-settings/SchemaSettingsDateFormat';
import { SchemaSettingsDefaultValue } from '../../../schema-settings/SchemaSettingsDefaultValue';
import { SchemaSettingsSortingRule } from '../../../schema-settings/SchemaSettingsSortingRule';
import { getShouldChange, VariableInput } from '../../../schema-settings/VariableInput/VariableInput';
import { useLocalVariables, useVariables } from '../../../variables';
import { useCompile, useDesignable, useFieldModeOptions } from '../../hooks';
import { isSubMode } from '../association-field/util';
import { removeNullCondition } from '../filter';
import { DynamicComponentProps } from '../filter/DynamicComponent';
import { getTempFieldState } from '../form-v2/utils';
import { useColorFields } from '../table-v2/Table.Column.Designer';

/**
 * @deprecated
 */
export const formItemSettings = new SchemaSettings({
  name: 'FormItemSettings',
  items: [
    ...(generalSettingsItems as any),
    {
      name: 'allowAddNewData',
      type: 'switch',
      useVisible() {
        const readPretty = useIsFieldReadPretty();
        const isAssociationField = useIsAssociationField();
        const fieldMode = useFieldMode();
        return !readPretty && isAssociationField && ['SubTable'].includes(fieldMode);
      },
      useComponentProps() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const fieldSchema = useFieldSchema();
        const { dn, refresh } = useDesignable();
        return {
          title: t('Allow add new'),
          checked: fieldSchema['x-component-props']?.allowAddnew !== (false as boolean),
          onChange(value) {
            const schema = {
              ['x-uid']: fieldSchema['x-uid'],
            };
            field.componentProps.allowAddnew = value;
            fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
            fieldSchema['x-component-props'].allowAddnew = value;
            schema['x-component-props'] = fieldSchema['x-component-props'];
            dn.emit('patch', {
              schema,
            });
            refresh();
          },
        };
      },
    },
    {
      name: 'allowSelectExistingRecord',
      type: 'switch',
      useVisible() {
        const readPretty = useIsFieldReadPretty();
        const isAssociationField = useIsAssociationField();
        const fieldMode = useFieldMode();
        return !readPretty && isAssociationField && ['SubTable'].includes(fieldMode);
      },
      useComponentProps() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const fieldSchema = useFieldSchema();
        const { dn, refresh } = useDesignable();
        return {
          title: t('Allow selection of existing records'),
          checked: fieldSchema['x-component-props']?.allowSelectExistingRecord,
          onChange(value) {
            const schema = {
              ['x-uid']: fieldSchema['x-uid'],
            };
            field.componentProps.allowSelectExistingRecord = value;
            fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
            fieldSchema['x-component-props'].allowSelectExistingRecord = value;
            schema['x-component-props'] = fieldSchema['x-component-props'];
            dn.emit('patch', {
              schema,
            });
            refresh();
          },
        };
      },
    },
    {
      name: 'quickUpload',
      type: 'switch',
      useVisible() {
        const isFileField = useIsFileField();
        const isFormReadPretty = useIsFormReadPretty();
        return !isFormReadPretty && isFileField;
      },
      useComponentProps() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const fieldSchema = useFieldSchema();
        const { dn, refresh } = useDesignable();
        return {
          title: t('Quick upload'),
          checked: fieldSchema['x-component-props']?.quickUpload !== (false as boolean),
          onChange(value) {
            const schema = {
              ['x-uid']: fieldSchema['x-uid'],
            };
            field.componentProps.quickUpload = value;
            fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
            fieldSchema['x-component-props'].quickUpload = value;
            schema['x-component-props'] = fieldSchema['x-component-props'];
            dn.emit('patch', {
              schema,
            });
            refresh();
          },
        };
      },
    },
    {
      name: 'selectFile',
      type: 'switch',
      useVisible() {
        const isFileField = useIsFileField();
        const isFormReadPretty = useIsFormReadPretty();
        return !isFormReadPretty && isFileField;
      },
      useComponentProps() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const fieldSchema = useFieldSchema();
        const { dn, refresh } = useDesignable();
        return {
          title: t('Select file'),
          checked: fieldSchema['x-component-props']?.selectFile !== (false as boolean),
          onChange(value) {
            const schema = {
              ['x-uid']: fieldSchema['x-uid'],
            };
            field.componentProps.selectFile = value;
            fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
            fieldSchema['x-component-props'].selectFile = value;
            schema['x-component-props'] = fieldSchema['x-component-props'];
            dn.emit('patch', {
              schema,
            });
            refresh();
          },
        };
      },
    },
    {
      name: 'validationRules',
      type: 'modal',
      useComponentProps() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const fieldSchema = useFieldSchema();
        const { dn, refresh } = useDesignable();
        const validateSchema = useValidateSchema();
        const { getCollectionJoinField } = useCollectionManager_deprecated();
        const { getField } = useCollection_deprecated();
        const collectionField =
          getField(fieldSchema['name']) || getCollectionJoinField(fieldSchema['x-collection-field']);
        return {
          title: t('Set validation rules'),
          components: { ArrayCollapse, FormLayout },
          schema: {
            type: 'object',
            title: t('Set validation rules'),
            properties: {
              rules: {
                type: 'array',
                default: fieldSchema?.['x-validator'],
                'x-component': 'ArrayCollapse',
                'x-decorator': 'FormItem',
                'x-component-props': {
                  accordion: true,
                },
                maxItems: 3,
                items: {
                  type: 'object',
                  'x-component': 'ArrayCollapse.CollapsePanel',
                  'x-component-props': {
                    header: '{{ t("Validation rule") }}',
                  },
                  properties: {
                    index: {
                      type: 'void',
                      'x-component': 'ArrayCollapse.Index',
                    },
                    layout: {
                      type: 'void',
                      'x-component': 'FormLayout',
                      'x-component-props': {
                        labelStyle: {
                          marginTop: '6px',
                        },
                        labelCol: 8,
                        wrapperCol: 16,
                      },
                      properties: {
                        ...validateSchema,
                        message: {
                          type: 'string',
                          title: '{{ t("Error message") }}',
                          'x-decorator': 'FormItem',
                          'x-component': 'Input.TextArea',
                          'x-component-props': {
                            autoSize: {
                              minRows: 2,
                              maxRows: 2,
                            },
                          },
                        },
                      },
                    },
                    remove: {
                      type: 'void',
                      'x-component': 'ArrayCollapse.Remove',
                    },
                    moveUp: {
                      type: 'void',
                      'x-component': 'ArrayCollapse.MoveUp',
                    },
                    moveDown: {
                      type: 'void',
                      'x-component': 'ArrayCollapse.MoveDown',
                    },
                  },
                },
                properties: {
                  add: {
                    type: 'void',
                    title: '{{ t("Add validation rule") }}',
                    'x-component': 'ArrayCollapse.Addition',
                    'x-reactions': {
                      dependencies: ['rules'],
                      fulfill: {
                        state: {
                          disabled: '{{$deps[0].length >= 3}}',
                        },
                      },
                    },
                  },
                },
              },
            },
          } as ISchema,
          onSubmit(v) {
            const rules = [];
            for (const rule of v.rules) {
              rules.push(_.pickBy(rule, _.identity));
            }
            const schema = {
              ['x-uid']: fieldSchema['x-uid'],
            };
            if (['percent'].includes(collectionField?.interface)) {
              for (const rule of rules) {
                if (!!rule.maxValue || !!rule.minValue) {
                  rule['percentMode'] = true;
                }

                if (rule.percentFormat) {
                  rule['percentFormats'] = true;
                }
              }
            }
            const concatValidator = _.concat([], collectionField?.uiSchema?.['x-validator'] || [], rules);
            field.validator = concatValidator;
            fieldSchema['x-validator'] = rules;
            schema['x-validator'] = rules;
            dn.emit('patch', {
              schema,
            });
            refresh();
          },
        };
      },
      useVisible() {
        const { form } = useFormBlockContext();
        const isFormReadPretty = useIsFormReadPretty();
        const validateSchema = useValidateSchema();
        return form && !isFormReadPretty && validateSchema;
      },
    },
    {
      name: 'isquickaddtabs',
      type: 'switch',
      useVisible() {
        const readPretty = useIsFieldReadPretty();
        const isAssociationField = useIsAssociationField();
        const fieldMode = useFieldMode();
        return !readPretty && isAssociationField && ['SubTable'].includes(fieldMode);
      },

      useComponentProps() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const fieldSchema = useFieldSchema();
        const { dn, refresh } = useDesignable();
        return {
          title: t('Is Quick Add Tabs'),
          checked: fieldSchema['x-component-props']?.isQuickAdd || false,
          onChange(value) {
            const schema = {
              ['x-uid']: fieldSchema['x-uid'],
            };
            field.componentProps['isQuickAdd'] = value;
            fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
            fieldSchema['x-component-props']['isQuickAdd'] = value;
            schema['x-component-props'] = fieldSchema['x-component-props'];
            dn.emit('patch', {
              schema,
            });
            refresh();
          },
        };
      },
    },
    {
      name: 'setquickaddtabs',
      type: 'select',
      useComponentProps() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const compile = useCompile();
        const fieldSchema = useFieldSchema();
        const cm = useCollectionManager();
        const options = cm.getCollection(fieldSchema['x-collection-field']);
        const defVal = fieldSchema['x-component-props']['quickAddField'] || 'none';
        const { dn } = useDesignable();
        const isAddNewForm = useIsAddNewForm();
        const fieldTabsOptions = options.fields
          .map((item) => {
            if (item.interface === 'm2o' || item.interface === 'select') {
              return {
                ...item,
                label: compile(item.uiSchema?.title),
                value: item.name,
              };
            }
          })
          .filter(Boolean);
        fieldTabsOptions.unshift({
          label: 'none',
          value: 'none',
        });
        return {
          title: t('Set Quick Add Tabs'),
          options: fieldTabsOptions,
          value: defVal,
          onChange(mode) {
            const schema = {
              ['x-uid']: fieldSchema['x-uid'],
            };
            fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
            fieldSchema['x-component-props']['quickAddField'] = {
              fieldInterface: fieldTabsOptions.find((item) => item.value === mode)['interface'] || 'none',
              value: mode,
            };
            schema['x-component-props'] = fieldSchema['x-component-props'];
            field.componentProps = field.componentProps || {};
            field.componentProps['quickAddField'] = fieldSchema['x-component-props']['quickAddField'];

            // 子表单状态不允许设置默认值
            if (isSubMode(fieldSchema) && isAddNewForm) {
              // @ts-ignore
              schema.default = null;
              fieldSchema.default = null;
              field.setInitialValue(null);
              field.setValue(null);
            }

            void dn.emit('patch', {
              schema,
            });
            dn.refresh();
          },
        };
      },
      useVisible() {
        const fieldSchema = useFieldSchema();
        return fieldSchema['x-component-props']['isQuickAdd'];
      },
    },
    {
      name: 'setquickaddparenttabs',
      type: 'select',
      useComponentProps() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const compile = useCompile();
        const fieldSchema = useFieldSchema();
        const cm = useCollectionManager();
        const { value: quickField } = fieldSchema['x-component-props']?.['quickAddField'] || {};
        const options = cm.getCollectionFields(`${fieldSchema['x-collection-field']}.${quickField}`);
        const { dn } = useDesignable();
        const isAddNewForm = useIsAddNewForm();
        const fieldTabsOptions = options
          .map((item) => {
            if (item.interface === 'm2o')
              return {
                ...item,
                label: compile(item.uiSchema.title),
                value: item.name,
              };
          })
          .filter(Boolean);
        fieldTabsOptions.unshift({
          label: t('none'),
          value: 'none',
        });
        const defValue = fieldSchema['x-component-props']?.['quickAddParentCollection']?.value || 'none';
        return {
          title: t('Set Quick Add Parent Tabs'),
          options: fieldTabsOptions,
          value: defValue,
          onChange(mode) {
            const schema = {
              ['x-uid']: fieldSchema['x-uid'],
            };
            fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
            fieldSchema['x-component-props']['quickAddParentCollection'] = {
              collectionField: `${fieldSchema['x-collection-field']}.${quickField}.${mode}`,
              value: mode,
            };
            schema['x-component-props'] = fieldSchema['x-component-props'];
            field.componentProps = field.componentProps || {};
            field.componentProps['quickAddParentCollection'] = {
              collectionField: `${fieldSchema['x-collection-field']}.${quickField}.${mode}`,
              value: mode,
            };
            // 子表单状态不允许设置默认值
            if (isSubMode(fieldSchema) && isAddNewForm) {
              // @ts-ignore
              schema.default = null;
              fieldSchema.default = null;
              field.setInitialValue(null);
              field.setValue(null);
            }
            void dn.emit('patch', {
              schema,
            });
            dn.refresh();
          },
        };
      },
      useVisible() {
        const fieldSchema = useFieldSchema();
        return (
          fieldSchema['x-component-props']['isQuickAdd'] &&
          fieldSchema['x-component-props']['quickAddField'] &&
          fieldSchema['x-component-props']['quickAddField'] !== 'none'
        );
      },
    },
    {
      name: 'defaultValue',
      Component: SchemaSettingsDefaultValue,
      useVisible() {
        const { isAllowToSetDefaultValue } = useIsAllowToSetDefaultValue();
        return isAllowToSetDefaultValue();
      },
    },
    {
      name: 'dataScope',
      Component: SchemaSettingsDataScope,
      useVisible() {
        const isSelectFieldMode = useIsSelectFieldMode();
        const isFormReadPretty = useIsFormReadPretty();
        return isSelectFieldMode && !isFormReadPretty;
      },
      useComponentProps() {
        const { getCollectionJoinField, getAllCollectionsInheritChain } = useCollectionManager_deprecated();
        const { getField } = useCollection_deprecated();
        const { form } = useFormBlockContext();
        const record = useRecord();
        const field = useField();
        const fieldSchema = useFieldSchema();
        const collectionField =
          getField(fieldSchema['name']) || getCollectionJoinField(fieldSchema['x-collection-field']);
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
            _.set(field.componentProps, 'service.params.filter', filter);
            fieldSchema['x-component-props'] = field.componentProps;
            dn.emit('patch', {
              schema: {
                ['x-uid']: fieldSchema['x-uid'],
                'x-component-props': field.componentProps,
              },
            });
          },
        };
      },
    },
    {
      name: 'sortingRule',
      Component: SchemaSettingsSortingRule,
      useVisible() {
        const isSelectFieldMode = useIsSelectFieldMode();
        const isFormReadPretty = useIsFormReadPretty();
        return isSelectFieldMode && !isFormReadPretty;
      },
    },
    {
      name: 'fieldMode',
      type: 'select',
      useComponentProps() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const fieldSchema = useFieldSchema();
        const { dn } = useDesignable();
        const fieldModeOptions = useFieldModeOptions();
        const isAddNewForm = useIsAddNewForm();
        const fieldMode = useFieldMode();

        return {
          title: t('Field component'),
          options: fieldModeOptions,
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
              field.setInitialValue(null);
              field.setValue(null);
            }

            void dn.emit('patch', {
              schema,
            });
            dn.refresh();
          },
        };
      },
      useVisible: useShowFieldMode,
    },
    {
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
                default: def || '',
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
                appends: [fieldSchema['name']],
              };
              const regex = /{{(.*?)}}/g;
              let match;
              while ((match = regex.exec(formula))) {
                if (match[1].includes('.')) {
                  const matchList = match[1].split('.');
                  let appendsValue = fieldSchema['name'];
                  matchList.forEach((item, index) => {
                    if (index === matchList.length - 1) return;
                    appendsValue += '.' + item;
                    componentProps.appends.push(appendsValue);
                  });
                }
              }
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
      useVisible: () => {
        const fieldSchema = useFieldSchema();
        const formula = fieldSchema['x-component-props'].mode === 'CustomTitle';
        return useShowFieldMode() && formula;
      },
    },
    {
      name: 'popupSize',
      type: 'select',
      useComponentProps() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const fieldSchema = useFieldSchema();
        const { dn } = useDesignable();
        return {
          title: t('Popup size'),
          options: [
            { label: t('Small'), value: 'small' },
            { label: t('Middle'), value: 'middle' },
            { label: t('Large'), value: 'large' },
          ],
          value: fieldSchema?.['x-component-props']?.['openSize'] ?? 'middle',
          onChange: (value) => {
            field.componentProps.openSize = value;
            fieldSchema['x-component-props'] = field.componentProps;
            dn.emit('patch', {
              schema: {
                'x-uid': fieldSchema['x-uid'],
                'x-component-props': fieldSchema['x-component-props'],
              },
            });
            dn.refresh();
          },
        };
      },
      useVisible() {
        const showFieldMode = useShowFieldMode();
        const fieldSchema = useFieldSchema();
        const isPickerMode = fieldSchema['x-component-props']?.mode === 'Picker';
        const showModeSelect = showFieldMode && isPickerMode;
        return showModeSelect;
      },
    },
    {
      name: 'allowAddNew',
      type: 'switch',
      useVisible() {
        const readPretty = useIsFieldReadPretty();
        const isAssociationField = useIsAssociationField();
        const fieldMode = useFieldMode();
        return !readPretty && isAssociationField && ['Picker'].includes(fieldMode);
      },
      useComponentProps() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const fieldSchema = useFieldSchema();
        const { dn, refresh, insertAdjacent } = useDesignable();
        return {
          title: t('Allow add new data'),
          checked: fieldSchema['x-add-new'] as boolean,
          onChange(allowAddNew) {
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
                'x-toolbar': 'ActionSchemaToolbar',
                'x-settings': 'actonSettings:addNew',
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
            const schema = {
              ['x-uid']: fieldSchema['x-uid'],
            };
            field['x-add-new'] = allowAddNew;
            fieldSchema['x-add-new'] = allowAddNew;
            schema['x-add-new'] = allowAddNew;
            dn.emit('patch', {
              schema,
            });
            refresh();
          },
        };
      },
    },
    {
      name: 'addMode',
      type: 'select',
      useVisible() {
        const readPretty = useIsFieldReadPretty();
        const isAssociationField = useIsAssociationField();
        const fieldMode = useFieldMode();
        return !readPretty && isAssociationField && ['Select'].includes(fieldMode);
      },
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
                  'x-toolbar': 'ActionSchemaToolbar',
                  'x-settings': 'actonSettings:addNew',
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
    },
    {
      name: 'multiple',
      type: 'switch',
      useVisible() {
        const isAssociationField = useIsAssociationField();
        const IsShowMultipleSwitch = useIsShowMultipleSwitch();
        return isAssociationField && IsShowMultipleSwitch();
      },
      useComponentProps() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const fieldSchema = useFieldSchema();
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
    },
    {
      name: 'allowDissociate',
      type: 'switch',
      useVisible() {
        const IsShowMultipleSwitch = useIsShowMultipleSwitch();
        const fieldSchema = useFieldSchema();
        const isSubFormMode = fieldSchema['x-component-props']?.mode === 'Nester';
        return isSubFormMode && IsShowMultipleSwitch();
      },
      useComponentProps() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const fieldSchema = useFieldSchema();
        const { dn, refresh } = useDesignable();
        return {
          title: t('Allow dissociate'),
          checked: fieldSchema['x-component-props']?.allowDissociate !== false,
          onChange(value) {
            const schema = {
              ['x-uid']: fieldSchema['x-uid'],
            };
            fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
            field.componentProps = field.componentProps || {};

            fieldSchema['x-component-props'].allowDissociate = value;
            field.componentProps.allowDissociate = value;

            schema['x-component-props'] = fieldSchema['x-component-props'];
            dn.emit('patch', {
              schema,
            });
            refresh();
          },
        };
      },
    },
    {
      name: 'enableLink',
      type: 'switch',
      useVisible() {
        const options = useTitleFieldOptions();
        const readPretty = useIsFieldReadPretty();
        const isFileField = useIsFileField();

        const fieldSchema = useFieldSchema();
        return readPretty && options.length > 0 && !isFileField && fieldSchema['x-component'] === 'CollectionField';
      },
      useComponentProps() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const fieldSchema = useFieldSchema();
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
    },
    {
      name: 'pattern',
      type: 'select',
      useVisible() {
        const { form } = useFormBlockContext();
        const fieldSchema = useFieldSchema();
        return form && !form?.readPretty && !isPatternDisabled(fieldSchema);
      },
      useComponentProps() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const fieldSchema = useFieldSchema();
        const { dn } = useDesignable();
        let readOnlyMode = 'editable';
        if (fieldSchema['x-disabled'] === true) {
          readOnlyMode = 'readonly';
        }
        if (fieldSchema['x-read-pretty'] === true) {
          readOnlyMode = 'read-pretty';
        }
        return {
          title: t('Pattern'),
          options: [
            { label: t('Editable'), value: 'editable' },
            { label: t('Readonly'), value: 'readonly' },
            { label: t('Easy-reading'), value: 'read-pretty' },
          ],
          value: readOnlyMode,
          onChange(v) {
            const schema: ISchema = {
              ['x-uid']: fieldSchema['x-uid'],
            };

            switch (v) {
              case 'readonly': {
                fieldSchema['x-read-pretty'] = false;
                fieldSchema['x-disabled'] = true;
                schema['x-read-pretty'] = false;
                schema['x-disabled'] = true;
                field.readPretty = false;
                field.disabled = true;
                _.set(field, 'initStateOfLinkageRules.pattern', getTempFieldState(true, ActionType.ReadOnly));
                break;
              }
              case 'read-pretty': {
                fieldSchema['x-read-pretty'] = true;
                fieldSchema['x-disabled'] = false;
                schema['x-read-pretty'] = true;
                schema['x-disabled'] = false;
                field.readPretty = true;
                _.set(field, 'initStateOfLinkageRules.pattern', getTempFieldState(true, ActionType.ReadPretty));
                break;
              }
              default: {
                fieldSchema['x-read-pretty'] = false;
                fieldSchema['x-disabled'] = false;
                schema['x-read-pretty'] = false;
                schema['x-disabled'] = false;
                field.readPretty = false;
                field.disabled = false;
                _.set(field, 'initStateOfLinkageRules.pattern', getTempFieldState(true, ActionType.Editable));
                break;
              }
            }

            dn.emit('patch', {
              schema,
            });

            dn.refresh();
          },
        };
      },
    },
    {
      name: 'titleField',
      type: 'select',
      useVisible() {
        const options = useTitleFieldOptions();
        const isAssociationField = useIsAssociationField();
        const fieldMode = useFieldMode();
        return options.length > 0 && isAssociationField && fieldMode !== 'SubTable' && fieldMode !== 'CustomTitle';
      },
      useComponentProps() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const fieldSchema = useFieldSchema();
        const { dn } = useDesignable();
        const options = useTitleFieldOptions();
        const collectionField = useCollectionField_deprecated();
        return {
          title: t('Title field'),
          options,
          value: field?.componentProps?.fieldNames?.label,
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
            dn.emit('patch', {
              schema,
            });
            dn.refresh();
          },
        };
      },
    },
    {
      name: 'dateFormat',
      Component: SchemaSettingsDateFormat,
      useVisible() {
        const collectionField = useFormItemCollectionField();
        const isDateField = ['datetime', 'createdAt', 'updatedAt'].includes(collectionField?.interface);
        return isDateField;
      },
      useComponentProps() {
        const fieldSchema = useFieldSchema();
        return {
          fieldSchema,
        };
      },
    },
    {
      name: 'size',
      type: 'select',
      useVisible() {
        const readPretty = useIsFieldReadPretty();
        const collectionField = useFormItemCollectionField();
        const { getCollection } = useCollectionManager_deprecated();
        const targetCollection = getCollection(collectionField?.target);
        const isAttachmentField =
          ['attachment'].includes(collectionField?.interface) || targetCollection?.template === 'file';
        return readPretty && isAttachmentField;
      },
      useComponentProps() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const fieldSchema = useFieldSchema();
        const { dn } = useDesignable();
        return {
          title: t('Size'),
          options: [
            { label: t('Large'), value: 'large' },
            { label: t('Default'), value: 'default' },
            { label: t('Small'), value: 'small' },
          ],
          value: field?.componentProps?.size || 'default',
          onChange(size) {
            const schema = {
              ['x-uid']: fieldSchema['x-uid'],
            };
            fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
            fieldSchema['x-component-props']['size'] = size;
            schema['x-component-props'] = fieldSchema['x-component-props'];
            field.componentProps = field.componentProps || {};
            field.componentProps.size = size;
            dn.emit('patch', {
              schema,
            });
            dn.refresh();
          },
        };
      },
    },
    {
      name: 'tagColor',
      type: 'select',
      useVisible() {
        const isAssociationField = useIsAssociationField();
        const fieldMode = useFieldMode();
        return isAssociationField && ['Tag'].includes(fieldMode);
      },
      useComponentProps() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const fieldSchema = useFieldSchema();
        const { dn } = useDesignable();
        const collectionField = useFormItemCollectionField();
        const colorFieldOptions = useColorFields(collectionField?.target ?? collectionField?.targetCollection);
        return {
          title: t('Tag color field'),
          options: colorFieldOptions,
          value: field?.componentProps?.tagColorField,
          onChange(tagColorField) {
            const schema = {
              ['x-uid']: fieldSchema['x-uid'],
            };

            fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
            fieldSchema['x-component-props']['tagColorField'] = tagColorField;
            schema['x-component-props'] = fieldSchema['x-component-props'];
            field.componentProps.tagColorField = tagColorField;
            dn.emit('patch', {
              schema,
            });
            dn.refresh();
          },
        };
      },
    },
    {
      name: 'divider',
      type: 'divider',
      useVisible() {
        const collectionField = useFormItemCollectionField();
        return !!collectionField;
      },
    },
    {
      name: 'remove',
      type: 'remove',
      useComponentProps() {
        const { t } = useTranslation();

        return {
          removeParentsIfNoChildren: true,
          confirm: {
            title: t('Delete field'),
          },
          breakRemoveOn: {
            'x-component': 'Grid',
          },
        };
      },
    },
  ],
});

export function useIsAddNewForm() {
  const record = useRecord();
  const isAddNewForm = _.isEmpty(_.omit(record, ['__parent', '__collectionName']));

  return isAddNewForm;
}

function isFileCollection(collection: Collection_deprecated) {
  return collection?.template === 'file';
}

export function useIsFormReadPretty() {
  const { form } = useFormBlockContext();
  return !!form?.readPretty;
}

export function useIsFieldReadPretty() {
  const { fieldSchema: tableColumnSchema } = useColumnSchema();
  const field = useField<Field>();
  return field.readPretty || tableColumnSchema?.['x-read-pretty'];
}

/**
 * 获取字段相关的配置信息
 * @returns
 */
function useFormItemCollectionField() {
  const { getCollectionJoinField } = useCollectionManager_deprecated();
  const { getField } = useCollection_deprecated();
  const fieldSchema = useFieldSchema();
  const collectionField = getField(fieldSchema['name']) || getCollectionJoinField(fieldSchema['x-collection-field']);
  const { collectionField: columnCollectionField } = useColumnSchema();
  return collectionField || columnCollectionField;
}

export function useIsAssociationField() {
  const collectionField = useFormItemCollectionField();
  const isAssociationField = ['obo', 'oho', 'o2o', 'o2m', 'm2m', 'm2o', 'updatedBy', 'createdBy'].includes(
    collectionField?.interface,
  );
  return isAssociationField;
}

export function useIsMultipleSelect() {
  const collectionField = useFormItemCollectionField();
  const isMultipleSelect = ['select', 'radioGroup'].includes(collectionField?.interface);
  return isMultipleSelect;
}

export function useIsMuiltipleAble() {
  const isAssociationField = useIsAssociationField();
  const isMultipleSelect = useIsMultipleSelect();
  return isAssociationField || isMultipleSelect;
}

export function useIsFileField() {
  const { getCollection } = useCollectionManager_deprecated();
  const collectionField = useFormItemCollectionField();
  const targetCollection = getCollection(collectionField?.target);
  const isFileField = isFileCollection(targetCollection as any);
  return isFileField;
}

export function useFieldMode() {
  const field = useField<Field>();
  const isFileField = useIsFileField();
  const fieldMode = field?.componentProps?.['mode'] || (isFileField ? 'FileManager' : 'Select');
  return fieldMode;
}

export function useIsSelectFieldMode() {
  const fieldMode = useFieldMode();
  const isAssociationField = useIsAssociationField();
  const isSelectFieldMode = isAssociationField && (fieldMode === 'Select' || fieldMode === 'CustomTitle');
  return isSelectFieldMode;
}

export function useValidateSchema() {
  const { getInterface } = useCollectionManager_deprecated();
  const fieldSchema = useFieldSchema();
  const collectionField = useFormItemCollectionField();
  const interfaceConfig = getInterface(collectionField?.interface);
  const validateSchema = interfaceConfig?.['validateSchema']?.(fieldSchema);
  return validateSchema;
}

function useShowFieldMode() {
  const fieldSchema = useFieldSchema();
  const fieldModeOptions = useFieldModeOptions();
  const isTableField = fieldSchema['x-component'] === 'TableField';
  const isAssociationField = useIsAssociationField();
  const showFieldMode = isAssociationField && fieldModeOptions && !isTableField;
  return showFieldMode;
}

export function useTitleFieldOptions() {
  const { getCollectionFields, isTitleField } = useCollectionManager_deprecated();
  const compile = useCompile();
  const collectionField = useFormItemCollectionField();
  const targetFields = collectionField?.target
    ? getCollectionFields(collectionField?.target)
    : (getCollectionFields(collectionField?.targetCollection) ?? []);
  const options = targetFields.map((field) => ({
    value: field?.name,
    label: compile(field?.uiSchema?.title) || field?.name,
  }));
  return options;
}
