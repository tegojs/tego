import React from 'react';
import { Field, ISchema, useField, useFieldSchema } from '@tachybase/schema';

import { useTranslation } from 'react-i18next';

import { useCollection_deprecated, useCollectionManager_deprecated } from '../collection-manager';
import { useCollection } from '../data-source';
import { useColumnSchema, useCompile, useDesignable } from '../schema-component';
import { SchemaSettingsModalItem } from './SchemaSettings';

export function useFormulaTitleOptions() {
  const compile = useCompile();
  const { getCollectionJoinField, getCollectionFields } = useCollectionManager_deprecated();
  const { getField } = useCollection_deprecated();
  const { fieldSchema: tableColumnSchema } = useColumnSchema();
  const schema = useFieldSchema();
  const fieldSchema = tableColumnSchema || schema;
  const collectionManage = useCollectionManager_deprecated();
  const collectionManageField = collectionManage.collections.filter(
    (value) => value.name === fieldSchema['x-decorator-props'],
  )[0];
  const collectionField = getField(fieldSchema['name']) || getCollectionJoinField(fieldSchema['x-collection-field']);
  const isAssociationField =
    collectionField && ['hasOne', 'hasMany', 'belongsTo', 'belongsToMany'].includes(collectionField.type);
  let fields = [];
  if (collectionField) {
    fields = getCollectionFields(
      collectionField
        ? collectionField.target
          ? collectionField.target
          : collectionField.collectionName
        : fieldSchema['name'],
    );
  } else if (collectionManageField) {
    fields = collectionManageField['fields'];
  }
  const options = [];
  fields?.forEach((field) => {
    if (!['m2m', 'o2m'].includes(field.interface) && isAssociationField) {
      if (field.uiSchema) {
        options.push({
          label: compile(field.uiSchema.title),
          value: field.name,
          children:
            getCollectionFields(field.target)
              ?.filter((subField) => subField.uiSchema)
              .map((subField) => ({
                label: subField.uiSchema ? compile(subField.uiSchema.title) : '',
                value: subField.name,
              })) ?? [],
        });
      }
    }
    if (!isAssociationField && field.name === fieldSchema['name']) {
      options.push({
        label: compile(field.uiSchema.title),
        value: field.name,
        children:
          getCollectionFields(field.target)
            ?.filter((subField) => subField.uiSchema)
            .map((subField) => ({
              label: subField.uiSchema ? compile(subField.uiSchema.title) : '',
              value: subField.name,
            })) ?? [],
      });
    }
  });
  return options;
}

export function EditFormulaTitleField() {
  const { getCollectionJoinField, collections } = useCollectionManager_deprecated();
  const { getField } = useCollection_deprecated();
  const field = useField<Field>();
  const fieldSchema = useFieldSchema();
  const { t } = useTranslation();
  const { dn } = useDesignable();

  let collectionField = getField(fieldSchema['name']) || getCollectionJoinField(fieldSchema['x-collection-field']);
  collectionField = collectionField
    ? collectionField
    : collections.find((value) => value.name === fieldSchema['x-decorator-props'])?.fields;
  const options = useFormulaTitleOptions();
  const editTitle = async (formula) => {
    const schema = {
      ['x-uid']: fieldSchema['x-uid'],
    };
    const fieldNames = {
      ...collectionField?.uiSchema?.['x-component-props']?.['fieldNames'],
      ...field.componentProps.fieldNames,
      formula,
    };
    fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
    fieldSchema['x-component-props']['fieldNames'] = fieldNames;
    schema['x-component-props'] = fieldSchema['x-component-props'];
    field.componentProps.fieldNames = fieldSchema['x-component-props'].fieldNames;
    dn.emit('patch', {
      schema,
    });
    dn.refresh();
  };

  return (
    <SchemaSettingsModalItem
      key="edit-field-title"
      title={t('Custom option label')}
      schema={
        {
          type: 'object',
          title: t('Custom option label'),
          properties: {
            formula: {
              required: true,
              'x-decorator': 'FormItem',
              'x-component': 'Variable.TextArea',
              'x-component-props': {
                scope: options,
              },
              default: field?.componentProps?.fieldNames?.formula || '',
            },
          },
        } as ISchema
      }
      onSubmit={({ formula }) => {
        if (formula) {
          editTitle(formula);
        }
      }}
    />
  );
}

export const useFormulaTitleVisible = () => {
  const fieldSchema = useFieldSchema();
  const options = useFormulaTitleOptions();
  // FIXME 这里现在只有当设置为 select，默认为 select 的时候看不到
  return (
    options.length > 0 &&
    (fieldSchema['x-component-props']?.mode === 'Select' || fieldSchema['x-component'] === 'CollectionField') &&
    fieldSchema['x-component-props']?.fieldNames?.value !== undefined
  );
};
