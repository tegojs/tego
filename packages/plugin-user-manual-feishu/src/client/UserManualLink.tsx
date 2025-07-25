import { Icon, useToken } from '@tachybase/client';

import { Button, Tooltip } from 'antd';

import { USER_MANUAL_PATH_FEISHU } from './contants';
import { useTranslation } from './locale';

export const UserManualLink = () => {
  const { t } = useTranslation();
  const { token } = useToken();
  return (
    <Tooltip title={t('User Manual')}>
      <Button
        icon={
          <Icon
            type="QuestionCircleOutlined"
            style={{
              color: token.colorTextHeaderMenu,
            }}
          />
        }
        title={t('User Manual')}
        onClick={() => {
          window.open(USER_MANUAL_PATH_FEISHU, '_blank', 'noopener,noreferrer');
        }}
      />
    </Tooltip>
  );
};
