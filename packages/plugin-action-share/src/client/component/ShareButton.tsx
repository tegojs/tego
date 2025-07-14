import { useState } from 'react';
import { Icon, useCompile, usePageExtendComponentContext, useTranslation } from '@tachybase/client';
import { connect, observe } from '@tachybase/schema';

import { PlusOutlined, ShareAltOutlined } from '@ant-design/icons';
import { Button, Modal } from 'antd';
import { useMatch } from 'react-router';

import { useModalStyles } from '../component/style';
import { useShareActions } from '../hook/useShareActions';

export const ShareButton = connect((props) => {
  const extendProps = usePageExtendComponentContext();
  const { disablePageHeader, fieldSchema = {}, title = '', enableSharePage, isExtra } = extendProps as any;
  const isShare = useMatch('/share/:name');
  const hidePageTitle = fieldSchema?.['x-component-props']?.hidePageTitle;
  const [open, setOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const compile = useCompile();
  const { t } = useTranslation();
  const pageHeaderTitle = hidePageTitle ? undefined : fieldSchema.title || compile(title);
  const { styles } = useModalStyles();
  const { copyLink, imageAction } = useShareActions({ title: pageHeaderTitle, uid: fieldSchema['x-uid'] });
  return (
    <>
      {!isShare && isExtra && (
        <Button
          icon={<ShareAltOutlined />}
          onClick={() => {
            setOpen(true);
          }}
          style={{ visibility: `${enableSharePage ? 'visible' : 'hidden'}` }}
        />
      )}
      {!isExtra && disablePageHeader && enableSharePage && !isShare && (
        <div className="tb-page-header-button">
          <Button
            icon={<ShareAltOutlined />}
            onClick={() => {
              setOpen(true);
            }}
          >
            {t('Share')}
          </Button>
        </div>
      )}
      {
        <Modal
          open={open}
          className={styles.firstmodal}
          title={t('Share')}
          footer={null}
          width={500}
          onCancel={() => {
            setOpen(false);
          }}
        >
          <div className={styles.secondmodal}>
            <div className="tb-header-modal-list" onClick={copyLink}>
              <Icon type="PaperClipOutlined" />
              {t('Copy link')}
            </div>
            <div
              className="tb-header-modal-list"
              onClick={() => {
                setImageOpen(true);
              }}
            >
              <Icon type="QrcodeOutlined" />
              {t('Generate QR code')}
            </div>
          </div>
          <Modal
            className={styles.imageModal}
            open={imageOpen}
            footer={null}
            onCancel={() => {
              setImageOpen(false);
            }}
          >
            {imageAction()}
          </Modal>
        </Modal>
      }
    </>
  );
});
