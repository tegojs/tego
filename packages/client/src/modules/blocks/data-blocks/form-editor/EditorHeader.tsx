import React, { useEffect, useMemo, useState } from 'react';
import { useAPIClient, useTranslation } from '@tachybase/client';
import { ISchema, Schema, uid } from '@tachybase/schema';

import { DesktopOutlined, EditOutlined, LeftOutlined, MobileOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { App, Button, Drawer, Input, Layout, Menu, message, Modal, Radio, Tooltip } from 'antd';
import { CheckboxGroupProps } from 'antd/es/checkbox';
import _, { cloneDeep } from 'lodash';

import {
  useCollection_deprecated,
  useCollectionManager_deprecated,
  useResourceActionContext,
} from '../../../../collection-manager';
import {
  createDesignable,
  SchemaComponent,
  SchemaComponentContext,
  useCompile,
  useDesignable,
  useSchemaComponentContext,
} from '../../../../schema-component';
import { findSchema } from '../../../../schema-initializer/utils';
import { EditableGrid } from './EditableGrid';
import { useStyles } from './styles';

export const EditorHeader = ({ onCancel, schema }) => {
  const { title: collectionTitle, fields, name } = useCollection_deprecated();
  const { refreshCM } = useCollectionManager_deprecated();
  const { dn, refresh } = useDesignable();
  const api = useAPIClient();
  const { Header } = Layout;
  const compile = useCompile();
  const { styles } = useStyles();
  const [title, setTitle] = useState(collectionTitle);
  const [modalVisible, setModalVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);
  const { t } = useTranslation();
  const { modal } = App.useApp();
  const handleTitleSave = () => {
    setTitle(tempTitle || collectionTitle);
    setModalVisible(false);
  };
  const currentSchema = dn.current;
  const currentActionBarSchema = findSchema(currentSchema, 'x-component', 'ActionBar');
  const currentActionBarDN = useMemo(() => {
    return createDesignable({ t, api, refresh, current: currentActionBarSchema });
  }, [t, api, refresh, currentActionBarSchema]);
  useEffect(() => {
    currentActionBarDN.loadAPIClientEvents();
  }, [currentActionBarDN]);
  const handleSave = async () => {
    for (const field of fields || []) {
      if (field.target === '__temp__') {
        const fieldTitle = field?.uiSchema?.title || field.name;
        message.warning(
          t(`The target collection for the association field "{{field}}" is not selected`, {
            field: fieldTitle,
          }),
        );
        return;
      }
    }
    if (title && title !== collectionTitle) {
      await api.resource('collections').update({
        filterByTk: name,
        values: { title: title },
      });
    }
    patchSchemaToolbars(schema);
    const cardSchema = findSchema(schema, 'x-decorator', 'FormBlockProvider');
    const newActionBarSchema = findSchema(cardSchema, 'x-component', 'ActionBar');

    try {
      if (cardSchema.name === currentSchema.name) {
        await currentActionBarDN.remove(null);
        newActionBarSchema.properties = currentActionBarSchema.properties;
        const newSchema = cloneDeep(cardSchema.toJSON());
        newSchema.name = newSchema['x-uid'];
        await dn.insertAdjacent('afterEnd', newSchema);
        await dn.remove(null);
      } else {
        dn.insertAdjacent('beforeEnd', schema.toJSON());
      }
    } catch (error) {
      console.error('dn error:', error);
      message.error(t('Save failed due to schema update error'));
      return;
    }
    await refreshCM();
    await refresh();
    await onCancel();
  };

  return (
    <>
      <Header className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button
            icon={<LeftOutlined />}
            onClick={() =>
              modal.confirm({
                title: t('Unsaved changes'),
                content: t("Are you sure you don't want to save?"),
                onOk: () => {
                  // TODO:添加删除新增字段逻辑
                  onCancel();
                },
              })
            }
            type="text"
            className="ant-cancel-button"
          />
          <span
            className="ant-form-title"
            style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => {
              setTempTitle(title);
              setModalVisible(true);
            }}
          >
            {compile(title)}
            <EditOutlined style={{ marginLeft: 4 }} />
          </span>
        </div>
        <div className="center-menu" style={{ minWidth: 200 }}>
          <Menu
            key="EditPageMenu"
            mode="horizontal"
            overflowedIndicator={false}
            selectedKeys={['formEdit']}
            style={{ minWidth: 100 }}
            items={[
              {
                key: 'formEdit',
                label: <span style={{ fontSize: 'large' }}>{t('Edit form')}</span>,
              },
            ]}
          />
          <Tooltip title={t('Design the form by selecting fields, adjusting layout, and adding properties')}>
            <QuestionCircleOutlined />
          </Tooltip>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Button
            className="ant-save-button"
            onClick={() => {
              setDrawerVisible(true);
            }}
          >
            {t('Preview')}
          </Button>
          <Button type="primary" className="ant-save-button" onClick={handleSave}>
            {t('Save')}
          </Button>
        </div>
      </Header>
      <Modal
        title={t('Collection display name')}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleTitleSave}
      >
        <Input
          value={compile(tempTitle)}
          onChange={(e) => setTempTitle(e.target.value)}
          placeholder={t('Collection display name')}
        />
        <span>{t('Caution: Changing this will directly modify the collection name')}</span>
      </Modal>
      <PreviewDrawer open={drawerVisible} onClose={() => setDrawerVisible(false)} schema={schema} />
    </>
  );
};

