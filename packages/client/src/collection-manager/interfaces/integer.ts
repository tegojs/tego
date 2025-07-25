import { registerValidateFormats } from '@tachybase/schema';

import { CollectionFieldInterface } from '../../data-source/collection-field-interface/CollectionFieldInterface';
import { i18n } from '../../i18n';
import { autoIncrement, defaultProps, operators, primaryKey, unique } from './properties';

registerValidateFormats({
  odd: /^-?\d*[13579]$/,
  even: /^-?\d*[02468]$/,
});

export class IntegerFieldInterface extends CollectionFieldInterface {
  name = 'integer';
  type = 'object';
  group = 'basic';
  icon = 'FieldBinaryOutlined';
  order = 6;
  title = '{{t("Integer")}}';
  sortable = true;
  default = {
    type: 'bigInt',
    uiSchema: {
      type: 'number',
      'x-component': 'InputNumber',
      'x-component-props': {
        stringMode: true,
        step: '1',
      },
      'x-validator': 'integer',
    },
  };
  availableTypes = ['bigInt', 'integer', 'sort'];
  hasDefaultValue = true;
  properties = {
    ...defaultProps,
    layout: {
      type: 'void',
      title: '{{t("Index")}}',
      'x-component': 'Space',
      'x-decorator': 'FormItem',
      'x-decorator-props': {
        style: {
          marginBottom: '0px',
        },
      },
      properties: {
        primaryKey,
        unique,
      },
    },
    autoIncrement,
    'uiSchema.x-component-props.addonBefore': {
      type: 'string',
      title: '{{t("Prefix")}}',
      'x-decorator': 'FormItem',
      'x-component': 'Input',
    },
    'uiSchema.x-component-props.addonAfter': {
      type: 'string',
      title: '{{t("Suffix")}}',
      'x-decorator': 'FormItem',
      'x-component': 'Input',
    },
  };
  filterable = {
    operators: operators.number,
  };
  titleUsable = true;
  validateSchema = (fieldSchema) => {
    return {
      maximum: {
        type: 'number',
        title: '{{ t("Maximum") }}',
        'x-decorator': 'FormItem',
        'x-component': 'InputNumber',
        'x-component-props': {
          precision: 0,
        },
        'x-reactions': `{{(field) => {
          const targetValue = field.query('.minimum').value();
          field.selfErrors =
            !!targetValue && !!field.value && targetValue > field.value ? '${i18n.t(
              'Maximum must greater than minimum',
            )}' : ''
        }}}`,
      },
      minimum: {
        type: 'number',
        title: '{{ t("Minimum") }}',
        'x-decorator': 'FormItem',
        'x-component': 'InputNumber',
        'x-component-props': {
          precision: 0,
        },
        'x-reactions': {
          dependencies: ['.maximum'],
          fulfill: {
            state: {
              selfErrors: `{{!!$deps[0] && !!$self.value && $deps[0] < $self.value ? '${i18n.t(
                'Minimum must less than maximum',
              )}' : ''}}`,
            },
          },
        },
      },
      format: {
        type: 'string',
        title: '{{ t("Format") }}',
        'x-decorator': 'FormItem',
        'x-component': 'Select',
        'x-component-props': {
          allowClear: true,
        },
        enum: [
          {
            label: '{{ t("Odd") }}',
            value: 'odd',
          },
          {
            label: '{{ t("Even") }}',
            value: 'even',
          },
        ],
      },
      pattern: {
        type: 'string',
        title: '{{ t("Regular expression") }}',
        'x-decorator': 'FormItem',
        'x-component': 'Input',
        'x-component-props': {
          prefix: '/',
          suffix: '/',
        },
      },
    };
  };
}
