import { useContext } from 'react';
import { ArrayTable, FormButtonGroup, FormDrawer, FormLayout, Submit } from '@tachybase/components';
import { Evaluator, evaluators } from '@tachybase/evaluators/client';
import { onFieldValueChange, SchemaOptionsContext, useForm, useFormEffects } from '@tachybase/schema';
import { error, lodash, Registry } from '@tachybase/utils/client';

import { Button, Select } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  autoIncrement,
  collectionDataSource,
  dataSource,
  dateTimeProps,
  primaryKey,
  unique,
} from '../../../../collection-manager';
import { i18n } from '../../../../i18n';
import { Cron, SchemaComponent, SchemaComponentOptions, useCompile } from '../../../../schema-component';
import { css, useToken } from '../../../../style';

export const getProperties = (fieldInterface: keyof typeof interfaceSchemaMap) => {
  const handler = interfaceSchemaMap[fieldInterface];
  return handler?.();
};

export function isSpecialInterrface(fieldInterface?: string): fieldInterface is SpecialInterface {
  return fieldInterface !== undefined && Object.hasOwn(interfaceSchemaMap, fieldInterface);
}

type SpecialInterface = keyof typeof interfaceSchemaMap;

const addonProps = {
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

const numberReactions = [
  {
    dependencies: ['dataType'],
    fulfill: {
      state: {
        display: '{{["double", "decimal"].includes($deps[0]) ? "visible" : "none"}}',
      },
    },
  },
];

const datetimeReactions = [
  {
    dependencies: ['dataType'],
    fulfill: {
      state: {
        display: '{{$deps[0] === "date" ? "visible" : "none"}}',
      },
    },
  },
];

function RuleTypeSelect(props) {
  const compile = useCompile();

  const { setValuesIn } = useForm();
  const index = ArrayTable.useIndex();

  useFormEffects(() => {
    onFieldValueChange(`patterns.${index}.type`, (field) => {
      setValuesIn(`patterns.${index}.options`, {});
    });
  });

  return (
    <Select popupMatchSelectWidth={false} {...props}>
      {Object.keys(RuleTypes).map((key) => (
        <Select.Option key={key} value={key}>
          {compile(RuleTypes[key].title)}
        </Select.Option>
      ))}
    </Select>
  );
}

function RuleOptions() {
  const compile = useCompile();
  const { values } = useForm();
  const index = ArrayTable.useIndex();
  const { type, options } = values.patterns[index];
  const ruleType = RuleTypes[type];
  return (
    <div
      className={css`
        display: flex;
        gap: 1em;
        flex-wrap: wrap;
      `}
    >
      {Object.keys(options)
        .filter((key) => typeof options[key] !== 'undefined' && ruleType.optionRenders[key])
        .map((key) => {
          const Component = ruleType.optionRenders[key];
          const { title } = ruleType.fieldset[key];
          return Component ? (
            <dl
              key={key}
              className={css`
                margin: 0;
                padding: 0;
              `}
            >
              <dt>{compile(title)}</dt>
              <dd
                className={css`
                  margin-bottom: 0;
                `}
              >
                <Component key={key} value={options[key]} />
              </dd>
            </dl>
          ) : null;
        })}
    </div>
  );
}

const RuleTypes = {
  string: {
    title: `{{t("Fixed text")}}`,
    optionRenders: {
      value(options = { value: '' }) {
        return <code>{options.value}</code>;
      },
    },
    fieldset: {
      value: {
        type: 'string',
        title: `{{t("Text content")}}`,
        'x-decorator': 'FormItem',
        'x-component': 'Input',
      },
    },
  },
  integer: {
    title: `{{t("Autoincrement")}}`,
    optionRenders: {
      digits: function Digits({ value }) {
        return <code>{value}</code>;
      },
      start: function Start({ value }) {
        return <code>{value}</code>;
      },
      // cycle: Cron.ReadPretty,
    },
    fieldset: {
      digits: {
        type: 'number',
        title: `{{t("Digits")}}`,
        'x-decorator': 'FormItem',
        'x-component': 'InputNumber',
        'x-component-props': {
          min: 1,
          max: 10,
        },
        required: true,
        default: 1,
        'x-reactions': {
          target: 'start',
          fulfill: {
            schema: {
              'x-component-props.max': '{{ 10 ** $self.value - 1 }}',
            },
          },
        },
      },
      start: {
        type: 'number',
        title: `{{t("Start from")}}`,
        'x-decorator': 'FormItem',
        'x-component': 'InputNumber',
        'x-component-props': {
          min: 0,
        },
        required: true,
        default: 0,
        // 'x-reactions': {
        //   dependencies: ['.start', '.base'],
        //   fulfill: {
        //     schema: {
        //       'x-component-props.max': '{{ ($deps[1] ?? 10) ** ($deps[0] ?? 1) - 1 }}'
        //     }
        //   }
        // }
      },
      cycle: {
        type: 'string',
        title: `{{t("Reset cycle")}}`,
        'x-decorator': 'FormItem',
        ['x-component']({ value, onChange }) {
          const shortValues = [
            { label: 'No reset', value: 0 },
            { label: 'Daily', value: 1, cron: '0 0 * * *' },
            { label: 'Every Monday', value: 2, cron: '0 0 * * 1' },
            { label: 'Monthly', value: 3, cron: '0 0 1 * *' },
            { label: 'Yearly', value: 4, cron: '0 0 1 1 *' },
            { label: 'Customize', value: 5, cron: '* * * * *' },
          ];
          const option =
            typeof value === 'undefined'
              ? shortValues[0]
              : shortValues.find((item) => {
                  return item.cron === value;
                }) || shortValues[5];
          return (
            <fieldset>
              <Select value={option.value} onChange={(v) => onChange(shortValues[v].cron)}>
                {shortValues.map((item) => (
                  <Select.Option key={item.value} value={item.value}>
                    {item.label}
                  </Select.Option>
                ))}
              </Select>
              {option.value === 5 ? <Cron value={value} onChange={onChange} clearButton={false} /> : null}
            </fieldset>
          );
        },
        default: null,
      },
    },
  },
  date: {
    title: `{{t("Date")}}`,
    optionRenders: {
      format(options = { value: 'YYYYMMDD' }) {
        return <code>{options.value}</code>;
      },
    },
    fieldset: {
      format: {
        type: 'string',
        title: `{{t("Date fomat")}}`,
        'x-decorator': 'FormItem',
        'x-component': 'Input',
        default: 'YYYYMMDD',
      },
    },
  },
};

export function RuleConfigForm() {
  const { t } = useTranslation();
  const compile = useCompile();
  const schemaOptions = useContext(SchemaOptionsContext);
  const { values, setValuesIn } = useForm();
  const index = ArrayTable.useIndex();
  const { type, options } = values.patterns[index];
  const ruleType = RuleTypes[type];
  const { token } = useToken();
  return ruleType?.fieldset ? (
    <Button
      type="link"
      onClick={() => {
        // fix
        FormDrawer(
          {
            title: compile(ruleType.title),
            zIndex: token.zIndexPopupBase + 1000,
          },
          () => {
            return (
              <FormLayout layout="vertical">
                <SchemaComponentOptions scope={schemaOptions.scope} components={schemaOptions.components}>
                  <SchemaComponent
                    schema={{
                      type: 'object',
                      'x-component': 'fieldset',
                      properties: ruleType.fieldset,
                    }}
                  />
                </SchemaComponentOptions>
                <FormButtonGroup
                  className={css`
                    justify-content: flex-end;
                  `}
                >
                  <Submit
                    onSubmit={(values) => {
                      return values;
                    }}
                  >
                    {t('Submit')}
                  </Submit>
                </FormButtonGroup>
              </FormLayout>
            );
          },
        )
          .open({
            initialValues: options,
          })
          .then((values) => {
            setValuesIn(`patterns.${index}`, { type, options: { ...values } });
          })
          .catch((err) => {
            error(err);
          });
      }}
    >
      {t('Configure')}
    </Button>
  ) : null;
}

export const interfaceSchemaMap = {
  oho: () => ({
    grid: {
      type: 'void',
      'x-component': 'Grid',
      properties: {
        row1: {
          type: 'void',
          'x-component': 'Grid.Row',
          properties: {
            col11: {
              type: 'void',
              'x-component': 'Grid.Col',
              properties: {
                source: {
                  type: 'void',
                  title: '{{t("Source collection")}}',
                  'x-decorator': 'FormItem',
                  'x-component': 'SourceCollection',
                  'x-disabled': true,
                },
              },
            },
            col12: {
              type: 'void',
              'x-component': 'Grid.Col',
              properties: {
                target: {
                  type: 'string',
                  title: '{{t("Target collection")}}',
                  required: true,
                  // 'x-reactions': ['{{useAsyncDataSource(loadCollections, ["file"])}}'],
                  'x-decorator': 'FormItem',
                  'x-component': 'CollectionSelect',
                  // 'x-disabled': '{{ !createOnly }}',
                },
              },
            },
          },
        },
        row2: {
          type: 'void',
          'x-component': 'Grid.Row',
          properties: {
            col21: {
              type: 'void',
              'x-component': 'Grid.Col',
              properties: {
                sourceKey: {
                  type: 'string',
                  title: '{{t("Source key")}}',
                  description: "{{t('Field values must be unique.')}}",
                  'x-decorator': 'FormItem',
                  'x-component': 'SourceKey',
                },
              },
            },
            col22: {
              type: 'void',
              'x-component': 'Grid.Col',
              properties: {
                foreignKey: {
                  type: 'string',
                  title: '{{t("Foreign key")}}',
                  required: true,
                  // default: '{{ useNewId("f_") }}',
                  description:
                    "{{t('Randomly generated and can be modified. Support letters, numbers and underscores, must start with an letter.')}}",
                  'x-decorator': 'FormItem',
                  'x-component': 'ForeignKey',
                  'x-validator': 'uid',
                  'x-disabled': true,
                  // 'x-disabled': '{{ !createOnly }}',
                },
              },
            },
          },
        },
      },
    },
  }),
  obo: () => ({
    grid: {
      type: 'void',
      'x-component': 'Grid',
      properties: {
        row1: {
          type: 'void',
          'x-component': 'Grid.Row',
          properties: {
            col11: {
              type: 'void',
              'x-component': 'Grid.Col',
              properties: {
                source: {
                  type: 'void',
                  title: '{{t("Source collection")}}',
                  'x-decorator': 'FormItem',
                  'x-component': 'SourceCollection',
                  'x-disabled': true,
                },
              },
            },
            col12: {
              type: 'void',
              'x-component': 'Grid.Col',
              properties: {
                target: {
                  type: 'string',
                  title: '{{t("Target collection")}}',
                  required: true,
                  // 'x-reactions': ['{{useAsyncDataSource(loadCollections)}}'],
                  'x-decorator': 'FormItem',
                  'x-component': 'CollectionSelect',
                  // 'x-disabled': '{{ !createOnly }}',
                },
              },
            },
          },
        },
        row2: {
          type: 'void',
          'x-component': 'Grid.Row',
          properties: {
            col21: {
              type: 'void',
              'x-component': 'Grid.Col',
              properties: {
                foreignKey: {
                  type: 'string',
                  title: '{{t("Foreign key")}}',
                  required: true,
                  default: '{{ useNewId("f_") }}',
                  description:
                    "{{t('Randomly generated and can be modified. Support letters, numbers and underscores, must start with an letter.')}}",
                  'x-decorator': 'FormItem',
                  'x-component': 'ForeignKey',
                  'x-validator': 'uid',
                  'x-disabled': true,
                  // 'x-disabled': '{{ !createOnly }}',
                },
              },
            },
            col22: {
              type: 'void',
              'x-component': 'Grid.Col',
              properties: {
                targetKey: {
                  type: 'string',
                  default: 'id',
                  title: '{{t("Target key")}}',
                  description: "{{t('Field values must be unique.')}}",
                  'x-decorator': 'FormItem',
                  'x-component': 'TargetKey',
                  // 'x-disabled': '{{ !createOnly }}',
                },
              },
            },
          },
        },
      },
    },
  }),
  o2o: () => ({
    grid: {
      type: 'void',
      'x-component': 'Grid',
      properties: {
        row1: {
          type: 'void',
          'x-component': 'Grid.Row',
          properties: {
            col11: {
              type: 'void',
              'x-component': 'Grid.Col',
              properties: {
                source: {
                  type: 'void',
                  title: '{{t("Source collection")}}',
                  'x-decorator': 'FormItem',
                  'x-component': 'SourceCollection',
                  'x-disabled': true,
                },
              },
            },
            col12: {
              type: 'void',
              'x-component': 'Grid.Col',
              properties: {
                target: {
                  type: 'string',
                  title: '{{t("Target collection")}}',
                  required: true,
                  // 'x-reactions': ['{{useAsyncDataSource(loadCollections, ["file"])}}'],
                  'x-decorator': 'FormItem',
                  'x-component': 'CollectionSelect',
                },
              },
            },
          },
        },
        row2: {
          type: 'void',
          'x-component': 'Grid.Row',
          properties: {
            col21: {
              type: 'void',
              'x-component': 'Grid.Col',
              properties: {
                sourceKey: {
                  type: 'string',
                  title: '{{t("Source key")}}',
                  description: "{{t('Field values must be unique.')}}",
                  'x-decorator': 'FormItem',
                  'x-component': 'SourceKey',
                },
              },
            },
            col22: {
              type: 'void',
              'x-component': 'Grid.Col',
              properties: {
                foreignKey: {
                  type: 'string',
                  title: '{{t("Foreign key")}}',
                  required: true,
                  default: '{{ useNewId("f_") }}',
                  description:
                    "{{t('Randomly generated and can be modified. Support letters, numbers and underscores, must start with an letter.')}}",
                  'x-decorator': 'FormItem',
                  'x-component': 'ForeignKey',
                  'x-validator': 'uid',
                },
              },
            },
          },
        },
      },
    },
  }),
  o2m: () => ({
    grid: {
      type: 'void',
      'x-component': 'Grid',
      properties: {
        row1: {
          type: 'void',
          'x-component': 'Grid.Row',
          properties: {
            col11: {
              type: 'void',
              'x-component': 'Grid.Col',
              properties: {
                source: {
                  type: 'void',
                  title: '{{t("Source collection")}}',
                  'x-decorator': 'FormItem',
                  'x-component': 'SourceCollection',
                  'x-disabled': true,
                },
              },
            },
            col12: {
              type: 'void',
              'x-component': 'Grid.Col',
              properties: {
                target: {
                  type: 'string',
                  title: '{{t("Target collection")}}',
                  required: true,
                  // 'x-reactions': ['{{useAsyncDataSource(loadCollections, ["file"])}}'],
                  'x-decorator': 'FormItem',
                  'x-component': 'CollectionSelect',
                  // 'x-disabled': '{{ !createOnly }}',
                },
              },
            },
          },
        },
        row2: {
          type: 'void',
          'x-component': 'Grid.Row',
          properties: {
            col21: {
              type: 'void',
              'x-component': 'Grid.Col',
              properties: {
                sourceKey: {
                  type: 'string',
                  title: '{{t("Source key")}}',
                  description: "{{t('Field values must be unique.')}}",
                  default: 'id',
                  enum: [{ label: 'ID', value: 'id' }],
                  'x-decorator': 'FormItem',
                  'x-component': 'SourceKey',
                  'x-disabled': true,
                },
              },
            },
            col22: {
              type: 'void',
              'x-component': 'Grid.Col',
              properties: {
                foreignKey: {
                  type: 'string',
                  title: '{{t("Foreign key")}}',
                  required: true,
                  default: '{{ useNewId("f_") }}',
                  description:
                    "{{t('Randomly generated and can be modified. Support letters, numbers and underscores, must start with an letter.')}}",
                  'x-decorator': 'FormItem',
                  'x-component': 'ForeignKey',
                  'x-validator': 'uid',
                  'x-disabled': true,
                  // 'x-disabled': '{{ !createOnly }}',
                },
              },
            },
          },
        },
        row3: {
          type: 'void',
          'x-component': 'Grid.Row',
          properties: {
            col21: {
              type: 'void',
              'x-component': 'Grid.Col',
              properties: {},
            },
            col22: {
              type: 'void',
              'x-component': 'Grid.Col',
              properties: {
                targetKey: {
                  type: 'string',
                  default: 'id',
                  title: '{{t("Target key")}}',
                  'x-decorator': 'FormItem',
                  'x-component': 'TargetKey',
                  // 'x-disabled': '{{ !createOnly }}',
                  description: "{{t('Field values must be unique.')}}",
                },
              },
            },
          },
        },
      },
    },
  }),
  m2o: () => ({
    grid: {
      type: 'void',
      'x-component': 'Grid',
      properties: {
        row1: {
          type: 'void',
          'x-component': 'Grid.Row',
          properties: {
            col11: {
              type: 'void',
              'x-component': 'Grid.Col',
              properties: {
                source: {
                  type: 'void',
                  title: '{{t("Source collection")}}',
                  'x-decorator': 'FormItem',
                  'x-component': 'SourceCollection',
                  'x-disabled': true,
                },
              },
            },
            col12: {
              type: 'void',
              'x-component': 'Grid.Col',
              properties: {
                target: {
                  type: 'string',
                  title: '{{t("Target collection")}}',
                  required: true,
                  // 'x-reactions': ['{{useAsyncDataSource(loadCollections)}}'],
                  'x-decorator': 'FormItem',
                  'x-component': 'CollectionSelect',
                  // 'x-disabled': '{{ !createOnly }}',
                },
              },
            },
          },
        },
        row2: {
          type: 'void',
          'x-component': 'Grid.Row',
          properties: {
            col21: {
              type: 'void',
              'x-component': 'Grid.Col',
              properties: {
                foreignKey: {
                  type: 'string',
                  title: '{{t("Foreign key")}}',
                  required: true,
                  // default: '{{ useNewId("f_") }}',
                  description:
                    "{{t('Randomly generated and can be modified. Support letters, numbers and underscores, must start with an letter.')}}",
                  'x-decorator': 'FormItem',
                  'x-component': 'ForeignKey',
                  'x-validator': 'uid',
                  'x-disabled': true,
                  // 'x-disabled': '{{ !createOnly }}',
                },
              },
            },
            col22: {
              type: 'void',
              'x-component': 'Grid.Col',
              properties: {
                targetKey: {
                  type: 'string',
                  title: '{{t("Target key")}}',
                  default: 'id',
                  description: "{{t('Field values must be unique.')}}",
                  'x-decorator': 'FormItem',
                  'x-component': 'TargetKey',
                  // 'x-disabled': '{{ !createOnly }}',
                },
              },
            },
          },
        },
      },
    },
  }),
  m2m: () => ({
    grid: {
      type: 'void',
      'x-component': 'Grid',
      properties: {
        row1: {
          type: 'void',
          'x-component': 'Grid.Row',
          properties: {
            col11: {
              type: 'void',
              'x-component': 'Grid.Col',
              properties: {
                source: {
                  type: 'string',
                  title: '{{t("Source collection")}}',
                  'x-decorator': 'FormItem',
                  'x-component': 'SourceCollection',
                  'x-disabled': true,
                },
              },
            },
            col12: {
              type: 'void',
              'x-component': 'Grid.Col',
              properties: {
                through: {
                  type: 'string',
                  title: '{{t("Through collection")}}',
                  description: '{{ t("Generated automatically if left blank") }}',
                  'x-decorator': 'FormItem',
                  'x-disabled': '{{ !createOnly }}',
                  'x-component': 'ThroughCollection',
                  'x-component-props': {
                    allowClear: true,
                  },
                },
              },
            },
            col13: {
              type: 'void',
              'x-component': 'Grid.Col',
              properties: {
                target: {
                  type: 'string',
                  title: '{{t("Target collection")}}',
                  required: true,
                  // 'x-reactions': ['{{useAsyncDataSource(loadCollections)}}'],
                  'x-decorator': 'FormItem',
                  'x-component': 'CollectionSelect',
                  // 'x-disabled': '{{ !createOnly }}',
                },
              },
            },
          },
        },
        row2: {
          type: 'void',
          'x-component': 'Grid.Row',
          properties: {
            col21: {
              type: 'void',
              'x-component': 'Grid.Col',
              properties: {
                sourceKey: {
                  type: 'string',
                  title: '{{t("Source key")}}',
                  description: "{{t('Field values must be unique.')}}",
                  'x-decorator': 'FormItem',
                  'x-component': 'SourceKey',
                  'x-disabled': true,
                  // 'x-disabled': '{{ !createOnly }}',
                },
              },
            },
            col22: {
              type: 'void',
              'x-component': 'Grid.Col',
              properties: {
                foreignKey: {
                  type: 'string',
                  title: '{{t("Foreign key 1")}}',
                  required: true,
                  default: '{{ useNewId("f_") }}',
                  description:
                    "{{t('Randomly generated and can be modified. Support letters, numbers and underscores, must start with an letter.')}}",
                  'x-decorator': 'FormItem',
                  'x-component': 'ForeignKey',
                  'x-validator': 'uid',
                  'x-disabled': true,
                  // 'x-disabled': '{{ !createOnly||override }}',
                },
              },
            },
            col23: {
              type: 'void',
              'x-component': 'Grid.Col',
              properties: {},
            },
          },
        },
        row3: {
          type: 'void',
          'x-component': 'Grid.Row',
          properties: {
            col21: {
              type: 'void',
              'x-component': 'Grid.Col',
              properties: {},
            },
            col22: {
              type: 'void',
              'x-component': 'Grid.Col',
              properties: {
                otherKey: {
                  type: 'string',
                  title: '{{t("Foreign key 2")}}',
                  required: true,
                  default: '{{ useNewId("f_") }}',
                  description:
                    "{{t('Randomly generated and can be modified. Support letters, numbers and underscores, must start with an letter.')}}",
                  'x-decorator': 'FormItem',
                  'x-component': 'ForeignKey',
                  'x-validator': 'uid',
                  'x-disabled': true,
                  // 'x-disabled': '{{ !createOnly||override }}',
                },
              },
            },
            col23: {
              type: 'void',
              'x-component': 'Grid.Col',
              properties: {
                targetKey: {
                  type: 'string',
                  default: 'id',
                  title: '{{t("Target key")}}',
                  'x-decorator': 'FormItem',
                  'x-component': 'TargetKey',
                  // 'x-disabled': '{{ !createOnly }}',
                  description: "{{t('Field values must be unique.')}}",
                },
              },
            },
          },
        },
      },
    },
  }),
  number: () => ({
    unique,
    'uiSchema.x-component-props.step': {
      type: 'string',
      title: '{{t("Precision")}}',
      'x-component': 'Select',
      'x-decorator': 'FormItem',
      default: '1',
      enum: [
        { value: '1', label: '1' },
        { value: '0.1', label: '1.0' },
        { value: '0.01', label: '1.00' },
        { value: '0.001', label: '1.000' },
        { value: '0.0001', label: '1.0000' },
        { value: '0.00001', label: '1.00000' },
      ],
    },
    ...addonProps,
  }),
  integer: () => ({
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
    ...addonProps,
  }),
  percent: () => ({
    unique,
    'uiSchema.x-component-props.step': {
      type: 'string',
      title: '{{t("Precision")}}',
      'x-component': 'Select',
      'x-decorator': 'FormItem',
      default: '1',
      enum: [
        { value: '1', label: '1%' },
        { value: '0.1', label: '1.0%' },
        { value: '0.01', label: '1.00%' },
        { value: '0.001', label: '1.000%' },
        { value: '0.0001', label: '1.0000%' },
        { value: '0.00001', label: '1.00000%' },
      ],
    },
    ...addonProps,
  }),
  select: () => ({
    'uiSchema.enum': dataSource,
  }),
  multipleSelect: () => ({
    'uiSchema.enum': dataSource,
  }),
  checkbox: () => ({
    'uiSchema.x-component-props.showUnchecked': {
      type: 'boolean',
      title: '{{t("Display X when unchecked")}}',
      default: false,
      'x-decorator': 'FormItem',
      'x-component': 'Checkbox',
    },
  }),
  checkboxGroup: () => ({
    'uiSchema.enum': dataSource,
  }),
  radioGroup: () => ({
    'uiSchema.enum': dataSource,
  }),
  attachment: () => ({
    'uiSchema.x-component-props.accept': {
      type: 'string',
      title: `{{t("MIME type")}}`,
      'x-component': 'Input',
      'x-decorator': 'FormItem',
      description: 'Example: image/png',
      default: 'image/*',
    },
    'uiSchema.x-component-props.multiple': {
      type: 'boolean',
      'x-content': `{{t('Allow uploading multiple files')}}`,
      'x-decorator': 'FormItem',
      'x-component': 'Checkbox',
      default: true,
    },
    storage: {
      type: 'string',
      title: `{{t("Storage")}}`,
      description: `{{t('Default storage will be used when not selected')}}`,
      'x-decorator': 'FormItem',
      'x-component': 'RemoteSelect',
      'x-component-props': {
        service: {
          resource: 'storages',
          params: {
            // pageSize: -1
          },
        },
        manual: false,
        fieldNames: {
          label: 'title',
          value: 'name',
        },
      },
    },
  }),
  datetime: () => ({
    ...dateTimeProps,
    'uiSchema.x-component-props.gmt': {
      type: 'boolean',
      title: '{{t("GMT")}}',
      'x-hidden': true,
      'x-component': 'Checkbox',
      'x-content': '{{t("Use the same time zone (GMT) for all users")}}',
      'x-decorator': 'FormItem',
      default: false,
    },
  }),
  unixTimestamp: () => ({
    'uiSchema.x-component-props.accuracy': {
      type: 'string',
      title: '{{t("Accuracy")}}',
      'x-component': 'Radio.Group',
      'x-decorator': 'FormItem',
      default: 'millisecond',
      enum: [
        { value: 'millisecond', label: '{{t("Millisecond")}}' },
        { value: 'second', label: '{{t("Second")}}' },
      ],
    },
  }),
  time: () => ({
    'uiSchema.x-component-props.format': {
      type: 'string',
      title: '{{t("Time format")}}',
      'x-component': 'Radio.Group',
      'x-decorator': 'FormItem',
      default: 'HH:mm:ss',
      enum: [
        {
          label: '{{t("12 hour")}}',
          value: 'hh:mm:ss a',
        },
        {
          label: '{{t("24 hour")}}',
          value: 'HH:mm:ss',
        },
      ],
    },
  }),
  nanoid: () => ({
    customAlphabet: {
      type: 'string',
      title: '{{t("Alphabet")}}',
      default: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
      'x-decorator': 'FormItem',
      'x-component': 'Input',
    },
    size: {
      type: 'number',
      title: '{{t("Length")}}',
      default: 21,
      'x-decorator': 'FormItem',
      'x-component': 'InputNumber',
    },
  }),
  sort: () => ({
    scopeKey: {
      type: 'string',
      title: '{{t("Grouped sorting")}}',
      'x-disabled': '{{ !createOnly }}',
      'x-decorator': 'FormItem',
      'x-component': 'Select',
      enum: '{{scopeKeyOptions}}',
      description: "{{t('When a field is selected for grouping, it will be grouped first before sorting.')}}",
    },
  }),
  formula: () => ({
    dataType: {
      type: 'string',
      title: '{{t("Storage type")}}',
      'x-decorator': 'FormItem',
      'x-component': 'Select',
      'x-disabled': '{{ !createOnly }}',
      enum: [
        { value: 'boolean', label: 'Boolean' },
        { value: 'integer', label: 'Integer' },
        { value: 'bigInt', label: 'Big integer' }, // not fully supported as JS native bigint type
        { value: 'double', label: 'Double' },
        // { value: 'decimal', label: 'Decimal' }, // not supported
        { value: 'string', label: 'String' },
        { value: 'date', label: 'Datetime' },
      ],
      required: true,
      default: 'double',
    },
    'uiSchema.x-component-props.addonAfter': {
      type: 'string',
      title: '{{t("Suffix")}}',
      'x-decorator': 'FormItem',
      'x-component': 'Input',
    },
    'uiSchema.x-component-props.step': {
      type: 'string',
      title: '{{t("Precision")}}',
      'x-component': 'Select',
      'x-decorator': 'FormItem',
      required: true,
      default: '0',
      enum: [
        { value: '0', label: '1' },
        { value: '0.1', label: '1.0' },
        { value: '0.01', label: '1.00' },
        { value: '0.001', label: '1.000' },
        { value: '0.0001', label: '1.0000' },
        { value: '0.00001', label: '1.00000' },
      ],
      'x-reactions': numberReactions,
    },
    'uiSchema.x-component-props.dateFormat': {
      ...lodash.cloneDeep(dateTimeProps['uiSchema.x-component-props.dateFormat']),
      'x-reactions': datetimeReactions,
    },
    'uiSchema.x-component-props.showTime': {
      ...lodash.cloneDeep(dateTimeProps['uiSchema.x-component-props.showTime']),
      'x-reactions': [
        ...(dateTimeProps['uiSchema.x-component-props.showTime']['x-reactions'] as string[]),
        ...datetimeReactions,
      ],
    },
    'uiSchema.x-component-props.timeFormat': {
      ...lodash.cloneDeep(dateTimeProps['uiSchema.x-component-props.timeFormat']),
    },
    engine: {
      type: 'string',
      title: `{{t("Calculation engine")}}`,
      'x-decorator': 'FormItem',
      'x-component': 'Radio.Group',
      enum: Array.from((evaluators as Registry<Evaluator>).getEntities()).reduce(
        (result: any[], [value, options]) => result.concat({ value, ...options }),
        [],
      ),
      required: true,
      default: 'math.js',
    },
    expression: {
      type: 'string',
      title: `{{t("Expression")}}`,
      required: true,
      'x-component': 'Formula.Expression',
      'x-decorator': 'FormItem',
      'x-component-props': {
        supports: [
          'checkbox',

          'number',
          'percent',
          'integer',
          'number',
          'percent',
          'sequence',

          'input',
          'textarea',
          'email',
          'phone',

          'datetime',
          'createdAt',
          'updatedAt',

          'radioGroup',
          'checkboxGroup',
          'select',
          'multipleSelect',

          // 'json'
        ],
        useCurrentFields: '{{ useCurrentFields }}',
        // evaluate(exp: string) {
        //   const { values } = useForm();
        //   const { evaluate } = evaluators.get(values.engine);
        //   return evaluate(exp);
        // }
      },
      'x-reactions': {
        dependencies: ['engine'],
        fulfill: {
          schema: {
            description: '{{renderExpressionDescription($deps[0])}}',
          },
        },
      },
      ['x-validator'](value, rules, { form }) {
        const { values } = form;
        const { evaluate } = (evaluators as Registry<Evaluator>).get(values.engine);
        const exp = value.trim().replace(/{{\s*([^{}]+)\s*}}/g, '1');
        try {
          evaluate(exp);
          return '';
        } catch (e) {
          return i18n.t('Expression syntax error');
        }
      },
    },
  }),
  sequence: () => ({
    unique,
    patterns: {
      type: 'array',
      title: `{{t("Sequence rules")}}`,
      required: true,
      'x-decorator': 'FormItem',
      'x-component': 'ArrayTable',
      items: {
        type: 'object',
        properties: {
          sort: {
            type: 'void',
            'x-component': 'ArrayTable.Column',
            'x-component-props': { width: 50, title: '', align: 'center' },
            properties: {
              sort: {
                type: 'void',
                'x-component': 'ArrayTable.SortHandle',
              },
            },
          },
          type: {
            type: 'void',
            'x-component': 'ArrayTable.Column',
            'x-component-props': { title: `{{t("Type")}}` },
            // 'x-hidden': true,
            properties: {
              type: {
                type: 'string',
                name: 'type',
                required: true,
                'x-decorator': 'FormItem',
                'x-component': RuleTypeSelect,
              },
            },
          },
          options: {
            type: 'void',
            'x-component': 'ArrayTable.Column',
            'x-component-props': { title: `{{t("Rule content")}}` },
            properties: {
              options: {
                type: 'object',
                name: 'options',
                'x-component': RuleOptions,
              },
            },
          },
          operations: {
            type: 'void',
            'x-component': 'ArrayTable.Column',
            'x-component-props': {
              title: `{{t("Operations")}}`,
              dataIndex: 'operations',
              fixed: 'right',
              className: css`
                > *:not(:last-child) {
                  margin-right: 0.5em;
                }
                button {
                  padding: 0;
                }
              `,
            },
            properties: {
              config: {
                type: 'void',
                properties: {
                  options: {
                    type: 'object',
                    'x-component': RuleConfigForm,
                  },
                },
              },
              remove: {
                type: 'void',
                'x-component': 'ArrayTable.Remove',
              },
            },
          },
        },
      },
      properties: {
        add: {
          type: 'void',
          'x-component': 'ArrayTable.Addition',
          'x-component-props': {
            defaultValue: { type: 'integer', options: { digits: 1, start: 0 } },
          },
          title: `{{t("Add rule")}}`,
        },
      },
    },
    inputable: {
      type: 'boolean',
      title: `{{t("Inputable")}}`,
      'x-decorator': 'FormItem',
      'x-component': 'Checkbox',
    },
    match: {
      type: 'boolean',
      title: `{{t("Match rules")}}`,
      'x-decorator': 'FormItem',
      'x-component': 'Checkbox',
      'x-reactions': {
        dependencies: ['inputable'],
        fulfill: {
          state: {
            value: '{{$deps[0] && $self.value}}',
            visible: '{{$deps[0] === true}}',
          },
        },
      },
    },
  }),
  collection: () => ({
    'uiSchema.enum': collectionDataSource,
  }),
} as const;
