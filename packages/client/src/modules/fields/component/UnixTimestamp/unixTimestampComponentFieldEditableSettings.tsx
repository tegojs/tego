import { createForm, useField, useFieldSchema, useForm } from '@tachybase/schema';

import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';

import { EditableSchemaSettings } from '../../../../application/schema-settings-editable';
import { useCollectionManager_deprecated } from '../../../../collection-manager';
import { useActionContext } from '../../../../schema-component';
import { useColumnSchema } from '../../../../schema-component/antd/table-v2/Table.Column.Decorator';
import { DateFormatCom, ExpiresRadio } from '../../../../schema-settings/DateFormat/ExpiresRadio';
import { SchemaSettingsDateFormat } from '../../../../schema-settings/SchemaSettingsDateFormat';
import { useEditableDesignable } from '../../../blocks/data-blocks/form-editor/EditableDesignable';

const useStyles = createStyles(({ css }) => {
  return {
    radio: css`
      .ant-radio-wrapper {
        display: flex;
        margin: 5px 0px;
      }
    `,
    margin: css`
      margin-bottom: 0px;
    `,
    redRadio: css`
      color: red;
      .ant-radio-wrapper {
        display: flex;
        margin: 5px 0px;
      }
    `,
  };
});

export const unixTimestampComponentFieldEditableSettings = new EditableSchemaSettings({
  name: 'editableFieldSettings:component:UnixTimestamp',
  items: [
    {
      name: 'dateDisplayFormat',
      useSchema() {
        const { t } = useTranslation();
        const fieldSchema = useFieldSchema();
        const { styles } = useStyles();
        const field = useField();
        const { getCollectionJoinField } = useCollectionManager_deprecated();
        const collectionField = getCollectionJoinField(fieldSchema?.['x-collection-field']) || {};
        const isShowTime = fieldSchema?.['x-component-props']?.showTime;
        const dateFormatDefaultValue =
          fieldSchema?.['x-component-props']?.dateFormat ||
          collectionField?.uiSchema?.['x-component-props']?.dateFormat ||
          'YYYY-MM-DD';
        const timeFormatDefaultValue =
          fieldSchema?.['x-component-props']?.timeFormat ||
          collectionField?.uiSchema?.['x-component-props']?.timeFormat ||
          'HH:mm:ss';
        const modalForm = createForm({
          initialValues: {
            dateFormat: dateFormatDefaultValue,
            showTime:
              isShowTime === undefined ? collectionField?.uiSchema?.['x-component-props']?.showTime : isShowTime,
            timeFormat: timeFormatDefaultValue,
          },
        });
        return {
          type: 'object',
          title: t('Date display format'),
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
              title: t('Date display format'),
              'x-decorator': 'FormV2',
              'x-decorator-props': {
                componentType: 'div',
                form: modalForm,
              },
              properties: {
                dateFormat: {
                  type: 'string',
                  title: '{{t("Date format")}}',
                  'x-component': ExpiresRadio,
                  'x-decorator': 'FormItem',
                  'x-decorator-props': {},
                  'x-component-props': {
                    className: styles.radio,
                    defaultValue: 'dddd',
                    formats: ['MMMM Do YYYY', 'YYYY-MM-DD', 'MM/DD/YY', 'YYYY/MM/DD', 'DD/MM/YYYY'],
                  },
                  enum: [
                    {
                      label: DateFormatCom({ format: 'MMMM Do YYYY' }),
                      value: 'MMMM Do YYYY',
                    },
                    {
                      label: DateFormatCom({ format: 'YYYY-MM-DD' }),
                      value: 'YYYY-MM-DD',
                    },
                    {
                      label: DateFormatCom({ format: 'MM/DD/YY' }),
                      value: 'MM/DD/YY',
                    },
                    {
                      label: DateFormatCom({ format: 'YYYY/MM/DD' }),
                      value: 'YYYY/MM/DD',
                    },
                    {
                      label: DateFormatCom({ format: 'DD/MM/YYYY' }),
                      value: 'DD/MM/YYYY',
                    },
                    {
                      label: 'custom',
                      value: 'custom',
                    },
                  ],
                },
                showTime: {
                  type: 'boolean',
                  'x-decorator': 'FormItem',
                  'x-component': 'Checkbox',
                  'x-content': '{{t("Show time")}}',
                  'x-reactions': [
                    `{{(field) => {
                  field.query('.timeFormat').take(f => {
                    f.display = field.value ? 'visible' : 'none';
                  });
                }}}`,
                  ],
                },
                timeFormat: {
                  type: 'string',
                  title: '{{t("Time format")}}',
                  'x-component': ExpiresRadio,
                  'x-decorator': 'FormItem',
                  'x-decorator-props': {
                    className: styles.margin,
                  },
                  'x-component-props': {
                    className: styles.redRadio,
                    defaultValue: 'h:mm a',
                    formats: ['hh:mm:ss a', 'HH:mm:ss'],
                    timeFormat: true,
                  },
                  enum: [
                    {
                      label: DateFormatCom({ format: 'hh:mm:ss a' }),
                      value: 'hh:mm:ss a',
                    },
                    {
                      label: DateFormatCom({ format: 'HH:mm:ss' }),
                      value: 'HH:mm:ss',
                    },
                    {
                      label: 'custom',
                      value: 'custom',
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
