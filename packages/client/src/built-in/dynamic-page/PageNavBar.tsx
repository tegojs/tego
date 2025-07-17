import { useMemo } from 'react';

import { ArrowLeftOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import { useNavigate } from 'react-router-dom';

import { useRequest } from '../../api-client';
import { useCompile } from '../../schema-component';
import { useDocumentTitle } from '../document-title';
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

  // 处理返回操作
  const handleBack = () => {
    navigate(-1);
  };

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
