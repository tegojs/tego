import { useMemo } from 'react';
import {
  ExtendCollectionsProvider,
  SchemaComponent,
  TrackingLink,
  useCollectionRecordData,
  useCurrentUserContext,
  useDataBlockRequest,
  useNoticeSub,
} from '@tachybase/client';
import { uid } from '@tachybase/utils/client';

import { LoadingOutlined } from '@ant-design/icons';
import { Card, Divider, notification, Space, Spin } from 'antd';

import { NAMESPACE, NOTIFICATION_CLIENT_KEY, NOTIFY_STATUS_EVENT_KEY } from '../../constants';
import { collectionMultiApp } from '../base/collections/collectionMultiApp';
import { usePluginUtils } from '../locale';
import { schemaAppManager } from './AppManager.schema';
import { useCreateDatabaseConnectionAction } from './hooks/useCreateDatabaseConnectionAction';
import { useHandle } from './hooks/useHandle';
import { useMultiAppUpdateAction } from './hooks/useMultiAppUpdateAction';
import { useRouteUrl } from './hooks/useRouteUrl';
import { useStartAllAction } from './hooks/useStartAllAction';
import { useStopAllAction } from './hooks/useStopAllAction';

const useLink = () => {
  const record = useCollectionRecordData();
  const url = useRouteUrl({ name: record.name, cname: record.cname });
  return url;
};

const AppVisitor = () => {
  const { t } = usePluginUtils();
  const link = useLink();
  const record = useCollectionRecordData();
  const { handleStart, handleStop } = useHandle(record);

  return (
    <Space split={<Divider type="horizontal" />}>
      <TrackingLink href={link} target={'_blank'} rel="noreferrer" trackingKey="multiapp_linkView">
        {t('View', { ns: NAMESPACE })}
      </TrackingLink>
      {record.status !== 'running' && <a onClick={() => handleStart()}>{t('Start', { ns: NAMESPACE })}</a>}
      {record.status !== 'stopped' && <a onClick={() => handleStop()}>{t('Stop', { ns: NAMESPACE })}</a>}
    </Space>
  );
};

// 简单的通知显示处理
export const GlobalNotificationHandler = (props) => {
  const { data, mutate, refresh } = useDataBlockRequest<any[]>();
  // 监听通知事件，只处理通知显示部分
  useNoticeSub(NOTIFY_STATUS_EVENT_KEY, (message) => {
    const func = notification[message.level] || notification.info;
    if (message.message) {
      func({
        key: NOTIFICATION_CLIENT_KEY,
        message: message.message,
      });
    } else if (message.status !== 'commanding' && message.status !== 'initializing') {
      notification.destroy(NOTIFICATION_CLIENT_KEY);
    }
    // 当前records没有则不刷新
    if (!data?.data || message.refresh) {
      refresh();
      return;
    }
    if (!message.app && !message.status) {
      return;
    }
    const existItem = data.data.some((v) => v.name === message.app);
    if (!existItem) {
      return;
    }
    const updatedData = [...data.data]; // 创建副本
    updatedData.find((v) => v.name === message.app).status = message.status;
    mutate({
      ...data,
      data: updatedData,
    });
  });
  return null;
};

export const AppManager = (props) => {
  const { admin = true } = props;
  const currentUser = useCurrentUserContext();
  const userId = currentUser?.data?.data?.id;
  // const { t } = useTranslation([NAMESPACE, 'core'], { nsMode: 'fallback' });
  const { t } = usePluginUtils();

  return (
    <Card bordered={false}>
      <ExtendCollectionsProvider collections={[collectionMultiApp]}>
        <SchemaComponent
          schema={schemaAppManager}
          scope={{
            admin,
            userId,
            useCreateDatabaseConnectionAction,
            useMultiAppUpdateAction,
            useStartAllAction,
            useStopAllAction,
            t,
            uid,
          }}
          components={{ AppVisitor, GlobalNotificationHandler }}
        />
      </ExtendCollectionsProvider>
    </Card>
  );
};
