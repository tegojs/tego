import { useContext, useState } from 'react';
import { SchemaOptionsContext } from '@tachybase/schema';

import { ShareAltOutlined } from '@ant-design/icons';
import { PageHeader as AntdPageHeader } from '@ant-design/pro-layout';
import { Button, Modal } from 'antd';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { useMatch } from 'react-router-dom';

import { useContextMenu } from '../../../../built-in/context-menu/useContextMenu';
import { Icon } from '../../../../icon';
import { useGlobalTheme } from '../../../../style/theme';
import { useCompile } from '../../../hooks';
import { useShareActions } from '../hooks/useShareActions';
import { useStyles as modalStyle } from '../style';
import { HeaderExtra } from './HeaderExtra';
import { TabComponent } from './TabComponent';
import { TabItem } from './TabItem';

export const PageHeader = (props) => {
  const {
    disablePageHeader,
    enablePageTabs,
    setHeight,
    activeKey,
    setLoading,
    setPageTabUrl,
    fieldSchema,
    title,
    parentProps,
    enableSharePage,
  } = props;

  const { theme } = useGlobalTheme();
  const options = useContext(SchemaOptionsContext);
  const [open, setOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const { showScrollArea } = useContextMenu();

  const hidePageTitle = fieldSchema['x-component-props']?.hidePageTitle;

  const pageHeaderTitle = hidePageTitle ? undefined : title;
  const isShare = useMatch('/share/:name');

  // THINK: 思考下这里怎么缓存, 直接用 useMemo 是不行的
  const items = fieldSchema.mapProperties((schema) => ({
    key: schema.name as string,
    label: <TabItem schema={schema} />,
  }));
  const { t } = useTranslation();

  const { styles } = modalStyle();

  const { copyLink, imageAction } = useShareActions({
    title: pageHeaderTitle,
    uid: '',
  });

  return (
    <div
      ref={(ref) => {
        setHeight(Math.floor(ref?.getBoundingClientRect().height || 0) + 1);
      }}
      className="tb-page-header-wrapper"
    >
      {!disablePageHeader && (
        <AntdPageHeader
          className={classNames('pageHeaderCss', pageHeaderTitle || enableSharePage ? '' : 'height0')}
          ghost={false}
          // 如果标题为空的时候会导致 PageHeader 不渲染，所以这里设置一个空白字符，然后再设置高度为 0
          title={pageHeaderTitle}
          {...parentProps}
          extra={
            <HeaderExtra
              enablePageTabs={enablePageTabs}
              showScrollArea={showScrollArea}
              isShare={isShare}
              setOpen={setOpen}
              enableSharePage={enableSharePage}
            />
          }
          footer={
            enablePageTabs && (
              <TabComponent
                activeKey={activeKey}
                setLoading={setLoading}
                setPageTabUrl={setPageTabUrl}
                showScrollArea={showScrollArea}
                options={options}
                theme={theme}
                items={items}
              />
            )
          }
        ></AntdPageHeader>
      )}
      {disablePageHeader && enableSharePage && !isShare && (
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
    </div>
  );
};
