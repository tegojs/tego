import { useCallback, useMemo } from 'react';
import { ArrayCollapse, FormLayout } from '@tachybase/components';
import { createForm, Field, ISchema, Schema, useField, useFieldSchema, useForm } from '@tachybase/schema';

import { createStyles } from 'antd-style';
import { DefaultOptionType } from 'antd/lib/cascader';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';

import { useApp, useSchemaToolbar } from '../../../../application';
import { EditableSchemaSettings } from '../../../../application/schema-settings-editable';
import { useFormBlockContext, useTableBlockContext } from '../../../../block-provider';
import { useCollection_deprecated, useCollectionManager_deprecated } from '../../../../collection-manager';
import { useCollectionFilterOptionsV2 } from '../../../../collection-manager/action-hooks';
import { useContextConfigSetting } from '../../../../data-source';
import { FlagProvider, useFlag } from '../../../../flag-provider';
import { useRecord } from '../../../../record-provider';
import { FormProvider, SchemaComponent, useActionContext, useValidateSchema } from '../../../../schema-component';
import { useIsFormReadPretty } from '../../../../schema-component/antd/form-item/FormItem.Settings';
import { getTempFieldState } from '../../../../schema-component/antd/form-v2/utils';
import { findParentFieldSchema, getShouldChange, isPatternDisabled, VariableInput } from '../../../../schema-settings';
import { ActionType } from '../../../../schema-settings/LinkageRules/type';
import { formatVariableScop } from '../../../../schema-settings/VariableInput/utils/formatVariableScop';
import { isVariable, useLocalVariables, useVariables } from '../../../../variables';

const useStyles = createStyles(({ css }) => {
  return {
    defaultInput: css`
      & > .tb-form-item {
        flex: 1;
      }
    `,
  };
});

interface Option extends DefaultOptionType {
  key?: string | number;
  value?: string | number;
  label: React.ReactNode;
  disabled?: boolean;
  children?: Option[];
  // 标记是否为叶子节点，设置了 `loadData` 时有效
  // 设为 `false` 时会强制标记为父节点，即使当前节点没有 children，也会显示展开图标
  isLeaf?: boolean;
  /** 当开启异步加载时有效，用于加载当前 node 的 children */
  loadChildren?(option: Option): Promise<void>;
  field?: FieldOption;
  depth?: number;
}

export interface FieldOption {
  name?: string;
  type?: string;
  target?: string;
  title?: string;
  schema?: Schema;
  interface?: string;
  operators?: Operator[];
  children?: FieldOption[];
}

interface Operator {
  label: string;
  value: string;
}

