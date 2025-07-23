import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  CardItem,
  OpenMode,
  SchemaComponent,
  SchemaComponentContext,
  TableBlockProvider,
  useActionContext,
  useAPIClient,
  useCollectionManager_deprecated,
  useCollectionRecordData,
  useCompile,
  useDataBlockRequest,
  useDataBlockResource,
  useFilterByTk,
  useResourceActionContext,
} from '@tachybase/client';
import { ISchema, observable, observer, uid, useForm } from '@tachybase/schema';

import { MenuOutlined } from '@ant-design/icons';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  MouseSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { App, Badge, Dropdown, message, Space, Tabs } from 'antd';
import { saveAs } from 'file-saver';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';

import { lang, NAMESPACE, tval } from '../locale';
import { useWorkflowCategory, WorkflowCategoryContext } from '../WorkflowCategoriesProvider';
import { executionSchema } from './executions';

const tag = observable({ value: '' });

export const collectionWorkflows = {
  name: 'workflows',
  fields: [
    {
      type: 'string',
      name: 'title',
      interface: 'input',
      uiSchema: {
        title: '{{t("Name")}}',
        type: 'string',
        'x-component': 'Input',
        required: true,
      } as ISchema,
    },
    {
      type: 'string',
      name: 'type',
      interface: 'select',
      uiSchema: {
        title: `{{t("Trigger type", { ns: "${NAMESPACE}" })}}`,
        type: 'string',
        'x-decorator': 'FormItem',
        'x-component': 'Select',
        'x-component-props': {
          options: `{{getTriggersOptions()}}`,
        },
        required: true,
      } as ISchema,
    },
    {
      type: 'belongsToMany',
      name: 'category',
      target: 'workflowCategories',
      sourceKey: 'key',
      foreignKey: 'workflowKey',
      otherKey: 'categoryId',
      targetKey: 'id',
      sortBy: 'sort',
      through: 'workflowCategory',
      collectionName: 'workflows',
      interface: 'm2m',
      uiSchema: {
        title: `{{t("workflow Category", { ns: "${NAMESPACE}" })}}`,
        type: 'array',
        'x-component': 'AssociationField',
        'x-component-props': {
          fieldNames: {
            value: 'id',
            label: 'name',
          },
        },
      } as ISchema,
    },
    {
      type: 'string',
      name: 'description',
      interface: 'textarea',
      uiSchema: {
        title: '{{t("Description")}}',
        type: 'string',
        'x-component': 'Input.TextArea',
      } as ISchema,
    },
    {
      type: 'boolean',
      name: 'enabled',
      interface: 'radioGroup',
      uiSchema: {
        title: `{{t("Status", { ns: "${NAMESPACE}" })}}`,
        type: 'string',
        enum: [
          { label: `{{t("On", { ns: "${NAMESPACE}" })}}`, value: true, color: '#52c41a' },
          { label: `{{t("Off", { ns: "${NAMESPACE}" })}}`, value: false },
        ],
        'x-component': 'Radio.Group',
        'x-decorator': 'FormItem',
        default: false,
      } as ISchema,
    },

    {
      type: 'number',
      name: 'allExecuted',
      interface: 'integer',
      uiSchema: {
        title: `{{t("Executed", { ns: "${NAMESPACE}" })}}`,
        type: 'number',
        'x-component': 'InputNumber',
        'x-decorator': 'FormItem',
      } as ISchema,
    },
    {
      type: 'object',
      name: 'options',
    },
    {
      name: 'updatedAt',
      type: 'date',
      interface: 'updatedAt',
      uiSchema: {
        type: 'datetime',
        title: tval('Updated at'),
        'x-component': 'DatePicker',
        'x-component-props': {
          showTime: true,
        },
      },
    },
    {
      name: 'updatedBy',
      type: 'belongsTo',
      interface: 'updatedBy',
      target: 'users',
      targetKey: 'id',
      foreignKey: 'updatedById',
      collectionName: 'workflows',
      uiSchema: {
        type: 'object',
        title: '{{t("Last updated by")}}',
        'x-component': 'AssociationField',
        'x-component-props': {
          multiple: true,
          fieldNames: {
            value: 'id',
            label: 'nickname',
          },
        },
        // 'x-read-pretty': true,
      },
    },
  ],
};

