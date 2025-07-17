import { useState } from 'react';

import { FullscreenExitOutlined, FullscreenOutlined } from '@ant-design/icons';
import { css } from '@emotion/css';
import { Button } from 'antd';

export const FullScreenButton = () => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [blockWidth, setBlockWidth] = useState('');

  return (
    <Button
      type="text"
      icon={isFullScreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
      className={css`
        background: none;
        border: none;
      `}
      onClick={(e) => {
        const element = (e.target as HTMLElement).closest('.ant-drawer-content-wrapper') as HTMLElement;
        if (isFullScreen) {
          element.style.width = blockWidth;
        } else {
          setBlockWidth(element.getBoundingClientRect().width + 'px');
          element.style.width = '100%';
        }
        setIsFullScreen(!isFullScreen);
      }}
    />
  );
};
