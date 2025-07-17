import { useContext, useEffect, useMemo, useState } from 'react';
import { FormLayout } from '@tachybase/components';
import { Schema, SchemaOptionsContext, useFieldSchema } from '@tachybase/schema';

import { PlusOutlined, ShareAltOutlined } from '@ant-design/icons';
import { PageHeader as AntdPageHeader } from '@ant-design/pro-layout';
import { PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Button, Divider, Modal, Tabs } from 'antd';
import { cx } from 'antd-style';
import classNames from 'classnames';
import { ErrorBoundary } from 'react-error-boundary';
import { useTranslation } from 'react-i18next';
import { useMatch, useSearchParams } from 'react-router-dom';

import { FormDialog, ScrollArea } from '..';
import { useToken } from '../__builtins__';
import { useStyles as useAClStyles } from '../../../built-in/acl/style';
import { useContextMenu } from '../../../built-in/context-menu/useContextMenu';
import { useDocumentTitle } from '../../../built-in/document-title';
import { FilterBlockProvider } from '../../../filter-provider/FilterProvider';
import { Icon } from '../../../icon';
import { useGetAriaLabelOfSchemaInitializer } from '../../../schema-initializer/hooks/useGetAriaLabelOfSchemaInitializer';
import { useGlobalTheme } from '../../../style/theme';
import { DndContext } from '../../common';
import { SortableItem } from '../../common/sortable-item';
import { DragHandleMenu } from '../../common/sortable-item/DragHandleMenu';
import { DragHandlePageTab } from '../../common/sortable-item/DragHandlePageTab';
import { SchemaComponent, SchemaComponentOptions } from '../../core';
import { useCompile, useDesignable } from '../../hooks';
import { ErrorFallback } from '../error-fallback';
import FixedBlock from './FixedBlock';
import { useShareActions } from './hooks/useShareActions';
import { useStyles } from './Page.style';
import { PageDesigner } from './PageDesigner';
import { PageTabDesigner } from './PageTabDesigner';
import { getStyles, useStyles as modalStyle } from './style';

export const Page = (props) => {
  const { children, ...others } = props;
  const { t } = useTranslation();

  const { title, setTitle } = useDocumentTitle();
  const fieldSchema = useFieldSchema();
  const disablePageHeader = fieldSchema['x-component-props']?.disablePageHeader;
  const enablePageTabs = fieldSchema['x-component-props']?.enablePageTabs;
  const enableSharePage = fieldSchema['x-component-props']?.enableSharePage;

  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const activeKey = useMemo(
    () => searchParams.get('tab') || Object.keys(fieldSchema.properties || {}).shift(),
    [fieldSchema.properties, searchParams],
  );
  const [height, setHeight] = useState(0);
  const aclStyles = useAClStyles();
  const { wrapSSR, hashId, componentCls } = getStyles();

  useEffect(() => {
    if (!title) {
      setTitle(t(fieldSchema.title));
    }
  }, [fieldSchema.title, title]);

  return wrapSSR(
    <FilterBlockProvider>
      <div className={`${componentCls} ${hashId} ${aclStyles.styles}`}>
        <PageDesigner title={fieldSchema.title || title} />
        <PageHeader
          disablePageHeader={disablePageHeader}
          enablePageTabs={enablePageTabs}
          activeKey={activeKey}
          title={title}
          fieldSchema={fieldSchema}
          parentProps={others}
          setHeight={setHeight}
          setLoading={setLoading}
          enableSharePage={enableSharePage}
          setSearchParams={setSearchParams}
        />
        <PageContentComponent
          loading={loading}
          disablePageHeader={disablePageHeader}
          enablePageTabs={enablePageTabs}
          fieldSchema={fieldSchema}
          activeKey={activeKey}
          height={height}
        >
          {children}
        </PageContentComponent>
      </div>
    </FilterBlockProvider>,
  );
};

