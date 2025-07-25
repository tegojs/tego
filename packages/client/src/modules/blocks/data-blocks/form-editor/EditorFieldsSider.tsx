import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { RecordProvider, useCurrentAppInfo, useTranslation } from '@tachybase/client';
import { action, createForm, FormContext, ISchema, Schema, uid, useForm } from '@tachybase/schema';

import { FormOutlined } from '@ant-design/icons';
import { Button, Col, Collapse, Layout, Row, Tabs, Tooltip } from 'antd';
import _, { cloneDeep } from 'lodash';

import { SchemaInitializerItemType, useApp } from '../../../../application';
import {
  CollectionOptions,
  ResourceActionProvider,
  useCollection_deprecated,
  useCollectionManager_deprecated,
  useFieldInterfaceOptions,
  useResourceActionContext,
  useResourceContext,
} from '../../../../collection-manager';
import { CollectionRecordContext, useExtendCollections } from '../../../../data-source';
import { Icon } from '../../../../icon';
import { useActionContext, useCompile } from '../../../../schema-component';
import { findSchema, removeGridFormItem } from '../../../../schema-initializer/utils';
import { useStyles } from './styles';

type EditorFieldsSiderProps = {
  schema: Schema;
  handleInsert: (s: ISchema) => void;
  options?: {
    fieldsOptions?: any[];
    fieldsParentOptions?: any[];
    fieldsExtendOptions?: any[];
    associatedFormFieldsOptions?: any[];
  };
  fetchSchema?: () => Promise<void>;
};

interface FieldButtonGridProps {
  schema: Schema;
  items: any[];
  onInsert: (schema: any) => void;
  span?: number;
}

export const EditorFieldsSider = ({ schema, setSchemakey, eddn }) => {
  const record = useCollection_deprecated();
  const { Sider } = Layout;
  const { t } = useTranslation();
  const gridSchema = findSchema(schema, 'x-component', 'EditableGrid') || {};
  const options = {
    fieldsOptions: useFormFieldButtonWrappers(),
    fieldsParentOptions: useFormParentCollectionFieldsButtonWrappers(),
    fieldsExtendOptions: useFormExtendCollectionFieldsButtonWrappers(),
    associatedFormFieldsOptions: useAssociatedFormFieldButtonWrappers({
      readPretty: true,
      block: 'Form',
    }),
  };
  const handleInsert = (s: ISchema) => {
    const wrapedSchema = wrapFieldInGridSchema(s);
    let maxIndex = 0;
    let hasIndex = false;
    gridSchema.mapProperties((subSchema) => {
      const index = subSchema['x-index'];
      if (typeof index === 'number') {
        hasIndex = true;
        if (index > maxIndex) {
          maxIndex = index;
        }
      }
    });
    wrapedSchema['x-index'] = hasIndex ? maxIndex + 1 : 1;
    gridSchema.addProperty(uid(), wrapedSchema);
    setSchemakey(uid());
  };
  const form = useMemo(() => createForm(), []);
  const resourceActionProps = {
    association: {
      sourceKey: 'name',
      targetKey: 'name',
    },
    collection,
    request: {
      resource: 'collections.fields',
      action: 'list',
      params: {
        paginate: false,
        filter: {
          $or: [{ 'interface.$not': null }, { 'options.source.$notEmpty': true }],
        },
        sort: ['sort'],
      },
    },
  };
  return (
    <Sider width={250} style={{ background: 'white', overflow: 'auto' }}>
      <RecordProvider record={record}>
        <ResourceActionProvider {...resourceActionProps}>
          <FormContext.Provider value={form}>
            <Tabs
              defaultActiveKey="existing"
              centered
              tabBarGutter={50}
              items={[
                {
                  label: t('Configure columns'),
                  key: 'existing',
                  children: (
                    <EditorExistFieldsSider schema={gridSchema} options={options} handleInsert={handleInsert} />
                  ),
                },
                {
                  label: t('Add field'),
                  key: 'extra',
                  children: <EditorAddFieldsSider schema={gridSchema} handleInsert={handleInsert} />,
                },
              ]}
            />
          </FormContext.Provider>
        </ResourceActionProvider>
      </RecordProvider>
    </Sider>
  );
};

