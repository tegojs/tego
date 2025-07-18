import { useMemo } from 'react';

import { ArrowLeftOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import { useNavigate } from 'react-router-dom';

import { useRequest } from '../../api-client';
import { useCompile } from '../../schema-component';
import { useDocumentTitle } from '../document-title';
import { PageStyle } from '../page-style/PageStyle.provider';
import { usePageStyle } from '../page-style/usePageStyle';
import { useStyles } from './PageNavBar.style';

const { Title } = Typography;

export const PageNavBar = ({ uid }: { uid: string }) => {
  const compile = useCompile();
  const navigate = useNavigate();

  const { data } = useRequest<{ data: { title: string } }>({
    url: `/uiSchemas:getJsonSchema/${uid}`,
  });

  const currentTitle = data?.data?.title;
  const { styles } = useStyles();
  const { title: documentTitle } = useDocumentTitle();

  const title = useMemo(() => {
    return compile(currentTitle || documentTitle);
  }, [currentTitle, documentTitle]);

  const pageStyle = usePageStyle();

  // 处理返回操作
  const handleBack = () => {
    navigate(-1);
  };

  // 页面模式为多标签页时, 不显示导航栏, 标签本身支持返回功能
  if (pageStyle === PageStyle.TAB_STYLE) {
    return null;
  }

  return (
    <div className={styles['page-nav-bar']}>
      <div className="nav-title" onClick={handleBack}>
        <ArrowLeftOutlined />
        <Title level={4} style={{ margin: 0 }}>
          {title}
        </Title>
      </div>
    </div>
  );
};