export const formItemFieldEditableSettings = new EditableSchemaSettings({
  name: 'editableFieldSettings:FormItem',
  items: [
    {
      name: 'editFieldTitle',
      useSchema() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const fieldSchema = useFieldSchema();
        const { getCollectionJoinField } = useCollectionManager_deprecated();
        const { getField } = useCollection_deprecated();
        const collectionField =
          getField(fieldSchema['name']) || getCollectionJoinField(fieldSchema['x-collection-field']);

        return {
          type: 'string',
          title: t('Edit field title'),
          default: field?.title,
          description: `${t('Original field title: ')}${collectionField?.uiSchema?.title}`,
          'x-decorator': 'FormItem',
          'x-component': 'Input',
          'x-component-props': {
            onChange(e) {
              const tempTitle = e?.target?.value;
              field.title = tempTitle;
              fieldSchema.title = tempTitle;
            },
          },
        };
      },
    },
    {
      name: 'displayTitle',
      useSchema() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const fieldSchema = useFieldSchema();
        return {
          type: 'boolean',
          default: fieldSchema['x-decorator-props']?.['showTitle'] ?? true,
          'x-decorator': 'FormItem',
          'x-component': 'Checkbox',
          'x-content': '{{t("Display title")}}',
          'x-component-props': {
            onInput: (e) => {
              const checked = e?.target?.checked ?? false;
              fieldSchema['x-decorator-props'] = fieldSchema['x-decorator-props'] || {};
              fieldSchema['x-decorator-props']['showTitle'] = checked;
              field.decoratorProps.showTitle = checked;
            },
          },
        };
      },
    },
    {
      name: 'editDescription',
      useSchema() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const fieldSchema = useFieldSchema();
        return {
          type: 'string',
          title: t('Edit description'),
          default: field?.description,
          'x-decorator': 'FormItem',
          'x-component': 'Input',
          'x-component-props': {
            onChange(e) {
              const description = e?.target?.value;
              field.description = description;
              fieldSchema.description = description;
            },
          },
        };
      },
    },
    {
      name: 'editTooltip',
      useSchema() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const fieldSchema = useFieldSchema();
        return {
          type: 'string',
          title: t('Edit tooltip'),
          default: fieldSchema?.['x-decorator-props']?.tooltip,
          'x-decorator': 'FormItem',
          'x-component': 'Input',
          'x-component-props': {
            onChange(e) {
              const tooltip = e?.target?.value;
              field.decoratorProps.tooltip = tooltip;
              fieldSchema['x-decorator-props'] = fieldSchema['x-decorator-props'] || {};
              fieldSchema['x-decorator-props']['tooltip'] = tooltip;
            },
          },
        };
      },
    },
    {
      name: 'required',
      useVisible() {
        const field = useField<Field>();
        const fieldSchema = useFieldSchema();
        const { required = true } = useSchemaToolbar();
        return !field.readPretty && fieldSchema['x-component'] !== 'FormField' && required;
      },
      useSchema() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const fieldSchema = useFieldSchema();
        return {
          type: 'boolean',
          default: fieldSchema.required as boolean,
          'x-decorator': 'FormItem',
          'x-component': 'Checkbox',
          'x-content': '{{t("Required")}}',
          'x-component-props': {
            onInput: (e) => {
              const required = e?.target?.checked ?? false;
              const schema = {
                ['x-uid']: fieldSchema['x-uid'],
              };
              field.required = required;
              fieldSchema['required'] = required;
              schema['required'] = required;
            },
          },
        };
      },
    },
    {
      name: 'setDefaultValue',
      components: {
        ArrayCollapse,
        FormLayout,
        VariableInput: (props) => {
          const { isInSubForm, isInSubTable } = useFlag() || {};
          return (
            <FlagProvider isInSubForm={isInSubForm} isInSubTable={isInSubTable} isInSetDefaultValueDialog>
              <VariableInput {...props} />
            </FlagProvider>
          );
        },
      },
      useSchema() {
        const { styles } = useStyles();
        const fieldSchema = useFieldSchema();
        const field: Field = useField();
        const { t } = useTranslation();
        const actionCtx = useActionContext();
        let targetField;
        const { getField } = useCollection_deprecated();
        const { getCollectionJoinField, getCollectionFields, getAllCollectionsInheritChain } =
          useCollectionManager_deprecated();
        const variables = useVariables();
        const localVariables = useLocalVariables();
        const collection = useCollection_deprecated();
        const record = useRecord();
        const { form } = useFormBlockContext();
        const { getFields } = useCollectionFilterOptionsV2(collection);

        const { name } = collection;
        const collectionField = useMemo(
          () => getField(fieldSchema['name']) || getCollectionJoinField(fieldSchema['x-collection-field']),
          [fieldSchema, getCollectionJoinField, getField],
        );
        const fieldSchemaWithoutRequired = _.omit(fieldSchema, 'required');

        if (collectionField?.target) {
          targetField = getCollectionJoinField(
            `${collectionField.target}.${fieldSchema['x-component-props']?.fieldNames?.label || 'id'}`,
          );
        }

        const parentFieldSchema = collectionField?.interface === 'm2o' && findParentFieldSchema(fieldSchema);
        const parentCollectionField =
          parentFieldSchema && getCollectionJoinField(parentFieldSchema?.['x-collection-field']);
        const tableCtx = useTableBlockContext();
        const isAllowContextVariable =
          actionCtx?.fieldSchema?.['x-action'] === 'customize:create' &&
          (collectionField?.interface === 'm2m' ||
            (parentCollectionField?.type === 'hasMany' && collectionField?.interface === 'm2o'));
        const returnScope = useCallback(
          (scope: Option[]) => {
            const currentForm = scope.find((item) => item.value === '$nForm');
            const fields = getCollectionFields(name);
            // 工作流人工节点的 `自定义表单` 卡片，与其它表单卡片不同，根据它的数据表名称，获取到的字段列表为空，所以需要在这里特殊处理一下
            if (!fields?.length && currentForm) {
              currentForm.children = formatVariableScop(getFields());
            }

            return scope;
          },
          [getFields, name],
        );
        const modalForm = createForm({
          initialValues: { default: fieldSchema?.default },
        });
        return {
          type: 'object',
          title: t('Set default value'),
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
              title: t('Set default value'),
              'x-decorator': 'FormV2',
              'x-decorator-props': {
                componentType: 'div',
                form: modalForm,
              },
              properties: {
                default: {
                  'x-decorator': 'FormItem',
                  'x-component': 'VariableInput',
                  'x-component-props': {
                    ...fieldSchema?.['x-component-props'],
                    collectionField,
                    contextCollectionName: isAllowContextVariable && tableCtx.collection,
                    schema: collectionField?.uiSchema,
                    targetFieldSchema: fieldSchema,
                    className: styles.defaultInput,
                    form,
                    record,
                    returnScope,
                    shouldChange: getShouldChange({
                      collectionField,
                      variables,
                      localVariables,
                      getAllCollectionsInheritChain,
                    }),
                    renderSchemaComponent: function Com(props) {
                      const s = _.cloneDeep(fieldSchemaWithoutRequired) || ({} as Schema);
                      s.title = '';
                      s.name = 'default';
                      s['x-read-pretty'] = false;
                      s['x-disabled'] = false;

                      const defaultValue = fieldSchema.default;

                      if (collectionField.target && s['x-component-props']) {
                        s['x-component-props'].mode = 'Select';
                      }

                      if (collectionField?.uiSchema.type) {
                        s.type = collectionField.uiSchema.type;
                      }

                      if (collectionField?.uiSchema['x-component'] === 'Checkbox') {
                        _.set(s, 'x-component-props.defaultChecked', defaultValue);

                        // 在这里如果不设置 type 为 void，会导致设置的默认值不生效
                        // 但是我不知道为什么必须要设置为 void ？
                        s.type = 'void';
                      }

                      const schema = {
                        ...s,
                        'x-decorator': 'FormItem',
                        'x-component-props': {
                          ...s['x-component-props'],
                          collectionName: collectionField?.collectionName,
                          targetField,
                          onChange: props.onChange,
                          defaultValue: isVariable(defaultValue) ? '' : defaultValue,
                          style: {
                            width: '100%',
                            verticalAlign: 'top',
                            minWidth: '200px',
                          },
                        },
                        default: isVariable(defaultValue) ? '' : defaultValue,
                      } as ISchema;

                      return (
                        <FormProvider>
                          <SchemaComponent schema={schema} />
                        </FormProvider>
                      );
                    },
                  },
                  title: t('Default value'),
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
                            const defaultValue = form.values.default;
                            const schema: ISchema = {
                              ['x-uid']: fieldSchema['x-uid'],
                            };
                            field.value = defaultValue;
                            fieldSchema.default = defaultValue;
                            if (!defaultValue && defaultValue !== 0) {
                              field.value = null;
                            }
                            schema.default = defaultValue;
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
      name: 'layoutDirection',
      useSchema() {
        const { t } = useTranslation();
        const field = useField();
        const fieldSchema = useFieldSchema();
        const { layoutDirection = 'column' } = useContextConfigSetting();
        const initialValue = fieldSchema['x-decorator-props']?.layoutDirection || layoutDirection;
        return {
          type: 'string',
          title: '{{t("Layout Direction")}}',
          default: initialValue,
          'x-decorator': 'FormItem',
          'x-component': 'Select',
          'x-component-props': {
            allowClear: false,
            showSearch: false,
            options: [
              { label: t('Row'), value: 'row' },
              { label: t('Column'), value: 'column' },
            ],
            onChange(directionVal = 'column') {
              const oldStyle = fieldSchema['x-decorator-props']?.style;
              const newStyle = {
                ...oldStyle,
                display: 'flex',
                flexDirection: directionVal,
                alignItems: `${directionVal === 'row' ? 'baseline' : 'unset'}`,
              };
              fieldSchema['x-decorator-props'] = {
                ...fieldSchema['x-decorator-props'],
                style: newStyle,
                layoutDirection: directionVal,
              };
              _.set(field, 'decoratorProps.style', newStyle);
              _.set(field, 'decoratorProps.layoutDirection', directionVal);
            },
          },
        };
      },
    },
    {
      name: 'pattern',
      useVisible() {
        const { form } = useFormBlockContext();
        const fieldSchema = useFieldSchema();
        return form && !form?.readPretty && !isPatternDisabled(fieldSchema);
      },
      useSchema() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const fieldSchema = useFieldSchema();
        let readOnlyMode = 'editable';
        if (fieldSchema['x-disabled'] === true) {
          readOnlyMode = 'readonly';
        }
        if (fieldSchema['x-read-pretty'] === true) {
          readOnlyMode = 'read-pretty';
        }
        return {
          type: 'string',
          title: '{{t("Pattern")}}',
          default: readOnlyMode,
          'x-decorator': 'FormItem',
          'x-component': 'Select',
          'x-component-props': {
            allowClear: false,
            showSearch: false,
            options: [
              { label: t('Editable'), value: 'editable' },
              { label: t('Readonly'), value: 'readonly' },
              { label: t('Easy-reading'), value: 'read-pretty' },
            ],
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
            },
          },
        };
      },
    },
    {
      name: 'setValidationRules',
      useVisible() {
        const { form } = useFormBlockContext();
        const isFormReadPretty = useIsFormReadPretty();
        const validateSchema = useValidateSchema();
        return form && !isFormReadPretty && !!Object.keys(validateSchema || {}).length;
      },
      components: { ArrayCollapse, FormLayout },
      useSchema() {
        const { t } = useTranslation();
        const field = useField<Field>();
        const fieldSchema = useFieldSchema();
        const validateSchema = useValidateSchema();
        const { getCollectionJoinField } = useCollectionManager_deprecated();
        const { getField } = useCollection_deprecated();
        const collectionField =
          getField(fieldSchema['name']) || getCollectionJoinField(fieldSchema['x-collection-field']);
        const modalForm = createForm({
          initialValues: { rules: fieldSchema?.['x-validator'] },
        });
        return {
          type: 'object',
          title: t('Set validation rules'),
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
              title: t('Set validation rules'),
              'x-decorator': 'FormV2',
              'x-decorator-props': {
                componentType: 'div',
                form: modalForm,
              },
              properties: {
                rules: {
                  type: 'array',
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
                            const rules = [];
                            let formRules = form.values.rules;
                            for (const rule of formRules) {
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
                            const concatValidator = _.concat(
                              [],
                              collectionField?.uiSchema?.['x-validator'] || [],
                              rules,
                            );
                            field.validator = concatValidator;
                            fieldSchema['x-validator'] = rules;
                            schema['x-validator'] = rules;
                            ctx.setVisible(false);
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
