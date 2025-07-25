import { useState } from 'react';
import { ArrayItems, Switch } from '@tachybase/components';
import { createForm, Field, ISchema, useField, useFieldSchema, useForm } from '@tachybase/schema';

import { useTranslation } from 'react-i18next';

import { EditableSchemaSettings } from '../../../../application/schema-settings-editable';
import { useCollectionManager_deprecated, useSortFields } from '../../../../collection-manager';
import { useFieldComponentName } from '../../../../common/useFieldComponentName';
import { useCollectionManager } from '../../../../data-source';
import { useActionContext, useCompile, useFieldModeOptions, useIsAddNewForm } from '../../../../schema-component';
import { isSubMode } from '../../../../schema-component/antd/association-field/util';
import { useIsAssociationField, useIsFieldReadPretty } from '../../../../schema-component/antd/form-item';
import { SecondLevelSelect } from './secondLevelSelect';

export const subTablePopoverComponentFieldEditableSettings = new EditableSchemaSettings({
  name: 'editableFieldSettings:component:SubTable',
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
      name: 'allowAddNewData',
      useVisible() {
        const readPretty = useIsFieldReadPretty();
        const isAssociationField = useIsAssociationField();
        return !readPretty && isAssociationField;
      },
      useSchema() {
        const field = useField<Field>();
        const fieldSchema = useFieldSchema();
        return {
          type: 'boolean',
          default: fieldSchema['x-component-props']?.allowAddnew !== (false as boolean),
          'x-decorator': 'FormItem',
          'x-component': 'Checkbox',
          'x-content': '{{t("Allow add new")}}',
          'x-component-props': {
            onInput(e) {
              const value = e?.target?.checked ?? false;
              const schema = {
                ['x-uid']: fieldSchema['x-uid'],
              };
              field.componentProps.allowAddnew = value;
              fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
              fieldSchema['x-component-props'].allowAddnew = value;
              schema['x-component-props'] = fieldSchema['x-component-props'];
            },
          },
        };
      },
    },
    {
      name: 'allowSelectExistingRecord',
      useVisible() {
        const readPretty = useIsFieldReadPretty();
        return !readPretty;
      },
      useSchema() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const fieldSchema = useFieldSchema();
        return {
          type: 'boolean',
          default: fieldSchema['x-component-props']?.allowSelectExistingRecord,
          'x-decorator': 'FormItem',
          'x-component': 'Checkbox',
          'x-content': '{{t("Allow selection of existing records")}}',
          'x-component-props': {
            onInput(e) {
              const value = e?.target?.checked ?? false;
              const schema = {
                ['x-uid']: fieldSchema['x-uid'],
              };
              field.componentProps.allowSelectExistingRecord = value;
              fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
              fieldSchema['x-component-props'].allowSelectExistingRecord = value;
              schema['x-component-props'] = fieldSchema['x-component-props'];
            },
          },
        };
      },
    },
    {
      name: 'SetDefaultSortingRules',
      useVisible() {
        const { getCollectionJoinField } = useCollectionManager_deprecated();
        const fieldSchema = useFieldSchema();
        const association = fieldSchema['x-collection-field'];
        const { interface: targetInterface } = getCollectionJoinField(association) || {};
        const readPretty = useIsFieldReadPretty();
        return readPretty && ['m2m', 'o2m'].includes(targetInterface);
      },
      useSchema() {
        const { getCollectionJoinField } = useCollectionManager_deprecated();
        const field = useField();
        const fieldSchema = useFieldSchema();
        const association = fieldSchema['x-collection-field'];
        const { target } = getCollectionJoinField(association) || {};
        const sortFields = useSortFields(target);
        const { t } = useTranslation();
        const defaultSort = field.componentProps.sortArr || [];
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
        const modalForm = createForm({
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
                form: modalForm,
              },
              properties: {
                sort: {
                  type: 'array',
                  'x-component': ArrayItems,
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
                            field.componentProps.sortArr = sortArr;
                            fieldSchema['x-component-props'].sortArr = sortArr;
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
      name: 'clicktoselect',
      useVisible() {
        const readPretty = useIsFieldReadPretty();
        const isAssociationField = useIsAssociationField();
        return !readPretty && isAssociationField;
      },
      useSchema() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const fieldSchema = useFieldSchema();
        const compile = useCompile();
        const cm = useCollectionManager();
        const [firstLevelValue, setFirstLevelValue] = useState(
          fieldSchema['x-component-props']['quickAddField']?.value || 'none',
        );
        const options = cm.getCollection(fieldSchema['x-collection-field']);
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
        const Parentoptions = cm.getCollectionFields(`${fieldSchema['x-collection-field']}.${firstLevelValue}`);
        const fieldParentTabsOptions = Parentoptions.map((item) => {
          if (item.interface === 'm2o')
            return {
              ...item,
              label: compile(item.uiSchema.title),
              value: item.name,
            };
        }).filter(Boolean);
        fieldParentTabsOptions.unshift({
          label: t('none'),
          value: 'none',
        });
        const defParentVal = fieldSchema['x-component-props']?.['quickAddParentCollection']?.value || 'none';
        const modalForm = createForm({
          initialValues: {
            isquickaddtabs: fieldSchema['x-component-props']?.isQuickAdd || false,
            firstLevelselection: firstLevelValue,
            secondLevelselection: defParentVal,
          },
        });
        return {
          type: 'object',
          title: t('Quick create'),
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
              title: t('Quick create'),
              'x-decorator': 'FormV2',
              'x-decorator-props': {
                componentType: 'div',
                form: modalForm,
              },
              properties: {
                isquickaddtabs: {
                  title: t('Enable quick create'),
                  type: 'boolean',
                  'x-decorator': 'FormItem',
                  'x-component': Switch,
                  'x-component-props': {},
                },
                firstLevelselection: {
                  title: t('Set Quick Add Tabs'),
                  'x-decorator': 'FormItem',
                  'x-component': 'Select',
                  enum: fieldTabsOptions,
                  'x-reactions': [
                    {
                      dependencies: ['isquickaddtabs'],
                      fulfill: {
                        state: {
                          visible: '{{$deps[0] === true}}',
                        },
                      },
                    },
                  ],
                  'x-component-props': {
                    onChange(value) {
                      setFirstLevelValue(value);
                    },
                  },
                },
                secondLevelselection: {
                  title: t('Set Quick Add Parent Tabs'),
                  'x-decorator': 'FormItem',
                  'x-component': SecondLevelSelect,
                  'x-reactions': [
                    {
                      dependencies: ['firstLevelselection', 'isquickaddtabs'],
                      fulfill: {
                        state: {
                          visible: '{{$deps[0] !== "none" && $deps[1] === true}}',
                        },
                        schema: {
                          'x-component-props': {
                            firstLevelValue: '{{$deps[0]}}',
                            collectionField: fieldSchema['x-collection-field'],
                          },
                        },
                      },
                    },
                  ],
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
                            const { isquickaddtabs, firstLevelselection, secondLevelselection } = form.values;
                            const schema = {
                              ['x-uid']: fieldSchema['x-uid'],
                            };
                            field.componentProps['isQuickAdd'] = isquickaddtabs;
                            fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
                            fieldSchema['x-component-props']['isQuickAdd'] = isquickaddtabs;
                            schema['x-component-props'] = fieldSchema['x-component-props'];
                            fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
                            fieldSchema['x-component-props']['quickAddField'] = {
                              fieldInterface:
                                fieldTabsOptions.find((item) => item.value === firstLevelselection)?.['interface'] ||
                                'none',
                              value: firstLevelselection,
                            };
                            schema['x-component-props'] = fieldSchema['x-component-props'];
                            field.componentProps = field.componentProps || {};
                            field.componentProps['quickAddField'] = fieldSchema['x-component-props']['quickAddField'];

                            fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
                            fieldSchema['x-component-props']['quickAddParentCollection'] = {
                              collectionField: `${fieldSchema['x-collection-field']}.${firstLevelselection}.${secondLevelselection}`,
                              value: secondLevelselection,
                            };
                            schema['x-component-props'] = fieldSchema['x-component-props'];
                            field.componentProps = field.componentProps || {};
                            field.componentProps['quickAddParentCollection'] = {
                              collectionField: `${fieldSchema['x-collection-field']}.${firstLevelselection}.${secondLevelselection}`,
                              value: secondLevelselection,
                            };

                            // 子表单状态不允许设置默认值
                            if (isSubMode(fieldSchema) && isAddNewForm) {
                              // @ts-ignore
                              schema.default = null;
                              fieldSchema.default = null;
                              field.setInitialValue(null);
                              field.setValue(null);
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
  ],
});
