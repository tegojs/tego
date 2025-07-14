import { useState } from 'react';
import { Icon, usePageExtendComponentContext, useTranslation } from '@tachybase/client';

import { ShareAltOutlined } from '@ant-design/icons';
import { Button, Modal } from 'antd';

import { useShareActions } from '../../hook/useShareActions';
import { useModalStyles } from './style';

export const MShareModal = () => {
  const { fieldSchema, isHeaderEnabled, title, enabledSharePage } = usePageExtendComponentContext() as any;
  const uid = fieldSchema?.['x-uid'];
  const [imageOpen, setImageOpen] = useState(false);
  const { styles: modalStyle } = useModalStyles();
  const { t } = useTranslation();
  const { copyLink, imageAction } = useShareActions({ title, uid });
  const [open, setOpen] = useState(false);

  return (
    <>
      {isHeaderEnabled && enabledSharePage && (
        <Button
          icon={<ShareAltOutlined />}
          onClick={() => {
            setOpen(true);
          }}
        />
      )}
      {!isHeaderEnabled && enabledSharePage && (
        <div style={{ display: 'flex', justifyContent: 'end', backgroundColor: '#ffffff', paddingRight: '20px' }}>
          <Button
            icon={<ShareAltOutlined />}
            style={{ border: 'none' }}
            onClick={() => {
              setOpen(true);
            }}
          />
        </div>
      )}
      <Modal
        open={open}
        className={modalStyle.firstmodal}
        title={t('Share')}
        footer={null}
        width={300}
        onCancel={() => {
          setOpen(false);
        }}
      >
        <div className={modalStyle.secondmodal}>
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
          className={modalStyle.imageModal}
          open={imageOpen}
          footer={null}
          onCancel={() => {
            setImageOpen(false);
          }}
        >
          {imageAction()}
        </Modal>
      </Modal>
    </>
  );
};