export const collectionWorkflowCategories = {
  name: 'workflowCategories',
  fields: [
    {
      type: 'string',
      name: 'name',
      interface: 'input',
      uiSchema: {
        title: '{{t("Name")}}',
        type: 'string',
        'x-component': 'Input',
      } as ISchema,
    },
  ],
};

export const workflowFieldset: Record<string, ISchema> = {
  title: {
    'x-component': 'CollectionField',
    'x-decorator': 'FormItem',
  },
  type: {
    'x-component': 'CollectionField',
    'x-decorator': 'FormItem',
    default: 'general-action',
    'x-hidden': true,
  },
  sync: {
    type: 'boolean',
    title: `{{ t("Execute mode", { ns: "${NAMESPACE}" }) }}`,
    'x-decorator': 'FormItem',
    'x-component': 'SyncOptionSelect',
    'x-component-props': {
      options: [
        {
          label: `{{ t("Queue Mode", { ns: "${NAMESPACE}" }) }}`,
          value: false,
          tooltip: `{{ t("Will be executed in the background as a queued task.", { ns: "${NAMESPACE}" }) }}`,
        },
        {
          label: `{{ t("Transactional Mode", { ns: "${NAMESPACE}" }) }}`,
          value: true,
          tooltip: `{{ t("For user actions that require immediate feedback. Can not use asynchronous nodes in such mode, and it is not recommended to perform time-consuming operations under synchronous mode.", { ns: "${NAMESPACE}" }) }}`,
        },
      ],
    },
  },
  category: {
    'x-collection-field': 'workflows.category',
    'x-component': 'CollectionField',
    'x-decorator': 'FormItem',
    'x-component-props': {
      multiple: true,
    },
  },
  enabled: {
    'x-component': 'CollectionField',
    'x-decorator': 'FormItem',
  },
  description: {
    'x-component': 'CollectionField',
    'x-decorator': 'FormItem',
  },
  options: {
    type: 'object',
    'x-component': 'fieldset',
    properties: {
      deleteExecutionOnStatus: {
        type: 'array',
        title: `{{ t("Auto delete history when execution is on end status", { ns: "${NAMESPACE}" }) }}`,
        'x-decorator': 'FormItem',
        'x-component': 'ExecutionStatusSelect',
        'x-component-props': {
          multiple: true,
        },
      },
    },
  },
};

export const createWorkflow: ISchema = {
  type: 'void',
  'x-action': 'create',
  'x-acl-action': 'create',
  title: "{{t('Add new')}}",
  'x-component': 'Action',
  'x-decorator': 'ACLActionProvider',
  'x-component-props': {
    openMode: OpenMode.DRAWER_MODE,
    type: 'primary',
    component: 'CreateRecordAction',
    icon: 'PlusOutlined',
  },
  'x-align': 'right',
  'x-acl-action-props': {
    skipScopeCheck: true,
  },
  properties: {
    drawer: {
      type: 'void',
      title: '{{ t("Add record") }}',
      'x-component': 'Action.Container',
      'x-component-props': {
        className: 'tb-action-popup',
      },
      properties: {
        body: {
          type: 'void',
          'x-acl-action-props': {
            skipScopeCheck: true,
          },
          'x-acl-action': `${collectionWorkflows.name}:create`,
          'x-decorator': 'FormBlockProvider',
          'x-use-decorator-props': 'useCreateFormBlockDecoratorProps',
          'x-decorator-props': {
            dataSource: 'main',
            collection: collectionWorkflows,
          },
          'x-component': 'CardItem',
          properties: {
            form: {
              type: 'void',
              'x-component': 'FormV2',
              'x-use-component-props': 'useCreateFormBlockProps',
              properties: {
                actionBar: {
                  type: 'void',
                  'x-component': 'ActionBar',
                  'x-component-props': {
                    style: {
                      marginBottom: 24,
                    },
                  },
                  properties: {
                    cancel: {
                      title: '{{ t("Cancel") }}',
                      'x-component': 'Action',
                      'x-use-component-props': 'useCancelActionProps',
                    },
                    submit: {
                      title: '{{ t("Submit") }}',
                      'x-component': 'Action',
                      'x-use-component-props': 'useCreateActionProps',
                      'x-component-props': {
                        type: 'primary',
                        htmlType: 'submit',
                      },
                      'x-action-settings': {
                        assignedValues: {},
                        triggerWorkflows: [],
                        pageMode: false,
                      },
                    },
                  },
                },
                title: workflowFieldset.title,
                category: workflowFieldset.category,
                type: workflowFieldset.type,
                sync: workflowFieldset.sync,
                description: workflowFieldset.description,
                options: workflowFieldset.options,
              },
            },
          },
        },
      },
    },
  },
};

