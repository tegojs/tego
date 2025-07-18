import { CloseOutlined } from '@ant-design/icons';
import { css } from '@emotion/css';
import { Button } from 'antd';

import { useActionContext } from '../hooks';
import { FullScreenButton } from './FullScreenButton';

export const DrawerButton = () => {
  const { setVisible } = useActionContext();

  const handleClose = () => {
    setVisible(false, true);
  };

  return (
    <>
      <FullScreenButton />
      <Button
        type="text"
        icon={<CloseOutlined />}
        className={css`
          background: none;
          border: none;
        `}
        onClick={handleClose}
      />
    </>
  );
};
