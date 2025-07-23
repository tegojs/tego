import React, { useCallback, useMemo, useState } from 'react';
import {
  ActionBarProvider,
  css,
  cx,
  FilterBlockProvider,
  SortableItem,
  TabsContextProvider,
  useDesigner,
} from '@tachybase/client';
import { RecursionField, useField, useFieldSchema } from '@tachybase/schema';

import { ShareAltOutlined } from '@ant-design/icons';
import { Button, TabsProps } from 'antd';
import { useLocation, useMatch, useNavigate } from 'react-router-dom';

import { countGridCol, findSchema } from '../../helpers';
import { ShareModal } from '../header/HeaderShareModal';
import { PageDesigner } from './Page.Designer';
import useStyles from './style';

const InternalPage: React.FC = () => {
  const { styles } = useStyles();
  const Designer = useDesigner();
  const field = useField();
  const fieldSchema = useFieldSchema();

  const navigate = useNavigate();
  const location = useLocation();
  const match = useMatch('/:entry/:entryId/page-tab/:pageTabId/*');
  const pageTabActiveKey = useMemo(() => {
    return match?.params?.pageTabId || Object.keys(fieldSchema.properties || {}).shift();
  }, [match?.params?.pageTabId, fieldSchema.properties]);

  const setPageTabUrl = (pageTabId) => {
    const currentPath = location.pathname;
    const newPath = currentPath.replace(/\/page-tab\/[^/]*/, `/page-tab/${pageTabId}`);
    if (!newPath.includes('/page-tab/')) {
      navigate(`${currentPath}/page-tab/${pageTabId}`, { replace: true });
    } else {
      navigate(newPath, { replace: true });
    }
  };

  const tabsSchema = fieldSchema.properties?.['tabs'];
  const isHeaderEnabled = field.componentProps.headerEnabled !== false;
  const isTabsEnabled = field.componentProps.tabsEnabled !== false && tabsSchema;
  const [open, setOpen] = useState(false);

  let pageSchema = findSchema(fieldSchema, 'MPage');
  if (!isTabsEnabled && !pageSchema && tabsSchema) {
    const schemaArr = Object.values(tabsSchema.properties || {}).sort((k1, k2) => {
      return k1['x-index'] - k2['x-index'];
    });
    if (schemaArr.length !== 0) {
      pageSchema = schemaArr[0];
    }
  }

  // Only support globalActions in page
  const onlyInPage = fieldSchema.root === fieldSchema.parent;
  let hasGlobalActions = false;
  if (!tabsSchema && fieldSchema.properties) {
    hasGlobalActions = countGridCol(fieldSchema.properties['grid'], 2) === 1;
  } else if (pageTabActiveKey && tabsSchema?.properties?.[pageTabActiveKey]) {
    hasGlobalActions = countGridCol(tabsSchema.properties[pageTabActiveKey]?.properties?.['grid'], 2) === 1;
  } else if (tabsSchema?.properties) {
    const schema = Object.values(tabsSchema.properties).sort((t1, t2) => t1['x-index'] - t2['x-index'])[0];
    if (schema) {
      setTimeout(() => {
        setPageTabUrl(schema.name.toString());
      });
    }
  }

  const onTabsChange = useCallback<TabsProps['onChange']>(
    (key) => {
      setPageTabUrl(key);
    },
    [setPageTabUrl],
  );

  const GlobalActionProvider = useCallback(
    (props) => {
      return (
        <TabsContextProvider>
          {hasGlobalActions ? (
            <ActionBarProvider
              container={
                (typeof props.active !== 'undefined' ? props.active : true) && onlyInPage
                  ? document.getElementById('tb-position-container')
                  : null
              }
              forceProps={{
                layout: 'one-column',
                className: styles.globalActionCSS,
              }}
            >
              {props.children}
            </ActionBarProvider>
          ) : (
            props.children
          )}
        </TabsContextProvider>
      );
    },
    [hasGlobalActions, onlyInPage, styles.globalActionCSS],
  );

  return (
    <SortableItem eid="tb-mobile-scroll-wrapper" className={cx('tb-mobile-page', styles.mobilePage)}>
      <Designer {...fieldSchema?.['x-designer-props']}></Designer>
      <div
        style={{
          paddingBottom: tabsSchema ? null : 'var(--tb-spacing)',
        }}
        className={cx('tb-mobile-page-header', styles.mobilePageHeader, {
          [css`
            & > .ant-tb-grid {
              margin-top: 14px;
            }
          `]: (tabsSchema && !isTabsEnabled) || !tabsSchema,
        })}
      >
        {isHeaderEnabled ? (
          <RecursionField
            schema={fieldSchema}
            filterProperties={(s) => {
              return 'MHeader' === s['x-component'];
            }}
          ></RecursionField>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'end', backgroundColor: '#ffffff', paddingRight: '20px' }}>
            <Button
              icon={<ShareAltOutlined />}
              style={{ border: 'none' }}
              onClick={() => {
                setOpen(true);
              }}
            />
          </div>
        )}
        <TabsContextProvider PaneRoot={GlobalActionProvider} activeKey={pageTabActiveKey} onChange={onTabsChange}>
          <RecursionField
            schema={isTabsEnabled ? fieldSchema : pageSchema}
            filterProperties={(s) => {
              return 'Tabs' === s['x-component'] || 'Grid' === s['x-component'] || 'Grid.Row' === s['x-component'];
            }}
          ></RecursionField>
        </TabsContextProvider>
      </div>
      <GlobalActionProvider>
        {!tabsSchema && (
          <RecursionField
            schema={fieldSchema}
            filterProperties={(s) => {
              return s['x-component'] !== 'MHeader';
            }}
          ></RecursionField>
        )}
      </GlobalActionProvider>
      <ShareModal open={open} setOpen={setOpen} uid={fieldSchema['x-uid']} />
    </SortableItem>
  );
};

const InternalFilterablePage = (props) => (
  <FilterBlockProvider>
    <InternalPage {...props} />
  </FilterBlockProvider>
);

export const MPage = InternalFilterablePage as unknown as typeof InternalPage & {
  Designer: typeof PageDesigner;
};
MPage.Designer = PageDesigner;
MPage.displayName = 'MPage';