export const updateWorkflow: ISchema = {
  type: 'void',
  title: '{{ t("Edit") }}',
  'x-action': 'update',
  'x-component': 'Action.Link',
  'x-component-props': {
    openMode: OpenMode.DRAWER_MODE,
    icon: 'EditOutlined',
  },
  'x-decorator': 'ACLActionProvider',
  properties: {
    drawer: {
      type: 'void',
      title: '{{ t("Edit record") }}',
      'x-component': 'Action.Container',
      'x-component-props': {
        className: 'tb-action-popup',
      },
      properties: {
        card: {
          type: 'void',
          'x-acl-action-props': {
            skipScopeCheck: false,
          },
          'x-acl-action': `${collectionWorkflows.name}:update`,
          'x-decorator': 'FormBlockProvider',
          'x-use-decorator-props': 'useEditFormBlockDecoratorProps',
          'x-decorator-props': {
            action: 'get',
            dataSource: 'main',
            collection: collectionWorkflows,
            params: {
              appends: ['category'],
            },
          },
          'x-component': 'CardItem',
          properties: {
            form: {
              type: 'void',
              'x-component': 'FormV2',
              'x-use-component-props': 'useEditFormBlockProps',
              properties: {
                actionBar: {
                  type: 'void',
                  'x-component': 'ActionBar',
                  'x-component-props': {
                    style: {
                      marginBottom: 24,
                    },
                  },
                  properties: {
                    cancel: {
                      title: '{{ t("Cancel") }}',
                      'x-component': 'Action',
                      'x-use-component-props': 'useCancelActionProps',
                    },
                    submit: {
                      title: '{{ t("Submit") }}',
                      'x-component': 'Action',
                      'x-use-component-props': 'useUpdateActionProps',
                      'x-component-props': {
                        type: 'primary',
                      },
                      'x-action-settings': {
                        isDeltaChanged: true,
                      },
                    },
                  },
                },
                title: workflowFieldset.title,
                category: workflowFieldset.category,
                type: workflowFieldset.type,
                enabled: workflowFieldset.enabled,
                sync: workflowFieldset.sync,
                description: workflowFieldset.description,
                options: workflowFieldset.options,
              },
            },
          },
        },
      },
    },
  },
};
const revisionWorkflow: ISchema = {
  type: 'void',
  title: `{{t("Duplicate", { ns: "${NAMESPACE}" })}}`,
  'x-component': 'Action.Link',
  'x-component-props': {
    openSize: 'small',
  },
  properties: {
    modal: {
      type: 'void',
      title: `{{t("Duplicate to new workflow", { ns: "${NAMESPACE}" })}}`,
      'x-decorator': 'FormV2',
      'x-component': 'Action.Modal',
      properties: {
        title: {
          type: 'string',
          title: '{{t("Title")}}',
          'x-decorator': 'FormItem',
          'x-component': 'Input',
        },
        footer: {
          type: 'void',
          'x-component': 'Action.Modal.Footer',
          properties: {
            submit: {
              type: 'void',
              title: '{{t("Submit")}}',
              'x-component': 'Action',
              'x-component-props': {
                type: 'primary',
                useAction() {
                  const { t } = useTranslation();
                  const { refresh } = useDataBlockRequest();
                  const resource = useDataBlockResource();
                  const { setVisible } = useActionContext();
                  const filterByTk = useFilterByTk();
                  const { values } = useForm();
                  return {
                    async run() {
                      await resource.revision({ filterByTk, values });
                      message.success(t('Operation succeeded'));
                      refresh();
                      setVisible(false);
                    },
                  };
                },
              },
            },
            cancel: {
              type: 'void',
              title: '{{t("Cancel")}}',
              'x-component': 'Action',
              'x-use-component-props': 'useCancelActionProps',
            },
          },
        },
      },
    },
  },
};

