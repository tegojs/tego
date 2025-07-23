import { ShareAltOutlined } from '@ant-design/icons';
import { Button } from 'antd';

import { ScrollArea } from '../..';

export const HeaderExtra = ({ enablePageTabs, showScrollArea, isShare, setOpen, enableSharePage }) => {
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