const EditorExistFieldsSider: React.FC<EditorFieldsSiderProps> = ({ schema, options, handleInsert }) => {
  const { fieldsOptions, fieldsParentOptions, fieldsExtendOptions, associatedFormFieldsOptions } = options;
  const app = useApp();
  const formInitializer = app.schemaInitializerManager.get('form:configureFields');
  const items = formInitializer?.options?.items || [];
  const extraItems = items.filter(
    (item) =>
      !['displayFields', 'parentCollectionFields', 'extendCollectionFields', 'associationFields', 'divider'].includes(
        item.name,
      ),
  );

  const compile = useCompile();
  const { t } = useTranslation();
  const { styles } = useStyles();

  return (
    <div className={styles.fieldsBlock}>
      <p style={{ fontWeight: 400 }}>{t('Display fields')}</p>
      <FieldButtonGrid schema={schema} items={fieldsOptions} onInsert={handleInsert} />

      {fieldsParentOptions?.length > 0 && (
        <>
          <p style={{ fontWeight: 400 }}>{t('Parent collection fields')}</p>
          <Collapse
            items={fieldsParentOptions.map((group, index) => ({
              key: String(index),
              label: compile(group.title),
              children: <FieldButtonGrid schema={schema} items={group.children} onInsert={handleInsert} />,
              styles: { body: { padding: 0 } },
            }))}
            bordered={false}
            style={{ background: 'white' }}
          />
        </>
      )}

      {fieldsExtendOptions?.length > 0 && (
        <>
          <p style={{ fontWeight: 400 }}>{t('Extend collections')}</p>
          <Collapse
            items={fieldsExtendOptions.map((group, index) => ({
              key: String(index),
              label: compile(group.title),
              children: <FieldButtonGrid schema={schema} items={group.children} onInsert={handleInsert} />,
              styles: { body: { padding: 0 } },
            }))}
            bordered={false}
            style={{ background: 'white' }}
          />
        </>
      )}

      {associatedFormFieldsOptions?.length > 0 && (
        <>
          <p style={{ fontWeight: 400, marginBottom: 0 }}>{t('Display association fields')}</p>
          <Collapse
            items={associatedFormFieldsOptions.map((group, index) => ({
              key: String(index),
              label: compile(group.title),
              children: <FieldButtonGrid schema={schema} items={group.children} onInsert={handleInsert} />,
              styles: { body: { padding: 0 } },
            }))}
            bordered={false}
            style={{ background: 'white' }}
          />
        </>
      )}

      <p style={{ fontWeight: 400 }}>{t('Other fields')}</p>
      <FieldButtonGrid
        schema={schema}
        items={extraItems.map((item) =>
          item.name === 'addText'
            ? {
                ...item,
                schema: {
                  type: 'void',
                  name: uid(),
                  'x-editable': false,
                  'x-decorator': 'FormItem',
                  'x-toolbar': 'BlockSchemaToolbar',
                  'x-settings': 'blockSettings:markdown',
                  'x-component': 'Markdown.Void',
                  'x-component-props': {
                    content: '{{t("This is a demo text, **supports Markdown syntax**.")}}',
                  },
                },
              }
            : item,
        )}
        onInsert={handleInsert}
        span={24}
      />
    </div>
  );
};