const testWorkflow: ISchema = {
  type: 'void',
  title: `{{t("Test", { ns: "${NAMESPACE}" })}}`,
  'x-component': 'Action.Link',
  properties: {
    modal: {
      type: 'void',
      title: `{{t("Test workflow", { ns: "${NAMESPACE}" })}}`,
      'x-decorator': 'FormV2',
      'x-component': 'Action.Modal',
      properties: {
        params: {
          type: 'string',
          title: '{{t("Input")}}',
          description: `{{t("Data is the trigger variable, it can be { data: 0 }, or { data: { id: 0 }}",  { ns: "${NAMESPACE}" })}}`,
          'x-decorator': 'FormItem',
          default: '{ "data":{} }',
          'x-component': 'CodeMirror',
          'x-component-props': {
            height: '50vh',
            defaultLanguage: 'json',
          },
        },
        footer: {
          type: 'void',
          'x-component': 'Action.Modal.Footer',
          properties: {
            submit: {
              type: 'void',
              title: '{{t("Submit")}}',
              'x-component': 'Action',
              'x-component-props': {
                type: 'primary',
                useAction() {
                  const { t } = useTranslation();
                  const { refresh } = useDataBlockRequest();
                  const resource = useDataBlockResource();
                  const { setVisible } = useActionContext();
                  const filterByTk = useFilterByTk();
                  const { values } = useForm();
                  return {
                    async run() {
                      try {
                        const obj = JSON.parse(values.params);
                        await resource.test({ filterByTk, values: obj });
                        refresh();
                        setVisible(false);
                      } catch (e) {
                        console.error(e);
                      }
                    },
                  };
                },
              },
            },
            cancel: {
              type: 'void',
              title: '{{t("Cancel")}}',
              'x-component': 'Action',
              'x-use-component-props': 'useCancelActionProps',
            },
          },
        },
      },
    },
  },
};

function Droppable(props) {
  const { isOver, setNodeRef } = useDroppable({
    id: props.id,
    data: props.data,
  });
  const style = isOver
    ? {
        color: 'green',
      }
    : undefined;

  return (
    <div ref={setNodeRef} style={style}>
      {props.children}
    </div>
  );
}

function Draggable(props) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: props.id,
    data: props.data,
  });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      <div>{props.children}</div>
    </div>
  );
}

const TabTitle = observer(
  ({ item }: { item: any }) => {
    return (
      <Droppable id={item.id.toString()} data={item}>
        <div>
          <Draggable id={item.id.toString()} data={item}>
            <TabBar item={item} />
          </Draggable>
        </div>
      </Droppable>
    );
  },
  { displayName: 'TabTitle' },
);

const TabBar = ({ item }) => {
  const { t } = useTranslation();
  const compile = useCompile();
  return (
    <Space>
      <Badge color={item.color} />
      {t(compile(item.name))}
    </Space>
  );
};

const DndProvider = observer(
  (props) => {
    const [activeTab, setActiveId] = useState(null);
    const { refresh } = useWorkflowCategory();
    const api = useAPIClient();
    const onDragEnd = async (props: DragEndEvent) => {
      const { active, over } = props;
      setTimeout(() => {
        setActiveId(null);
      });
      if (over && over.id !== active.id) {
        await api.resource('workflowCategories').move({
          sourceId: active.id,
          targetId: over.id,
        });
        refresh();
      }
    };

    function onDragStart(event) {
      setActiveId(event.active?.data.current);
    }

    const mouseSensor = useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    });
    const sensors = useSensors(mouseSensor);
    return (
      <DndContext sensors={sensors} onDragEnd={onDragEnd} onDragStart={onDragStart}>
        {props.children}
        <DragOverlay>
          {activeTab ? <span style={{ whiteSpace: 'nowrap' }}>{<TabBar item={activeTab} />}</span> : null}
        </DragOverlay>
      </DndContext>
    );
  },
  { displayName: 'DndProvider' },
);