const PageHeader = (props) => {
  const {
    disablePageHeader,
    enablePageTabs,
    setHeight,
    activeKey,
    setLoading,
    setSearchParams,
    fieldSchema,
    title,
    parentProps,
    enableSharePage,
  } = props;

  const { theme } = useGlobalTheme();
  const options = useContext(SchemaOptionsContext);
  const compile = useCompile();
  const [open, setOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const { showScrollArea } = useContextMenu();

  const hidePageTitle = fieldSchema['x-component-props']?.hidePageTitle;

  const pageHeaderTitle = hidePageTitle ? undefined : fieldSchema.title || compile(title);
  const isShare = useMatch('/share/:name');

  // THINK: 思考下这里怎么缓存, 直接用 useMemo 是不行的
  const items = fieldSchema.mapProperties((schema) => ({
    key: schema.name as string,
    label: <TabItem schema={schema} />,
  }));
  const { t } = useTranslation();

  const { styles } = modalStyle();

  const { copyLink, imageAction } = useShareActions({ title: pageHeaderTitle, uid: '' });

  return (
    <div
      ref={(ref) => {
        setHeight(Math.floor(ref?.getBoundingClientRect().height || 0) + 1);
      }}
      className="tb-page-header-wrapper"
    >
      {!disablePageHeader && (
        <AntdPageHeader
          className={classNames('pageHeaderCss', pageHeaderTitle || enableSharePage ? '' : 'height0')}
          ghost={false}
          // 如果标题为空的时候会导致 PageHeader 不渲染，所以这里设置一个空白字符，然后再设置高度为 0
          title={pageHeaderTitle || ' '}
          {...parentProps}
          extra={
            <HeaderExtra
              enablePageTabs={enablePageTabs}
              showScrollArea={showScrollArea}
              isShare={isShare}
              setOpen={setOpen}
              enableSharePage={enableSharePage}
            />
          }
          footer={
            enablePageTabs && (
              <TabComponent
                activeKey={activeKey}
                setLoading={setLoading}
                setSearchParams={setSearchParams}
                showScrollArea={showScrollArea}
                options={options}
                theme={theme}
                items={items}
              />
            )
          }
        ></AntdPageHeader>
      )}
      {disablePageHeader && enableSharePage && !isShare && (
        <div className="tb-page-header-button">
          <Button
            icon={<ShareAltOutlined />}
            onClick={() => {
              setOpen(true);
            }}
          >
            {t('Share')}
          </Button>
        </div>
      )}
      <Modal
        open={open}
        className={styles.firstmodal}
        title={t('Share')}
        footer={null}
        width={500}
        onCancel={() => {
          setOpen(false);
        }}
      >
        <div className={styles.secondmodal}>
          <div className="tb-header-modal-list" onClick={copyLink}>
            <Icon type="PaperClipOutlined" />
            {t('Copy link')}
          </div>
          <div
            className="tb-header-modal-list"
            onClick={() => {
              setImageOpen(true);
            }}
          >
            <Icon type="QrcodeOutlined" />
            {t('Generate QR code')}
          </div>
        </div>
        <Modal
          className={styles.imageModal}
          open={imageOpen}
          footer={null}
          onCancel={() => {
            setImageOpen(false);
          }}
        >
          {imageAction()}
        </Modal>
      </Modal>
    </div>
  );
};

const HeaderExtra = ({ enablePageTabs, showScrollArea, isShare, setOpen, enableSharePage }) => {
  return (
    <>
      {!isShare && (
        <Button
          icon={<ShareAltOutlined />}
          onClick={() => {
            setOpen(true);
          }}
          style={{ visibility: `${enableSharePage ? 'visible' : 'hidden'}` }}
        />
      )}
      {!enablePageTabs && showScrollArea && <ScrollArea />}
    </>
  );
};

const TabComponent = (props) => {
  const { activeKey, setLoading, setSearchParams, showScrollArea, options, theme, items } = props;

  const { styles } = useStyles();

  // react18  tab 动画会卡顿，所以第一个 tab 时，动画禁用，后面的 tab 才启用
  const [hasMounted, setHasMounted] = useState(false);

  // 配置传感器（确保拖拽行为正常）
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 移动 5px 后触发拖拽
      },
    }),
  );

  const handleTabClick = (activeKey) => {
    setLoading(true);
    setSearchParams([['tab', activeKey]]);
    setTimeout(() => {
      setLoading(false);
    }, 50);
  };

  useEffect(() => {
    setTimeout(() => {
      setHasMounted(true);
    });
  }, []);

  return (
    <DndContext sensors={sensors}>
      <Tabs
        className={styles.tabComponentClass}
        type="card"
        size={'small'}
        animated={hasMounted}
        activeKey={activeKey}
        items={items}
        onTabClick={handleTabClick}
        tabBarExtraContent={<TabBarExtraContent theme={theme} showScrollArea={showScrollArea} options={options} />}
      />
    </DndContext>
  );
};