const FieldButtonGrid: React.FC<FieldButtonGridProps> = ({ schema, items, onInsert, span = 12 }) => {
  const compile = useCompile();
  return (
    <Row gutter={[8, 8]} style={{ marginBottom: '20px', rowGap: '12px' }}>
      {items.map((item, index) => {
        const s = item.schema;
        let exists = false;
        if (schema && s?.name) {
          exists = !!findSchema(schema, 'name', String(s.name));
        }

        return (
          <Col span={span} key={item.name || index} style={{ paddingLeft: '8px', paddingRight: '8px' }}>
            <Tooltip title={compile(item.title)} arrow={false} overlayInnerStyle={{ fontSize: 12 }}>
              <Button
                className="ant-btn-fields"
                variant="filled"
                style={{ alignItems: 'center', justifyContent: 'flex-start' }}
                onClick={() => {
                  if (exists) return;
                  item?.schemaInitialize?.(s);
                  onInsert(s);
                }}
                disabled={!!exists}
              >
                <Icon type={item.icon || 'EditOutlined'} style={{ fontSize: 14 }} />
                <span
                  style={{
                    flexShrink: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: 12,
                  }}
                >
                  {compile(item.title)}
                </span>
              </Button>
            </Tooltip>
          </Col>
        );
      })}
    </Row>
  );
};

