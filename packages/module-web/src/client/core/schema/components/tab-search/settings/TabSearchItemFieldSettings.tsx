import {
  SchemaSettings,
  SchemaSettingsDataScope,
  useCollection,
  useCollectionManager,
  useCompile,
  useDesignable,
  useFormBlockContext,
  useTranslation,
} from '@tachybase/client';
import { useField, useFieldSchema } from '@tachybase/schema';

import _ from 'lodash';

import { isTabSearchCollapsibleInputItem } from '../utils';

export const TabSearchItemFieldSettings = new SchemaSettings({
  name: 'fieldSettings:TabSearchItem',
  items: [
    {
      name: 'decoratorOptions',
      type: 'itemGroup',
      hideIfNoChildren: true,
      useComponentProps() {
        const { t } = useTranslation();
        return {
          title: t('Generic properties'),
        };
      },
      useChildren() {
        return [
          {
            name: 'setTheDataScope',
            Component: SchemaSettingsDataScope,
            useComponentProps() {
              const fieldSchema = useFieldSchema();
              const { form } = useFormBlockContext();
              const field = useField();
              const cm = useCollectionManager();
              const collection = useCollection();
              const collectionField =
                collection.getField(fieldSchema['fieldName']) ||
                cm.getCollectionField(fieldSchema['x-collection-field']);
              const { dn } = useDesignable();

              return {
                collectionName: collectionField?.target,
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
            useVisible() {
              const fieldSchema = useFieldSchema();
              return !isTabSearchCollapsibleInputItem(fieldSchema['x-component']);
            },
          },
          {
            name: 'titleField',
            type: 'select',
            useComponentProps() {
              const fieldSchema = useFieldSchema();
              const { t } = useTranslation();
              const cm = useCollectionManager();
              const collection = useCollection();

              const propsInSchema = fieldSchema['x-component-props'] || {};
              const { collectionName, currentCollection, correlation } = propsInSchema;
              const fieldCollection = currentCollection || collectionName || collection.name;

              const collectionField =
                collection.getField(fieldSchema['fieldName']) ||
                cm.getCollectionField(fieldSchema['x-collection-field']) ||
                cm.getCollection(fieldCollection + '.' + correlation);
              const compile = useCompile();
              const { dn } = useDesignable();
              const targetFields = collectionField?.target ? cm.getCollectionFields(collectionField?.target) : [];
              const options = targetFields
                .filter((field) => !field?.target && field.type !== 'boolean')
                .map((field) => ({
                  value: field?.name,
                  label: compile(field?.uiSchema?.title) || field?.name,
                }));
              const onTitleFieldChange = (label) => {
                const schema = {
                  ['x-uid']: fieldSchema['x-uid'],
                };

                const fieldNames = {
                  ...collectionField?.uiSchema?.['x-component-props']?.['fieldNames'],
                  ...fieldSchema['x-component-props']?.['fieldNames'],
                  label,
                };
                fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
                fieldSchema['x-component-props']['fieldNames'] = fieldNames;

                schema['x-component-props'] = fieldSchema['x-component-props'];
                dn.emit('patch', {
                  schema,
                });
                dn.refresh();
              };

              return {
                key: 'title-field',
                title: t('Title field'),
                options: options,
                value: fieldSchema['x-component-props']?.fieldNames?.label,
                onChange: onTitleFieldChange,
              };
            },
            useVisible() {
              const fieldSchema = useFieldSchema();
              return (
                isTabSearchCollapsibleInputItem(fieldSchema['x-component']) ||
                fieldSchema['x-component-props']?.['correlation']
              );
            },
          },
        ];
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
      useComponentProps() {
        const { t } = useTranslation();
        const fieldSchema = useFieldSchema();
        const { dn } = useDesignable();
        return {
          removeParentsIfNoChildren: true,
          confirm: {
            title: t('Delete field'),
          },
          breakRemoveOn: (s) => {
            if (isTabSearchCollapsibleInputItem(fieldSchema['x-component'])) {
              Object.values(s.properties).forEach((value) => {
                if (isTabSearchCollapsibleInputItem(value['x-component']) && value.name !== fieldSchema.name) {
                  delete s.properties[value.name];
                }
              });
              dn.emit('patch', { schema: s });
            }
            return s['x-component'] === 'TabSearch';
          },
        };
      },
    },
  ],
});
