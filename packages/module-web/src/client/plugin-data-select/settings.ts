import {
  compatibleDataId,
  SchemaSettings,
  useCollectionManager,
  useCompile,
  useDesignable,
  useTranslation,
} from '@tachybase/client';
import { Field, useField, useFieldSchema } from '@tachybase/schema';

import { SelectProps } from 'antd';

import { useDataTemplates } from './DataSelect';

export type CollectionSelectProps = SelectProps<any, any> & {
  filter?: (item: any, index: number, array: any[]) => boolean;
  isTableOid?: boolean;
};

export const dataSelectSettings = new SchemaSettings({
  name: 'fieldSettings:component:DataSelect',
  items: [
    {
      name: 'templateSelect',
      type: 'select',
      useComponentProps() {
        const { templates } = useDataTemplates();
        const templateOptions = compatibleDataId(templates);
        const { t } = useTranslation();
        const field = useField<Field>();
        const fieldSchema = useFieldSchema();
        const { dn } = useDesignable();
        return {
          title: t('Template Select'),
          value: field.componentProps?.templateKey || 'none',
          fieldNames: { label: 'title', value: 'key' },
          options: templateOptions,
          onChange(templateKey) {
            const schema = {
              ['x-uid']: fieldSchema['x-uid'],
            };
            fieldSchema['x-component-props']['templateKey'] = templateKey;
            fieldSchema['x-acl-ignore'] = true;
            schema['x-component-props'] = fieldSchema['x-component-props'];
            schema['x-acl-ignore'] = true;
            field.componentProps.templateKey = templateKey;
            dn.emit('patch', {
              schema,
            });
          },
        };
      },
    },
    {
      name: 'collectionSelect',
      type: 'select',
      useComponentProps() {
        const cm = useCollectionManager();
        const compile = useCompile();
        // TODO: data source
        const options = cm.getCollections().map((item) => ({
          label: compile(item.title),
          value: item.name,
        }));
        const { t } = useTranslation();
        const field = useField<Field>();
        const fieldSchema = useFieldSchema();
        const { dn } = useDesignable();
        return {
          title: t('Collection Select'),
          value: field.componentProps?.collection,
          options: options,
          onChange(collection) {
            const schema = {
              ['x-uid']: fieldSchema['x-uid'],
            };
            fieldSchema['x-component-props']['collection'] = collection;
            fieldSchema['x-acl-ignore'] = true;
            schema['x-component-props'] = fieldSchema['x-component-props'];
            schema['x-acl-ignore'] = true;
            field.componentProps.collection = collection;
            dn.emit('patch', {
              schema,
            });
          },
        };
      },
    },
  ],
});