const TabItem = (props) => {
  const { schema } = props;
  const { t } = useTranslation();
  const { styles } = useStyles();

  return (
    <SortableItem
      id={schema.name as string}
      schema={schema}
      className={classNames('tb-action-link', 'designerCss', props.className, styles.tabItemClass)}
    >
      <DragHandlePageTab>
        {schema['x-icon'] && <Icon style={{ marginRight: 8 }} type={schema['x-icon']} />}
        <span>{schema.title || t('Unnamed')}</span>
        <div className="tab-designer-wrapper">
          <PageTabDesigner schema={schema} />
        </div>
      </DragHandlePageTab>
    </SortableItem>
  );
};

const TabBarExtraContent = (props) => {
  const { showScrollArea, options, theme } = props;
  const dn = useDesignable();
  const { t } = useTranslation();
  const { getAriaLabel } = useGetAriaLabelOfSchemaInitializer();
  const { styles } = useStyles();
  const handleAddTab = async () => {
    const values = await FormDialog(t('Add tab'), () => <AddTabForm options={options} />, theme).open({
      initialValues: {},
    });
    const { title, icon } = values;
    dn.insertBeforeEnd({
      type: 'void',
      title,
      'x-icon': icon,
      'x-component': 'Grid',
      'x-initializer': 'page:addBlock',
      properties: {},
    });
  };

  return (
    <div
      className={cx(styles.tabWrapper, {
        designable: dn.designable,
      })}
    >
      {dn.designable && (
        <Button
          className="add-tab-btn"
          type="text"
          aria-label={getAriaLabel('tabs')}
          icon={<PlusOutlined />}
          onClick={handleAddTab}
        />
      )}
      {showScrollArea && <ScrollArea className="scroll-area-extra-content" />}
    </div>
  );
};

const AddTabForm = (props) => {
  const { options } = props;
  const { t } = useTranslation();

  return (
    <SchemaComponentOptions scope={options.scope} components={{ ...options.components }}>
      <FormLayout layout={'vertical'}>
        <SchemaComponent
          schema={{
            properties: {
              title: {
                title: t('Tab name'),
                'x-component': 'Input',
                'x-decorator': 'FormItem',
                required: true,
              },
              icon: {
                title: t('Icon'),
                'x-component': 'IconPicker',
                'x-decorator': 'FormItem',
              },
            },
          }}
        />
      </FormLayout>
    </SchemaComponentOptions>
  );
};

const PageContentComponent = (props) => {
  const handleErrors = (error) => {
    window?.Sentry?.captureException(error);
    console.error(error);
  };

  return (
    <div className="tb-page-wrapper">
      <ErrorBoundary FallbackComponent={ErrorFallback} onError={handleErrors}>
        <PageContent {...props} />
      </ErrorBoundary>
    </div>
  );
};

const PageContent = (props) => {
  const { loading, disablePageHeader, enablePageTabs, fieldSchema, activeKey, height, children } = props;
  const { token } = useToken();

  if (loading) {
    return;
  }
  if (!disablePageHeader && enablePageTabs) {
    return fieldSchema.mapProperties((schema) => {
      if (schema.name !== activeKey) {
        return null;
      }
      return (
        <FixedBlock key={schema.name} height={`calc(${height}px + 46px + ${token.marginLG}px * 2)`}>
          <SchemaComponent
            schema={
              new Schema({
                properties: {
                  [schema.name]: schema,
                },
              })
            }
          />
        </FixedBlock>
      );
    });
  }
  return (
    <FixedBlock height={`calc(${height}px + 46px + ${token.marginLG}px * 2)`}>
      <div className={`pageWithFixedBlockCss tb-page-content`}>{children}</div>
    </FixedBlock>
  );
};