const WorkflowTabCardItem = ({ children }) => {
  const api = useAPIClient();
  const [dataSource, setDataSource] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeKey, setActiveKey] = useState({ tab: '' });
  const compile = useCompile();
  const { modal } = App.useApp();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await api.request({
      url: 'workflowCategories:list',
      params: {
        paginate: false,
        sort: ['sort'],
      },
    });
    setDataSource(data.data);
    setLoading(false);
  }, [api]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const remove = (key: any) => {
    modal.confirm({
      title: compile("{{t('Delete category')}}"),
      content: compile("{{t('Are you sure you want to delete it?')}}"),
      onOk: async () => {
        await api.resource('workflowCategories').destroy({
          filter: {
            id: key,
          },
        });
        setActiveKey({ tab: '' });
        tag.value = '';
        fetchData();
      },
    });
  };

  const menu = _.memoize((item) => {
    return {
      items: [
        {
          key: 'edit',
          label: (
            <SchemaComponent
              schema={{
                type: 'void',
                properties: {
                  [uid()]: {
                    'x-component': 'EditWorkflowCategory',
                    'x-component-props': {
                      item: item,
                    },
                  },
                },
              }}
            />
          ),
        },
        {
          key: 'delete',
          label: compile("{{t('Delete category')}}"),
          onClick: () => remove(item.id),
        },
      ],
    };
  });

  return (
    <WorkflowCategoryContext.Provider
      value={{
        refresh: fetchData,
        activeKey: activeKey.tab,
        setActiveKey: (key: string) => setActiveKey({ tab: key }),
      }}
    >
      <DndProvider>
        <Tabs
          addIcon={
            <SchemaComponent
              schema={{
                type: 'void',
                properties: {
                  addCategories: {
                    type: 'void',
                    title: '{{ t("Add category") }}',
                    'x-component': 'AddWorkflowCategory',
                    'x-component-props': {
                      type: 'primary',
                    },
                  },
                },
              }}
            />
          }
          type="editable-card"
          activeKey={activeKey.tab}
          onChange={(value) => {
            setActiveKey({ tab: value });
            tag.value = value;
            if (value === '') {
              fetchData();
            }
          }}
          defaultActiveKey={activeKey.tab || ''}
          destroyInactiveTabPane={true}
          tabBarStyle={{ marginBottom: '0px' }}
          items={[
            {
              id: '',
              name: lang('All'),
              closable: false,
            },
          ]
            .concat(dataSource)
            .filter((item) => item && item.name != null && item.id != null)
            .map((item) => {
              return {
                label:
                  item.id !== '' ? (
                    <div data-no-dnd="true">
                      <TabTitle item={item} />
                    </div>
                  ) : (
                    compile(item.name)
                  ),
                key: item.id,
                closable: item.closable,
                closeIcon: (
                  <Dropdown menu={menu(item)}>
                    <MenuOutlined
                      role="button"
                      aria-label={compile(item.name)}
                      style={{ padding: 8, margin: '-8px' }}
                    />
                  </Dropdown>
                ),
                children: <CardItem>{children}</CardItem>,
              };
            })}
        />
      </DndProvider>
    </WorkflowCategoryContext.Provider>
  );
};

const TabTableBlockProvider = observer((props) => {
  const requestProps = {
    collection: collectionWorkflows,
    action: 'list',
    params: {
      filter: {
        current: true,
        type: {
          // TODO: 等工作流整理完成后, 去除这里的依赖审批 "approval" 字段
          $not: 'approval',
        },
      },
      sort: ['-initAt'],
    },
    rowKey: 'id',
  };

  if (tag.value) {
    requestProps.params.filter['category.id'] = [tag.value];
  }

  return <TableBlockProvider {...props} {...requestProps} />;
});

