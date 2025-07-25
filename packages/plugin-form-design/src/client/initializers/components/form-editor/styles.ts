import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ css }) => {
  return {
    editModel: css`
      height: 100vh;
      top: auto !important;
      max-width: 100vw;
      bottom: 0;
      .ant-modal {
        padding: 0;
        margin: 0;
        max-width: 100vw;
      }
      .ant-modal-content {
        border-radius: 0px;
        box-shadow: none;
        height: 100vh;
        background-color: #f5f5f5;
        padding: 0;
      }
      .ant-modal-body {
        height: 100%;
      }
    `,
    header: css`
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 99;
      background: white;
      box-shadow: 0px 5px 3px 1px #f5f5f5;
      position: relative;
      .ant-cancel-button {
        color: black;
        border: none;
        box-shadow: none;
        background: transparent;
      }
      .ant-save-button {
        height: 25px;
      }
      .ant-form-title {
        font-size: medium;
        font-weight: 500;
        margin-right: 10px;
      }
      .center-menu {
        display: flex;
        position: absolute;
        height: 100%;
        left: 50%;
        transform: translateX(-50%);
        .ant-menu {
          height: 100%;
        }
      }
    `,
    fieldsBlock: css`
      margin-top: 5px;
      margin-left: 8px;
      margin-right: 8px;
      .ant-btn-fields {
        width: 100%;
        display: flex;
        gap: 6px;
        padding-left: 5px;
        background-color: #f9fafc;
        border-color: #e8ecf2;
      }
    `,
    previewDrawer: css`
      .ant-drawer-body {
        background-color: #f5f5f5;
        justify-items: center;
        padding: 5px;
        overflow: hidden;
      }
    `,
    toolbar: {
      position: 'absolute',
      zIndex: 999,
      display: 'none',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      border: '2px solid var(--colorBorderSettingsHover)',
      background: 'var(--colorBgSettingsHover)',
      pointerEvents: 'none',

      '.ant-space-item .anticon': {
        margin: 0,
      },
    },
    toolbarTitle: {
      pointerEvents: 'none',
      position: 'absolute',
      fontSize: 12,
      padding: 0,
      lineHeight: '16px',
      height: '16px',
      borderBottomRightRadius: 2,
      borderRadius: 2,
      top: 2,
      left: 2,
    },
    toolbarTitleTag: {
      padding: '0 3px',
      borderRadius: 2,
      background: 'var(--colorSettings)',
      color: '#fff',
      display: 'block',
    },
    toolbarIcons: {
      position: 'absolute',
      right: '2px',
      top: '2px',
      lineHeight: '16px',
      pointerEvents: 'all',
      alignItems: 'center',
      borderRadius: '9999px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      backgroundColor: 'rgba(255,255,255,0.8);',
      padding: '2px 5px 2px 5px',
      '.ant-space-item': {
        // backgroundColor: 'var(--colorSettings)',
        color: 'rgba(30, 30, 30, 0.8)',
        lineHeight: '16px',
        width: '16px',
        paddingLeft: '1px',
        alignSelf: 'stretch',
      },
    },
    titleCss: css`
      pointer-events: none;
      position: absolute;
      font-size: 12px;
      padding: 0;
      line-height: 16px;
      height: 16px;
      border-bottom-right-radius: 2px;
      border-radius: 2px;
      top: 2px;
      left: 2px;
      .title-tag {
        padding: 0 3px;
        border-radius: 2px;
        background: var(--colorSettings);
        color: #fff;
        display: block;
      }
    `,
    overrideAntdCSS: css`
      & .ant-space-item .anticon {
        margin: 0;
      }

      &:hover {
        display: flex !important;
      }
    `,
  };
});
