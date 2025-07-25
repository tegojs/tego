import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  FormActiveFieldsProvider,
  FormBlockContext,
  RecordProvider,
  useFieldComponentName,
  useFormActiveFields,
  useTranslation,
} from '@tachybase/client';
import { createForm, FormContext, SchemaContext, uid } from '@tachybase/schema';

import { Layout, Tabs } from 'antd';
import _, { cloneDeep } from 'lodash';

import {
  ContextCleaner,
  FieldContext,
  SchemaComponentsContext,
  SchemaExpressionScopeContext,
  SchemaMarkupContext,
  SchemaOptionsContext,
} from '../../../../../../schema/src/react';
import { useApp } from '../../../../application';
import { usePageRefresh } from '../../../../built-in/dynamic-page/PageRefreshContext';
import { useCollection_deprecated } from '../../../../collection-manager';
import * as components from '../../../../collection-manager/Configuration/components';
import { CollectionFieldProvider } from '../../../../data-source';
import { SchemaComponent, SchemaComponentContext, useSchemaComponentContext } from '../../../../schema-component';
import { findSchema } from '../../../../schema-initializer/utils';
import { useEditableSelectedField } from './EditableSelectedFieldContext';
import { useEditableSelectedForm } from './EditableSelectedFormContent';
import { useStyles } from './styles';

export const EditorFieldFormProperty = ({ schema, setSchemakey, eddn }) => {
  const { Sider } = Layout;
  const { styles } = useStyles();
  const { t } = useTranslation();
  return (
    <Sider width={300} style={{ background: 'white', overflow: 'auto' }}>
      <Tabs
        defaultActiveKey="field"
        centered
        tabBarGutter={50}
        items={[
          {
            label: t('Field properties'),
            key: 'field',
            children: <EditorFieldProperty schema={schema} setSchemakey={setSchemakey} />,
          },
          {
            label: t('Form properties'),
            key: 'form',
            children: <EditorFormProperty schema={schema} />,
          },
        ]}
      />
    </Sider>
  );
};

const EditorFieldProperty = ({ schema, setSchemakey }) => {
  const allCTX = useEditableSelectedField();
  const { t } = useTranslation();
  const { setEditableField, fieldSchema: currentSchema, ...ctxValues } = allCTX;
  const schemaUID = currentSchema?.['x-uid'] || null;
  const fieldSchema = useMemo(() => {
    if (!schema || !schemaUID) return null;
    return findSchema(schema, 'x-uid', schemaUID) || null;
  }, [schema, schemaUID]);

  const shouldRender = schema && schemaUID && fieldSchema?.name;

  return shouldRender ? (
    <div key={schemaUID}>
      <AllSchemaProviders fieldSchema={fieldSchema} {...ctxValues}>
        <CollectionFieldProvider name={fieldSchema.name}>
          <FieldProperties />
        </CollectionFieldProvider>
      </AllSchemaProviders>
    </div>
  ) : (
    <div
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#999',
        fontSize: '14px',
        marginTop: '20%',
      }}
    >
      {t('Click a field to start customizing its properties')}
    </div>
  );
};

const FieldProperties = () => {
  const fieldComponentName = useFieldComponentName();
  const { refreshKey } = usePageRefresh();
  return (
    <div key={refreshKey}>
      <FieldPropertiesContent key={fieldComponentName} fieldComponentName={fieldComponentName} />
    </div>
  );
};

const AllSchemaProviders = ({
  children,
  form = null,
  field = null,
  fieldSchema = null,
  schemaMarkup = null,
  expressionScope = null,
  schemaComponents = null,
  schemaOptions = null,
  formBlockValue = null,
}) => {
  const upLevelActiveFields = useFormActiveFields();
  const designerCtx = useSchemaComponentContext();
  const { getField } = useCollection_deprecated();
  const record = getField(fieldSchema.name);
  return (
    <ContextCleaner>
      <FormContext.Provider value={form}>
        <FieldContext.Provider value={field}>
          <SchemaMarkupContext.Provider value={schemaMarkup}>
            <SchemaContext.Provider value={fieldSchema}>
              <SchemaExpressionScopeContext.Provider value={expressionScope}>
                <SchemaComponentsContext.Provider value={schemaComponents}>
                  <SchemaOptionsContext.Provider value={schemaOptions}>
                    <FormBlockContext.Provider value={formBlockValue}>
                      <FormActiveFieldsProvider
                        name="form"
                        getActiveFieldsName={upLevelActiveFields?.getActiveFieldsName}
                      >
                        <SchemaComponentContext.Provider value={{ ...designerCtx, designable: false }}>
                          <RecordProvider record={record}>{children}</RecordProvider>
                        </SchemaComponentContext.Provider>
                      </FormActiveFieldsProvider>
                    </FormBlockContext.Provider>
                  </SchemaOptionsContext.Provider>
                </SchemaComponentsContext.Provider>
              </SchemaExpressionScopeContext.Provider>
            </SchemaContext.Provider>
          </SchemaMarkupContext.Provider>
        </FieldContext.Provider>
      </FormContext.Provider>
    </ContextCleaner>
  );
};