export const workflowSchema: ISchema = {
  type: 'void',
  properties: {
    provider: {
      type: 'void',
      'x-decorator': TabTableBlockProvider,
      'x-component': WorkflowTabCardItem,
      properties: {
        actions: {
          type: 'void',
          'x-component': 'ActionBar',
          'x-component-props': {
            style: {
              marginBottom: 16,
            },
          },
          properties: {
            filter: {
              type: 'void',
              title: '{{ t("Filter") }}',
              default: {
                $and: [{ title: { $includes: '' } }],
              },
              'x-action': 'filter',
              'x-component': 'Filter.Action',
              'x-use-component-props': 'useFilterActionProps',
              'x-component-props': {
                icon: 'FilterOutlined',
              },
              'x-align': 'left',
            },
            fuzzySearch: {
              type: 'void',
              'x-component': 'FuzzySearchInput',
              'x-align': 'left',
            },
            refresh: {
              type: 'void',
              title: '{{ t("Refresh") }}',
              'x-action': 'refresh',
              'x-component': 'Action',
              'x-settings': 'actionSettings:refresh',
              'x-component-props': {
                icon: 'ReloadOutlined',
              },
              'x-use-component-props': 'useRefreshActionProps',
            },
            delete: {
              type: 'void',
              title: '{{t("Delete")}}',
              'x-action': 'destroy',
              'x-decorator': 'ACLActionProvider',
              'x-component': 'Action',
              'x-use-component-props': 'useDestroyActionProps',
              'x-component-props': {
                icon: 'DeleteOutlined',
                confirm: {
                  title: "{{t('Delete record')}}",
                  content: "{{t('Are you sure you want to delete it?')}}",
                },
              },
            },
            load: {
              type: 'void',
              title: `{{t("Load", { ns: "${NAMESPACE}" })}}`,
              'x-component': 'Action',
              'x-component-props': {
                icon: 'UploadOutlined',
                openSize: 'small',
              },
              properties: {
                modal: {
                  type: 'void',
                  title: `{{t("Load a workflow", { ns: "${NAMESPACE}" })}}`,
                  'x-decorator': 'FormV2',
                  'x-component': 'Action.Modal',
                  properties: {
                    title: {
                      type: 'string',
                      title: '{{t("Title")}}',
                      'x-decorator': 'FormItem',
                      'x-component': 'Input',
                    },
                    file: {
                      type: 'object',
                      title: '{{ t("File") }}',
                      required: true,
                      'x-decorator': 'FormItem',
                      'x-component': 'Upload.Attachment',
                      'x-component-props': {
                        action: 'attachments:create',
                        multiple: false,
                      },
                    },
                    footer: {
                      type: 'void',
                      'x-component': 'Action.Modal.Footer',
                      properties: {
                        submit: {
                          type: 'void',
                          title: '{{t("Submit")}}',
                          'x-component': 'Action',
                          'x-component-props': {
                            type: 'primary',
                            useAction() {
                              const { t } = useTranslation();
                              const api = useAPIClient();
                              const { refresh } = useDataBlockRequest();
                              const resource = useDataBlockResource();
                              const filterByTk = useFilterByTk();
                              const { setVisible } = useActionContext();
                              const { values } = useForm();
                              return {
                                async run() {
                                  const { data } = await api.request({
                                    url: values.file.url,
                                    baseURL: '/',
                                  });
                                  await resource.load({ filterByTk, values: { ...values, workflow: data } });
                                  message.success(t('Operation succeeded'));
                                  refresh();
                                  setVisible(false);
                                },
                              };
                            },
                          },
                        },
                        cancel: {
                          type: 'void',
                          title: '{{t("Cancel")}}',
                          'x-component': 'Action',
                          'x-use-component-props': 'useCancelActionProps',
                        },
                      },
                    },
                  },
                },
              },
            },
            create: createWorkflow,
          },
        },
        table: {
          type: 'array',
          'x-component': 'TableV2',
          'x-use-component-props': 'useTableBlockProps',
          'x-component-props': {
            rowKey: 'id',
            rowSelection: {
              type: 'checkbox',
            },
          },
          properties: {
            title: {
              type: 'void',
              'x-decorator': 'TableV2.Column.Decorator',
              'x-component': 'TableV2.Column',
              'x-component-props': {
                sorter: true,
              },
              title: '{{t("Name")}}',
              properties: {
                title: {
                  type: 'string',
                  'x-component': 'ColumnShowTitle',
                },
              },
            },
            category: {
              type: 'void',
              'x-decorator': 'TableV2.Column.Decorator',
              'x-component': 'TableV2.Column',
              'x-component-props': {
                sorter: true,
                width: 20,
                align: 'center',
              },
              properties: {
                category: {
                  type: 'array',
                  'x-collection-field': 'workflows.category',
                  'x-component': 'CollectionField',
                  'x-component-props': {
                    multiple: true,
                    mode: 'Tag',
                  },
                  'x-read-pretty': true,
                },
              },
            },
            showCollection: {
              type: 'void',
              'x-decorator': 'TableV2.Column.Decorator',
              'x-component': 'TableV2.Column',
              title: tval('Collection'),
              properties: {
                showCollection: {
                  type: 'string',
                  'x-component': 'ColumnShowCollection',
                },
              },
            },
            enabled: {
              type: 'void',
              'x-decorator': 'TableV2.Column.Decorator',
              'x-component': 'TableV2.Column',
              'x-component-props': {
                sorter: true,
                width: 20,
                align: 'center',
              },
              properties: {
                enabled: {
                  type: 'boolean',
                  'x-component': 'CollectionField',
                  'x-read-pretty': true,
                  default: false,
                },
              },
            },
            allExecuted: {
              type: 'void',
              'x-decorator': 'TableV2.Column.Decorator',
              'x-component': 'TableV2.Column',
              'x-component-props': {
                sorter: true,
                width: 20,
                align: 'center',
                style: {
                  display: 'grid',
                  placeItems: 'center',
                },
              },
              properties: {
                allExecuted: {
                  type: 'number',
                  'x-decorator': 'OpenDrawer',
                  'x-decorator-props': {
                    component: function Com(props) {
                      const record = useCollectionRecordData();
                      return React.createElement('a', {
                        'aria-label': `executed-${record.title}`,
                        ...props,
                      });
                    },
                  },
                  'x-component': 'CollectionField',
                  'x-read-pretty': true,
                  properties: {
                    drawer: executionSchema,
                  },
                },
              },
            },
            updatedAt: {
              type: 'void',
              'x-decorator': 'TableV2.Column.Decorator',
              'x-component': 'TableV2.Column',
              'x-component-props': {
                sorter: true,
                width: 20,
                align: 'center',
                style: {
                  display: 'grid',
                  placeItems: 'center',
                },
              },
              properties: {
                updatedAt: {
                  type: 'string',
                  'x-component': 'CollectionField',
                  'x-read-pretty': true,
                },
              },
            },
            updatedBy: {
              type: 'void',
              'x-decorator': 'TableV2.Column.Decorator',
              'x-component': 'TableV2.Column',
              'x-component-props': {
                sorter: true,
                width: 20,
                align: 'center',
                style: {
                  display: 'grid',
                  placeItems: 'center',
                },
              },
              properties: {
                updatedBy: {
                  type: 'string',
                  'x-collection-field': 'workflows.updatedBy',
                  'x-component': 'CollectionField',
                  'x-read-pretty': true,
                },
              },
            },
            actions: {
              type: 'void',
              title: '{{ t("Actions") }}',
              'x-component': 'TableV2.Column',
              'x-component-props': {
                fixed: 'right',
              },
              properties: {
                actions: {
                  type: 'void',
                  'x-component': 'Space',
                  'x-component-props': {
                    split: '|',
                  },
                  properties: {
                    configure: {
                      type: 'void',
                      'x-component': 'WorkflowLink',
                    },
                    update: updateWorkflow,
                    revision: revisionWorkflow,
                    test: testWorkflow,
                    delete: {
                      type: 'void',
                      title: '{{t("Delete")}}',
                      'x-action': 'destroy',
                      'x-component': 'Action.Link',
                      'x-use-component-props': 'useDestroyActionProps',
                      'x-component-props': {
                        confirm: {
                          title: "{{t('Delete record')}}",
                          content: "{{t('Are you sure you want to delete it?')}}",
                        },
                      },
                    },
                    dump: {
                      type: 'void',
                      title: '{{ t("Dump") }}',
                      'x-component': 'Action.Link',
                      'x-component-props': {
                        useAction() {
                          const { t } = useTranslation();
                          const resource = useDataBlockResource();
                          const filterByTk = useFilterByTk();

                          return {
                            async run() {
                              const { data } = await resource.dump({ filterByTk });
                              const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
                              saveAs(blob, data.data.title + '-' + data.data.key + '.json');
                              message.success(t('Operation succeeded'));
                            },
                          };
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