const EditorAddFieldsSider: React.FC<EditorFieldsSiderProps> = ({ schema: gridSchema, handleInsert }) => {
  const { data: record } = useContext(CollectionRecordContext);
  const {
    data: { database },
  } = useCurrentAppInfo();
  const { getInterface, getTemplate, collections, getCollection, getCollections, refreshCM } =
    useCollectionManager_deprecated();
  const { refresh } = useResourceActionContext();
  const compile = useCompile();
  const { t } = useTranslation();
  const options = useFieldInterfaceOptions();
  const { styles } = useStyles();
  const fields = getCollection(record.name)?.options?.fields || record.fields || [];
  const { resource } = useResourceContext();
  const getFieldOptions = useCallback(() => {
    const { availableFieldInterfaces } = getTemplate(record.template) || {};
    const { exclude, include } = (availableFieldInterfaces || {}) as any;
    const optionArr = [];
    options.forEach((v) => {
      if (v.key === 'systemInfo') {
        optionArr.push({
          ...v,
          children: v.children.filter((v) => {
            if (v.hidden) {
              return false;
            } else if (v.value === 'tableoid') {
              if (include?.length) {
                return include.includes(v.value);
              }
              return database?.dialect === 'postgres';
            } else {
              return typeof record[v.value] === 'boolean' ? record[v.value] : true;
            }
          }),
        });
      } else {
        let children = [];
        if (include?.length) {
          include.forEach((k) => {
            const field = v?.children?.find((h) => [k, k.interface].includes(h.name));
            field &&
              children.push({
                ...field,
                targetScope: k?.targetScope,
              });
          });
        } else if (exclude?.length) {
          children = v?.children?.filter((v) => {
            return !exclude.includes(v.name);
          });
        } else {
          children = v?.children;
        }
        children?.length &&
          optionArr.push({
            ...v,
            children,
          });
      }
    });
    return optionArr;
  }, [getTemplate, record]);
  const items = useMemo(() => {
    return getFieldOptions()
      .map((option) => {
        if (option?.children?.length === 0) {
          return null;
        }
        if (record.template === 'view') {
          return {
            type: 'group',
            label: compile(option.label),
            title: compile(option.label),
            key: option.label,
            children: option.children
              .filter((child) => ['m2o', 'custom', 'm2m'].includes(child.name))
              .map((child) => {
                return {
                  label: compile(child.title),
                  title: compile(child.title),
                  icon: child.icon,
                  key: child.name,
                  dataTargetScope: child.targetScope,
                };
              }),
          };
        }
        return {
          type: 'group',
          label: compile(option.label),
          title: compile(option.label),
          key: option.label,
          children: option?.children
            .filter((child) => !['o2o', 'subTable', 'linkTo'].includes(child.name))
            .map((child) => {
              return {
                label: compile(child.title),
                title: compile(child.title),
                icon: child.icon,
                key: child.name,
                dataTargetScope: child.targetScope,
              };
            }),
        };
      })
      .filter((v) => v?.children?.length);
  }, [getFieldOptions]);

  return (
    record.template !== 'sql' && (
      <div className={styles.fieldsBlock}>
        {items.map((group, index) => (
          <div key={index}>
            <p style={{ fontWeight: 400, fontSize: 14 }}>{group.title}</p>
            <Row gutter={[8, 8]} style={{ marginBottom: '20px', rowGap: '12px' }}>
              {group.children.map((item, index) => (
                <Col span={12} key={item.key || index} style={{ paddingLeft: '8px', paddingRight: '8px' }}>
                  <Tooltip title={compile(item.title)} arrow={false} overlayInnerStyle={{ fontSize: 12 }}>
                    <Button
                      className="ant-btn-fields"
                      variant="filled"
                      style={{ alignItems: 'center', justifyContent: 'flex-start' }}
                      onClick={async () => {
                        const defaultSchema = getInterface(item.key);
                        const initialValue: any = {
                          name: `f_${uid()}`,
                          ...cloneDeep(defaultSchema.default),
                          interface: defaultSchema.name,
                        };
                        if (!initialValue.uiSchema) {
                          initialValue.uiSchema = {};
                        }
                        const relationInterfaces = ['oho', 'o2o', 'obo', 'o2m', 'm2m', 'm2o'];
                        if (relationInterfaces.includes(initialValue.interface)) {
                          initialValue.target = '__temp__';
                          if (!['oho', 'o2o'].includes(initialValue.interface)) {
                            initialValue.targetKey = 'id';
                          }
                        }
                        initialValue.uiSchema.title = item.title || compile('Unnamed');
                        if (initialValue.reverseField) {
                          initialValue.reverseField.name = `f_${uid()}`;
                        }
                        if (initialValue.autoCreateReverseField) {
                          /* empty */
                        } else {
                          delete initialValue.reverseField;
                        }
                        delete initialValue.autoCreateReverseField;
                        const interfaceConfig = getInterface(initialValue.interface);
                        const targetCollection = getCollection(initialValue.target);
                        const isFileCollection =
                          initialValue?.target && getCollection(initialValue?.target)?.template === 'file';
                        const isAssociationField = targetCollection;
                        const fieldNames = initialValue?.uiSchema['x-component-props']?.['fieldNames'];
                        const editableFieldSchema = {
                          type: 'string',
                          name: initialValue.name,
                          'x-toolbar': 'EditableFormItemSchemaToolbar',
                          'x-settings': 'fieldSettings:FormItem',
                          'x-component': 'CollectionField',
                          'x-decorator': 'FormItem',
                          'x-collection-field': `${record.name}.${initialValue.name}`,
                          'x-component-props': isFileCollection
                            ? {
                                fieldNames: {
                                  label: 'preview',
                                  value: 'id',
                                },
                              }
                            : isAssociationField && fieldNames
                              ? {
                                  fieldNames: {
                                    ...fieldNames,
                                    label: targetCollection?.titleField || fieldNames.label,
                                  },
                                }
                              : {},
                          'x-read-pretty': initialValue?.uiSchema?.['x-read-pretty'],
                        };
                        interfaceConfig?.schemaInitialize?.(editableFieldSchema, {
                          field: initialValue,
                          block: 'Form',
                          readPretty: false,
                          action,
                          targetCollection,
                        });
                        await resource.create({ values: initialValue });
                        refresh();
                        await refreshCM();
                        handleInsert(editableFieldSchema);
                      }}
                    >
                      <Icon type={item.icon || 'EditOutlined'} style={{ fontSize: 14 }} />
                      <span
                        style={{
                          flexShrink: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: 12,
                        }}
                      >
                        {compile(item.title)}
                      </span>
                    </Button>
                  </Tooltip>
                </Col>
              ))}
            </Row>
          </div>
        ))}
      </div>
    )
  );
};

