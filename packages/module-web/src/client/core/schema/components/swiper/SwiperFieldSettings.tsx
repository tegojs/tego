import {
  SchemaSettings,
  SchemaSettingsDataScope,
  useCollection,
  useCompile,
  useDesignable,
  useFormBlockContext,
  useTranslation,
} from '@tachybase/client';
import { useField, useFieldSchema } from '@tachybase/schema';

import _ from 'lodash';

export const SwiperFieldSettings = new SchemaSettings({
  name: 'SwiperFieldSettings',
  items: [
    {
      name: 'setTheDataScope',
      Component: SchemaSettingsDataScope,
      useComponentProps() {
        const fieldSchema = useFieldSchema();
        const { form } = useFormBlockContext();
        const field = useField();
        const c = useCollection();
        const { dn } = useDesignable();
        return {
          collectionName: c.getOptions().name,
          defaultFilter: fieldSchema?.['x-component-props']?.params?.filter || {},
          form: form,
          onSubmit: ({ filter }) => {
            _.set(field.componentProps, 'params', {
              ...field.componentProps?.params,
              filter,
            });
            fieldSchema['x-component-props']['params'] = field.componentProps.params;
            dn.emit('patch', {
              schema: {
                ['x-uid']: fieldSchema['x-uid'],
                'x-component-props': fieldSchema['x-component-props'],
              },
            });
          },
        };
      },
    },
    {
      name: 'setShowField',
      type: 'select',
      useComponentProps() {
        const fieldSchema = useFieldSchema();
        const { t } = useTranslation();
        const c = useCollection();
        const compile = useCompile();
        const { dn } = useDesignable();
        const options = c.fields
          .map((field) => {
            if (field?.interface === 'attachment') {
              return {
                label: compile(field.uiSchema?.title) || field.name,
                value: field.name,
              };
            }
          })
          .filter(Boolean);
        const onChange = (label) => {
          const schema = {
            ['x-uid']: fieldSchema['x-uid'],
          };
          fieldSchema['x-component-props']['fieldValue'] = label;
          schema['x-component-props'] = fieldSchema['x-component-props'];
          dn.emit('patch', {
            schema,
          });
          dn.refresh();
        };
        return {
          title: t('Set show field'),
          options,
          value: fieldSchema['x-component-props'].fieldValue,
          onChange,
        };
      },
    },
    {
      name: 'setFieldCount',
      type: 'select',
      useComponentProps() {
        const fieldSchema = useFieldSchema();
        const { dn } = useDesignable();
        const { t } = useTranslation();
        const options = [];
        for (let i = 1; i <= 20; i++) {
          options.push({
            label: i,
            value: i,
          });
        }
        const onChange = (value) => {
          fieldSchema['x-component-props']['pageSize'] = value;
          dn.emit('patch', {
            schema: {
              ['x-uid']: fieldSchema['x-uid'],
              ['x-component-props']: fieldSchema['x-component-props'],
            },
          });
          dn.refresh();
        };
        return {
          title: t('Set field count'),
          options,
          value: fieldSchema['x-component-props'].pageSize || 5,
          onChange,
        };
      },
    },
    {
      name: 'divider',
      type: 'divider',
    },
    {
      name: 'delete',
      type: 'remove',
      sort: 100,
    },
  ],
});
