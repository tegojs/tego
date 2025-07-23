import { useEffect, useMemo, useState } from 'react';
import { useFieldSchema } from '@tachybase/schema';

import { useLocation, useMatch, useNavigate } from 'react-router-dom';

import { useStyles as useAClStyles } from '../../../built-in/acl/style';
import { useDocumentTitle } from '../../../built-in/document-title';
import { FilterBlockProvider } from '../../../filter-provider/FilterProvider';
import { useCompile } from '../../hooks';
import { PageContentComponent } from './components/PageContentComponent';
import { PageHeader } from './components/PageHeader';
import { PageDesigner } from './PageDesigner';
import { getStyles } from './style';

export const Page = (props) => {
  const { children, ...others } = props;
  const compile = useCompile();

  const { title, setTitle } = useDocumentTitle();
  const fieldSchema = useFieldSchema();
  const disablePageHeader = fieldSchema['x-component-props']?.disablePageHeader;
  const enablePageTabs = fieldSchema['x-component-props']?.enablePageTabs;
  const enableSharePage = fieldSchema['x-component-props']?.enableSharePage;

  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // NOTE: 是否有其他路由模式?
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

  const [height, setHeight] = useState(0);
  const aclStyles = useAClStyles();
  const { wrapSSR, hashId, componentCls } = getStyles();

  const pageTitle = useMemo(() => {
    return compile(fieldSchema.title || title) || '';
  }, [fieldSchema.title, title]);

  useEffect(() => {
    if (!title) {
      setTitle(compile(fieldSchema.title));
    }
  }, [fieldSchema.title, title]);

  return wrapSSR(
    <FilterBlockProvider>
      <div className={`${componentCls} ${hashId} ${aclStyles.styles}`}>
        <PageDesigner title={pageTitle} />
        <PageHeader
          disablePageHeader={disablePageHeader}
          enablePageTabs={enablePageTabs}
          activeKey={pageTabActiveKey}
          title={pageTitle}
          fieldSchema={fieldSchema}
          parentProps={others}
          setHeight={setHeight}
          setLoading={setLoading}
          enableSharePage={enableSharePage}
          setPageTabUrl={setPageTabUrl}
        />
        <PageContentComponent
          loading={loading}
          disablePageHeader={disablePageHeader}
          enablePageTabs={enablePageTabs}
          fieldSchema={fieldSchema}
          activeKey={pageTabActiveKey}
          height={height}
        >
          {children}
        </PageContentComponent>
      </div>
    </FilterBlockProvider>,
  );
};