function wrapFieldInGridSchema(field: any): Record<string, any> {
  const rowUID = uid();
  const colUID = uid();
  const fieldUID = uid();

  return {
    type: 'void',
    'x-component': 'EditableGrid.Row',
    _isJSONSchemaObject: true,
    version: '2.0',
    'x-uid': rowUID,
    'x-async': false,
    'x-index': 1,
    properties: {
      [colUID]: {
        type: 'void',
        'x-component': 'EditableGrid.Col',
        _isJSONSchemaObject: true,
        version: '2.0',
        'x-uid': colUID,
        'x-async': false,
        'x-index': 1,
        properties: {
          [field.name]: {
            ...field,
            _isJSONSchemaObject: true,
            version: '2.0',
            'x-uid': fieldUID,
            'x-async': false,
            'x-index': 1,
          },
        },
      },
    },
  };
}

const collection: CollectionOptions = {
  name: 'fields',
  fields: [
    {
      type: 'string',
      name: 'type',
      interface: 'input',
      uiSchema: {
        title: '{{ t("Storage type") }}',
        type: 'string',
        'x-component': 'Select',
        enum: [
          {
            label: 'String',
            value: 'string',
          },
        ],
        required: true,
      },
    },
    {
      type: 'string',
      name: 'interface',
      interface: 'input',
      uiSchema: {
        title: '{{ t("Field interface") }}',
        type: 'string',
        'x-component': 'Select',
        enum: '{{interfaces}}',
      },
    },
    {
      type: 'string',
      name: 'title',
      interface: 'input',
      uiSchema: {
        title: '{{ t("Field display name") }}',
        type: 'string',
        'x-component': 'Input',
        required: true,
      },
    },
    {
      type: 'string',
      name: 'name',
      interface: 'input',
      uiSchema: {
        title: '{{ t("Field name") }}',
        type: 'string',
        'x-component': 'Input',
      },
    },
    {
      type: 'string',
      name: 'description',
      interface: 'input',
      uiSchema: {
        title: '{{ t("Description") }}',
        type: 'string',
        'x-component': 'Input.TextArea',
      },
    },
  ],
};

const useFormFieldButtonWrappers = (options?: any) => {
  const { name } = useCollection_deprecated();
  const { getInterface, getCollection, getCollectionFields } = useCollectionManager_deprecated();
  const fields = getCollectionFields(name) || [];
  const form = useForm();
  const { readPretty = form.readPretty, block = 'Form' } = options || {};
  const { fieldSchema } = useActionContext();
  const action = fieldSchema?.['x-action'];

  return fields
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
        'x-toolbar': 'EditableFormItemSchemaToolbar',
        'x-settings': 'fieldSettings:FormItem',
        'x-component': 'CollectionField',
        'x-decorator': 'FormItem',
        'x-collection-field': `${name}.${field.name}`,
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
        icon: interfaceConfig.icon || 'EditOutlined',
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
      if (block === 'Kanban') {
        resultItem['find'] = (schema: Schema, key: string, action: string) => {
          const s = findSchema(schema, 'x-component', block);
          return findSchema(s, key, action);
        };
      }
      return resultItem;
    });
};

const useFormParentCollectionFieldsButtonWrappers = (options?) => {
  const { name } = useCollection_deprecated();
  const { getInterface, getInheritCollections, getCollection, getParentCollectionFields } =
    useCollectionManager_deprecated();
  const inherits = getInheritCollections(name);
  const { snapshot } = useActionContext();
  const form = useForm();
  const compile = useCompile();

  return inherits?.map((v) => {
    const fields = getParentCollectionFields(v, name);
    const { readPretty = form.readPretty, block = 'Form', component = 'CollectionField' } = options || {};
    const targetCollection = getCollection(v);
    return {
      title: compile(targetCollection?.title),
      children: fields
        ?.filter((field) => field?.interface && !field?.isForeignKey)
        ?.map((field) => {
          const interfaceConfig = getInterface(field.interface);
          const targetCollection = getCollection(field.target);
          // const component =
          //   field.interface === 'o2m' && targetCollection?.template !== 'file' && !snapshot
          //     ? 'TableField'
          //     : 'CollectionField';
          const schema = {
            type: 'string',
            name: field.name,
            title: field?.uiSchema?.title || field.name,
            // 'x-designer': 'FormItem.Designer',
            'x-toolbar': 'EditableFormItemSchemaToolbar',
            'x-settings': 'fieldSettings:FormItem',
            'x-component': component,
            'x-decorator': 'FormItem',
            'x-collection-field': `${name}.${field.name}`,
            'x-component-props': {},
            'x-read-pretty': field?.uiSchema?.['x-read-pretty'],
          };
          interfaceConfig?.schemaInitialize?.(schema, {
            field,
            block,
            readPretty,
            targetCollection,
          });
          const resultItem = {
            name: field?.uiSchema?.title || field.name,
            type: 'item',
            title: field?.uiSchema?.title || field.name,
            icon: interfaceConfig.icon || 'EditOutlined',
            Component: 'CollectionFieldInitializer',
            remove: removeGridFormItem,
            schemaInitialize: (s) => {
              interfaceConfig?.schemaInitialize?.(s, {
                field,
                block,
                readPretty,
                targetCollection,
              });
            },
            schema,
          } as SchemaInitializerItemType;
          return resultItem;
        }),
    };
  });
};

