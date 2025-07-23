import React from 'react';
import { useForm } from '@tachybase/schema';

import { useTranslation } from 'react-i18next';

import { SchemaInitializerChildren, SchemaInitializerItemType } from '../../application';
import { useCollectionManager_deprecated } from '../../collection-manager';
import { useCollectionManager, useExtendCollections } from '../../data-source';
import { useActionContext, useCompile } from '../../schema-component';
import {
  removeGridFormItem,
  useAssociatedFormItemInitializerFields,
  useFilterAssociatedFormItemInitializerFields,
  useFilterInheritsFormItemInitializerFields,
  useInheritsFormItemInitializerFields,
} from '../utils';

export const ParentCollectionFields = () => {
  const inheritFields = useInheritsFormItemInitializerFields();
  const { t } = useTranslation();
  const compile = useCompile();
  if (!inheritFields?.length) return null;
  const res = [];
  inheritFields.forEach((inherit) => {
    Object.values(inherit)[0].length &&
      res.push({
        type: 'itemGroup',
        divider: true,
        title: t(`Parent collection fields`) + '(' + compile(`${Object.keys(inherit)[0]}`) + ')',
        children: Object.values(inherit)[0],
      });
  });
  return <SchemaInitializerChildren>{res}</SchemaInitializerChildren>;
};

export const ExtendCollectionFields = (props) => {
  const collections = useExtendCollections();
  const form = useForm();
  const compile = useCompile();
  const { getInterface, getCollection } = useCollectionManager_deprecated();
  const { fieldSchema } = useActionContext();
  if (!collections) {
    return null;
  }
  const children = collections.map((collection) => {
    // FIXME
    const readPretty = form.readPretty;
    const block = 'Form';
    const action = fieldSchema?.['x-action'];

    return {
      type: 'subMenu',
      title: compile(collection.title),
      children: collection.fields
        ?.filter((field) => field?.interface && !field?.isForeignKey && !field?.treeChildren)
        ?.map((field) => {
          const interfaceConfig = getInterface(field.interface);
          const targetCollection = getCollection(field.target);
          const isFileCollection = field?.target && getCollection(field?.target)?.template === 'file';
          const isAssociationField = targetCollection;
          const fieldNames = field?.uiSchema['x-component-props']?.['fieldNames'];
          const schema = {
            type: 'string',
            name: field.name,
            'x-toolbar': 'FormItemSchemaToolbar',
            'x-settings': 'fieldSettings:FormItem',
            'x-component': 'CollectionField',
            'x-decorator': 'FormItem',
            'x-collection-field': `${collection.name}.${field.name}`,
            'x-component-props': isFileCollection
              ? {
                  fieldNames: {
                    label: 'preview',
                    value: 'id',
                  },
                }
              : isAssociationField && fieldNames
                ? {
                    fieldNames: { ...fieldNames, label: targetCollection?.titleField || fieldNames.label },
                  }
                : {},
            'x-read-pretty': field?.uiSchema?.['x-read-pretty'],
          };
          const resultItem = {
            type: 'item',
            name: field.name,
            title: field?.uiSchema?.title || field.name,
            Component: 'CollectionFieldInitializer',
            remove: removeGridFormItem,
            schemaInitialize: (s) => {
              interfaceConfig?.schemaInitialize?.(s, {
                field,
                block,
                readPretty,
                action,
                targetCollection,
              });
            },
            schema,
          } as SchemaInitializerItemType;
          return resultItem;
        }),
    };
  });
  const res = [];
  res.push({
    type: 'itemGroup',
    title: '{{ t("Extend collections") }}',
    children,
  });
  return <SchemaInitializerChildren>{res}</SchemaInitializerChildren>;
};

export const AssociatedFields = () => {
  const associationFields = useAssociatedFormItemInitializerFields({
    readPretty: true,
    block: 'Form',
  });
  const { t } = useTranslation();
  if (associationFields.length === 0) return null;
  const schema: any = [
    {
      type: 'itemGroup',
      title: t('Display association fields'),
      children: associationFields,
    },
  ];
  return <SchemaInitializerChildren>{schema}</SchemaInitializerChildren>;
};

export const FilterParentCollectionFields = () => {
  const inheritFields = useFilterInheritsFormItemInitializerFields();
  const { t } = useTranslation();
  const compile = useCompile();
  const res = [];
  if (inheritFields?.length > 0) {
    inheritFields.forEach((inherit) => {
      Object.values(inherit)[0].length &&
        res.push({
          divider: true,
          type: 'itemGroup',
          title: t(`Parent collection fields`) + '(' + compile(`${Object.keys(inherit)[0]}`) + ')',
          children: Object.values(inherit)[0],
        });
    });
  }

  return <SchemaInitializerChildren>{res}</SchemaInitializerChildren>;
};

export const FilterAssociatedFields = () => {
  const associationFields = useFilterAssociatedFormItemInitializerFields();
  const { t } = useTranslation();
  const res: any[] = [
    {
      type: 'itemGroup',
      title: t('Display association fields'),
      children: associationFields,
    },
  ];
  return <SchemaInitializerChildren>{res}</SchemaInitializerChildren>;
};
