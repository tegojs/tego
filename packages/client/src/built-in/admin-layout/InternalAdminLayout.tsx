import { useRef } from 'react';

import { Layout } from 'antd';
import { useParams } from 'react-router-dom';

import { CurrentUser, PinnedPluginList, useApp, useSystemSettings } from '../..';
import { AdminContent } from './AdminContent';
import { AdminTabs } from './AdminTabs';
import { MenuEditor } from './MenuEditor';
import { useStyles } from './style';

export const InternalAdminLayout = (props: any) => {
  const sideMenuRef = useRef<HTMLDivElement>();
  const result = useSystemSettings();
  const app = useApp();
  const params = useParams<any>();
  const { styles } = useStyles();

  return (
    <Layout className={styles.layout}>
      <Layout.Header className={styles.header}>
        <div className={styles.headerA}>
          <div className={styles.headerB}>
            <div
              className={styles.titleContainer}
              onClick={() => {
                location.href = app.adminUrl;
              }}
            >
              <img className={styles.logo} src={result?.data?.data?.logo?.url} />
              <h1 className={styles.title}>{result?.data?.data?.title}</h1>
            </div>
            <MenuEditor sideMenuRef={sideMenuRef} />
            <div className={styles.headerTabs}>
              <AdminTabs />
            </div>
          </div>
          <div className={styles.right}>
            <PinnedPluginList belongToFilter="pinnedmenu" />
            <CurrentUser />
          </div>
        </div>
      </Layout.Header>
      <Layout>
        {params.name && <Layout.Sider className={styles.sider} theme={'light'} ref={sideMenuRef}></Layout.Sider>}
        <Layout.Content className={styles.main}>
          <div className="amplifier-block">
            <AdminContent />
          </div>
        </Layout.Content>
      </Layout>
    </Layout>
  );
};