const useFormExtendCollectionFieldsButtonWrappers = (options?) => {
  const collections = useExtendCollections();
  const form = useForm();
  const compile = useCompile();
  const { getInterface, getCollection } = useCollectionManager_deprecated();
  const { fieldSchema } = useActionContext();
  if (!collections) {
    return null;
  }
  return collections.map((collection) => {
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
            'x-toolbar': 'EditableFormItemSchemaToolbar',
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
            icon: interfaceConfig.icon || 'EditOutlined',
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
};

const useAssociatedFormFieldButtonWrappers = (options?: any) => {
  const { name } = useCollection_deprecated();

  const { getInterface, getCollectionFields, getCollection } = useCollectionManager_deprecated();
  const fields = getCollectionFields(name) || [];

  const form = useForm();
  const { readPretty = form.readPretty, block = 'Form' } = options || {};
  const interfaces = block === 'Form' ? ['m2o'] : ['o2o', 'oho', 'obo', 'm2o'];
  const groups = fields
    ?.filter((field) => {
      return interfaces.includes(field.interface);
    })
    ?.map((field) => {
      const subFields = getCollectionFields(field.target);
      const items = subFields
        ?.filter(
          (subField) => subField?.interface && !['subTable'].includes(subField?.interface) && !subField.treeChildren,
        )
        ?.map((subField) => {
          const interfaceConfig = getInterface(subField.interface);
          const isFileCollection = field?.target && getCollection(field?.target)?.template === 'file';
          const schema = {
            type: 'string',
            name: `${field.name}.${subField.name}`,
            // 'x-designer': 'FormItem.Designer',
            'x-toolbar': 'EditableFormItemSchemaToolbar',
            'x-settings': 'fieldSettings:FormItem',
            'x-component': 'CollectionField',
            'x-read-pretty': readPretty,
            'x-component-props': {
              'pattern-disable': block === 'Form' && readPretty,
              fieldNames: isFileCollection
                ? {
                    label: 'preview',
                    value: 'id',
                  }
                : undefined,
            },
            'x-decorator': 'FormItem',
            'x-collection-field': `${name}.${field.name}.${subField.name}`,
          };
          return {
            name: subField?.uiSchema?.title || subField.name,
            type: 'item',
            icon: interfaceConfig.icon || 'EditOutlined',
            title: subField?.uiSchema?.title || subField.name,
            Component: 'CollectionFieldInitializer',
            remove: removeGridFormItem,
            schemaInitialize: (s) => {
              interfaceConfig?.schemaInitialize?.(s, {
                field: subField,
                block,
                readPretty,
                targetCollection: getCollection(field.target),
              });
            },
            schema,
          } as SchemaInitializerItemType;
        });

      return {
        type: 'subMenu',
        name: field.uiSchema?.title,
        title: field.uiSchema?.title,
        children: items,
      } as SchemaInitializerItemType;
    });
  return groups;
};