const FieldPropertiesContent = ({ fieldComponentName }) => {
  const app = useApp();
  const [form] = useState(() => createForm());
  const specificItems =
    app.editableSchemaSettingsManager.get(`editableFieldSettings:component:${fieldComponentName}`)?.options?.items ??
    [];
  const genericItems = app.editableSchemaSettingsManager.get('editableFieldSettings:FormItem')?.options?.items ?? [];
  const fieldsInterface =
    app.editableSchemaSettingsManager.get('editableFieldSettings:Fields:Infterface')?.options?.items ?? [];
  const items = [...fieldsInterface, ...genericItems, ...specificItems];
  const { handleUpdate, components: itemsComponents, fullSchema, itemStates, initialValues } = useEditableItems(items);
  form.setValues(initialValues);

  return (
    <div style={{ padding: '10px' }}>
      {items.map((item, index) => (
        <ItemWithHooks
          key={item.name || index}
          item={item}
          onUpdate={(state) => handleUpdate(item.name || index, state)}
        />
      ))}
      <SchemaComponent schema={fullSchema} components={{ ...components, ...itemsComponents }} />
    </div>
  );
};

const useEditableItems = (items: any[]) => {
  const [itemStates, setItemStates] = useState({});

  const handleUpdate = useCallback((name, state) => {
    setItemStates((prev) => {
      if (prev[name] === state) return prev;
      return { ...prev, [name]: state };
    });
  }, []);

  const components = useMemo(() => {
    return items.reduce((acc, item) => {
      if (item.components && typeof item.components === 'object') {
        Object.assign(acc, item.components);
      }
      return acc;
    }, {});
  }, [items]);

  const fieldSchemas = {};
  const initialValues = {};
  for (const name in itemStates) {
    const item = itemStates[name];
    if (!item?.isVisible || !item?.schema) continue;

    fieldSchemas[name] = {
      ...item.schema,
      name,
      'x-component-props': {
        ...item.schema['x-component-props'],
        ...item.props,
      },
    };

    if (item.props?.value !== undefined) {
      initialValues[name] = item.props.value;
    }
  }

  const formId = useMemo(() => uid(), []);
  const editableForm = useMemo(() => createForm(), []);
  const editableSchema = {
    type: 'void',
    properties: {
      [formId]: {
        type: 'void',
        'x-component': 'FormV2',
        'x-component-props': {
          form: editableForm,
        },
        properties: fieldSchemas,
      },
    },
  };

  return {
    itemStates,
    handleUpdate,
    components,
    fieldSchemas,
    initialValues,
    fullSchema: editableSchema,
  };
};

const ItemWithHooks = ({ item, onUpdate }) => {
  const isVisible = item.useVisible ? (item.useVisible() ?? false) : true;
  const schema = item.useSchema?.();
  useEffect(() => {
    onUpdate({
      name: item.name,
      isVisible,
      schema,
    });
  }, [item.name, isVisible]);
  return null;
};

const EditorFormProperty = ({ schema }) => {
  const allCTX = useEditableSelectedForm();
  const { setEditableForm, fieldSchema, ...ctxValues } = allCTX;

  const shouldRender = schema && fieldSchema?.name;
  return shouldRender ? (
    <div>
      <AllSchemaProviders fieldSchema={fieldSchema} {...ctxValues}>
        <FormPropertyContent />
      </AllSchemaProviders>
    </div>
  ) : null;
};

const FormPropertyContent = () => {
  const app = useApp();
  const [form] = useState(() => createForm());
  const formPropertyItems =
    app.editableSchemaSettingsManager.get('blockEditableSettings:createForm')?.options?.items ?? [];
  const { handleUpdate, components, fullSchema, itemStates, initialValues } = useEditableItems(formPropertyItems);

  form.setValues(initialValues);

  return (
    <div style={{ padding: '10px' }}>
      {formPropertyItems.map((item, index) => (
        <ItemWithHooks
          key={item.name || index}
          item={item}
          onUpdate={(state) => handleUpdate(item.name || index, state)}
        />
      ))}
      <SchemaComponent schema={fullSchema} components={components} />
    </div>
  );
};