function patchSchemaToolbars(schema: ISchema) {
  const patch = (node: ISchema) => {
    if (!node || typeof node !== 'object') return;
    if (node['x-toolbar'] === 'EditableFormItemSchemaToolbar') {
      node['x-toolbar'] = 'FormItemSchemaToolbar';
    }
    if (node['x-component'] === 'CardItem' || node['x-toolbar'] === 'EditableFormToolbar') {
      node['x-toolbar'] = 'BlockSchemaToolbar';
      node['x-settings'] = 'blockSettings:createForm';
    }
    if (node['x-component'] === 'EditableGrid') {
      node['x-initializer'] = 'form:configureFields';
      node['x-component'] = 'Grid';
    }
    if (node['x-component'] === 'EditableGrid.Col') {
      node['x-component'] = 'Grid.Col';
    }
    if (node['x-component'] === 'EditableGrid.Row') {
      node['x-component'] = 'Grid.Row';
    }
    if (node['x-component'] === 'ActionBar' && !node['x-initializer']) {
      node['x-initializer'] = 'createForm:configureActions';
    }
    if (node.properties) {
      for (const key of Object.keys(node.properties)) {
        patch(node.properties[key]);
      }
    }
  };
  patch(schema);
}

const PreviewDrawer = ({ open, onClose, schema }) => {
  const { styles } = useStyles();
  const [device, setDevice] = useState('PC');
  const options: CheckboxGroupProps<string>['options'] = [
    { label: <DesktopOutlined />, value: 'PC' },
    { label: <MobileOutlined />, value: 'Mobile' },
  ];
  return (
    <Drawer
      placement={'bottom'}
      height={'90%'}
      open={open}
      onClose={onClose}
      closeIcon={<LeftOutlined />}
      className={styles.previewDrawer}
      extra={
        <div>
          <Radio.Group
            block
            options={options}
            value={device}
            onChange={(e) => setDevice(e.target.value)}
            optionType="button"
            buttonStyle="solid"
          />
        </div>
      }
    >
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          paddingBottom: '5%',
        }}
      >
        {device === 'PC' ? <PCPreviewContent schema={schema} /> : <MobilePreviewContent schema={schema} />}
      </div>
    </Drawer>
  );
};

const PCPreviewContent = ({ schema }) => {
  const designerCtx = useSchemaComponentContext();
  return (
    <div
      style={{
        width: '100%',
        maxWidth: '700px',
        height: '100%',
        marginTop: '10%',
        overflow: 'auto',
        marginBottom: '5%',
      }}
    >
      <SchemaComponentContext.Provider value={{ ...designerCtx, designable: false }}>
        <SchemaComponent schema={schema} components={{ EditableGrid }} />
      </SchemaComponentContext.Provider>
    </div>
  );
};

const MobilePreviewContent = ({ schema }) => {
  const designerCtx = useSchemaComponentContext();
  const jsonSchema = useMemo(() => schema.toJSON(), [schema]);
  const formItems = useMemo(() => findFormItem(jsonSchema), [jsonSchema]);
  const mobileSchema = new Schema(jsonSchema);
  const cardSchema = findSchema(mobileSchema, 'x-component', 'CardItem') || {};
  cardSchema['x-component-props'] = {
    style: {
      boxShadow: 'none',
    },
  };
  const formSchema = findSchema(cardSchema, 'x-component', 'FormV2') || {};
  formSchema.removeProperty('grid');
  formSchema.addProperty('grid', {
    type: 'void',
    'x-component': 'EditableGrid',
    'x-initializer': 'form:configureFields',
    properties: {
      ...formItems,
    },
  });
  return (
    <div
      style={{
        height: '90%',
        aspectRatio: '8 / 16',
        border: '5px solid rgb(177, 176, 176)',
        borderRadius: 40,
        boxShadow: '0 0 10px rgba(208, 208, 208, 0.77)',
        backgroundColor: 'white',
        overflow: 'auto',
        position: 'relative',
        scrollbarWidth: 'none',
      }}
    >
      <SchemaComponentContext.Provider value={{ ...designerCtx, designable: false }}>
        <SchemaComponent schema={gridRowColWrap(cardSchema)} components={{ EditableGrid }} />
      </SchemaComponentContext.Provider>
    </div>
  );
};

function findFormItem(schema: ISchema) {
  const result: ISchema[] = [];
  const find = (node: ISchema) => {
    if (!node || typeof node !== 'object') return;
    if (node['x-decorator'] === 'FormItem') {
      result.push(gridRowColWrap(node));
    }
    if (node.properties) {
      const orderedKeys = Object.keys(node.properties);
      for (const key of orderedKeys) {
        find(node.properties[key]);
      }
    }
  };
  find(schema);
  const obj = result.reduce((acc, item) => {
    acc[uid()] = item;
    return acc;
  }, {});
  return obj;
}

const gridRowColWrap = (schema: ISchema) => {
  return {
    type: 'void',
    'x-component': 'EditableGrid.Row',
    properties: {
      [uid()]: {
        type: 'void',
        'x-component': 'EditableGrid.Col',
        properties: {
          [schema.name || uid()]: schema,
        },
      },
    },
  };
};
