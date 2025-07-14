import { useContext } from 'react';
import { Schema, useField, useFieldSchema, useForm } from '@tachybase/schema';

import _ from 'lodash';
import { useTranslation } from 'react-i18next';

import { EditableSchemaSettings } from '../../../../application/schema-settings-editable';
import { findFormBlock, useFormBlockContext, useFormBlockType } from '../../../../block-provider';
import { useCollection_deprecated, useLinkageCollectionFilterOptions } from '../../../../collection-manager';
import { FlagProvider } from '../../../../flag-provider';
import { useRecord } from '../../../../record-provider';
import { SchemaComponentContext, useActionContext } from '../../../../schema-component';
import { FormDataTemplates } from '../../../../schema-settings';
import { FormLinkageRules } from '../../../../schema-settings/LinkageRules';
import { useLinkageCollectionFieldOptions } from '../../../../schema-settings/LinkageRules/action-hooks';
import { useSchemaTemplateManager } from '../../../../schema-templates';
import { useLocalVariables, useVariables } from '../../../../variables';
import { useEditableDesignable } from './EditableDesignable';

const findGridSchema = (fieldSchema) => {
  return fieldSchema.reduceProperties((buf, s) => {
    if (s['x-component'] === 'FormV2' || s['x-component'] === 'Details') {
      const f = s.reduceProperties((buf, s) => {
        if (s['x-component'] === 'Grid' || s['x-component'] === 'BlockTemplate') {
          return s;
        }
        return buf;
      }, null);
      if (f) {
        return f;
      }
    }
    return buf;
  }, null);
};

const useDataTemplates = (schema?: Schema) => {
  const fieldSchema = useFieldSchema();

  if (schema) {
    return {
      templateData: _.cloneDeep(schema['x-data-templates']),
    };
  }

  const formSchema = findFormBlock(fieldSchema) || fieldSchema;
  return {
    templateData: _.cloneDeep(formSchema?.['x-data-templates']),
  };
};

export const createFormBlockEditableSettings = new EditableSchemaSettings({
  name: 'blockEditableSettings:createForm',
  items: [
    {
      name: 'title',
      useSchema() {
        const field = useField();
        const fieldSchema = useFieldSchema();
        const { t } = useTranslation();
        return {
          type: 'string',
          title: '{{t("Edit block title")}}',
          default: fieldSchema?.['x-component-props']?.['title'],
          'x-decorator': 'FormItem',
          'x-component': 'Input',
          'x-component-props': {
            onChange(e) {
              const title = e?.target?.value;
              const componentProps = fieldSchema['x-component-props'] || {};
              componentProps.title = title;
              fieldSchema['x-component-props'] = componentProps;
              field.componentProps.title = title;
            },
          },
        };
      },
    },
    {
      name: 'linkageRules',
      useSchema() {
        const { name: collectionName } = useCollection_deprecated();
        const fieldSchema = useFieldSchema();
        const { form } = useFormBlockContext();
        const { t } = useTranslation();
        const { getTemplateById } = useSchemaTemplateManager();
        const variables = useVariables();
        const localVariables = useLocalVariables();
        const record = useRecord();
        const { type: formBlockType } = useFormBlockType();
        const type = ['Action', 'Action.Link'].includes(fieldSchema['x-component']) ? 'button' : 'field';
        const gridSchema = findGridSchema(fieldSchema) || fieldSchema;
        return {
          type: 'object',
          title: t('Linkage rules'),
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
              title: t('Linkage rules'),
              'x-decorator': 'FormV2',
              'x-decorator-props': {
                componentType: 'div',
              },
              properties: {
                fieldReaction: {
                  'x-component': FormLinkageRules,
                  'x-use-component-props': () => {
                    // eslint-disable-next-line react-hooks/rules-of-hooks
                    const options = useLinkageCollectionFilterOptions(collectionName);
                    const result = {
                      options,
                      defaultValues: gridSchema?.['x-linkage-rules'] || fieldSchema?.['x-linkage-rules'],
                      type,
                      // eslint-disable-next-line react-hooks/rules-of-hooks
                      linkageOptions: useLinkageCollectionFieldOptions(collectionName),
                      collectionName,
                      form,
                      variables,
                      localVariables,
                      record,
                      formBlockType,
                    };
                    return result;
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
                            let formRules = form.values.fieldReaction.rules;
                            for (const rule of formRules) {
                              rules.push(_.pickBy(rule, _.identity));
                            }
                            const templateId =
                              gridSchema['x-component'] === 'BlockTemplate' &&
                              gridSchema['x-component-props']?.templateId;
                            const uid = (templateId && getTemplateById(templateId).uid) || gridSchema['x-uid'];
                            const schema = {
                              ['x-uid']: uid,
                            };

                            gridSchema['x-linkage-rules'] = rules;
                            schema['x-linkage-rules'] = rules;
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
      name: 'dataTemplates',
      useVisible() {
        const { action } = useFormBlockContext();
        return !action;
      },
      useSchema() {
        const { name: collectionName } = useCollection_deprecated();
        const designerCtx = useContext(SchemaComponentContext);
        const fieldSchema = useFieldSchema();
        const { t } = useTranslation();
        const formSchema = findFormBlock(fieldSchema) || fieldSchema;
        const { templateData } = useDataTemplates();
        return {
          type: 'object',
          title: t('Form data templates'),
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
              title: t('Form data templates'),
              'x-decorator': 'FormV2',
              'x-decorator-props': {
                componentType: 'div',
              },
              properties: {
                fieldReaction: {
                  'x-decorator': (props) => <FlagProvider {...props} isInFormDataTemplate />,
                  'x-component': FormDataTemplates,
                  'x-use-component-props': () => {
                    return {
                      defaultValues: templateData,
                      collectionName,
                    };
                  },
                  'x-component-props': {
                    designerCtx,
                    formSchema,
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
                            let fieldReaction = form.values.fieldReaction;
                            const data = { ...formSchema['x-data-templates'], ...fieldReaction };
                            // 当 Tree 组件开启 checkStrictly 属性时，会导致 checkedKeys 的值是一个对象，而不是数组，所以这里需要转换一下以支持旧版本
                            data.items.forEach((item) => {
                              item.fields = Array.isArray(item.fields) ? item.fields : item.fields.checked;
                            });
                            formSchema['x-data-templates'] = data;
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
