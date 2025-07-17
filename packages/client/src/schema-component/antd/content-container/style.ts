import { createStyles } from 'antd-style';

import { genStyleHook } from './../__builtins__';

export const getStyles = genStyleHook('tb-page', (token) => {
  const { componentCls } = token;

  return {
    [componentCls]: {
      position: 'relative',
      zIndex: 20,
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - var(--tb-header-height))',
      overflow: 'hidden',

      '&:hover': { '> .general-schema-designer': { display: 'block' } },
      '.ant-page-header': { zIndex: 1, position: 'relative' },
      '> .general-schema-designer': {
        position: 'absolute',
        zIndex: 999,
        top: '0',
        bottom: '0',
        left: '0',
        right: '0',
        display: 'none',
        border: '0',
        pointerEvents: 'none',
        '> .general-schema-designer-icons': {
          zIndex: 9999,
          position: 'absolute',
          right: '2px',
          top: '2px',
          lineHeight: '16px',
          pointerEvents: 'all',
          '.ant-space-item': {
            backgroundColor: 'var(--colorSettings)',
            color: '#fff',
            lineHeight: '16px',
            width: '16px',
            paddingLeft: '1px',
          },
        },
      },
      '.tb-page-header-wrapper': {
        zIndex: 10,
        '.ant-page-header-heading': {
          justifyContent: 'start',
          '.ant-btn': {
            border: 'none',
            boxShadow: 'none',
          },
        },
      },

      '.pageHeaderCss': {
        backgroundColor: token.colorBgContainer,
        paddingInline: token.paddingLG,
        '&.ant-page-header-has-footer': {
          paddingTop: token.paddingSM,
          paddingBottom: '0',
          '.ant-page-header-heading-left': {},
          '.ant-page-header-footer': { marginBlockStart: '0' },
        },
        '.ant-tabs-nav': { marginBottom: '0' },
        '.ant-page-header-heading-title': {
          color: token.colorText,
        },
      },

      '.height0': {
        fontSize: 0,
        height: 0,
      },

      '.designerCss': {
        position: 'relative',
        '&:hover': { '> .general-schema-designer': { display: 'block' } },
        '&.tb-action-link': {
          '> .general-schema-designer': {
            top: '-10px',
            bottom: '-10px',
            left: '-10px',
            right: '-10px',
          },
        },
        '> .general-schema-designer': {
          position: 'absolute',
          zIndex: 999,
          top: '0',
          bottom: '0',
          left: '0',
          right: '0',
          display: 'none',
          background: 'var(--colorBgSettingsHover)',
          border: '0',
          pointerEvents: 'none',
          '> .general-schema-designer-icons': {
            position: 'absolute',
            right: '2px',
            top: '2px',
            lineHeight: '16px',
            pointerEvents: 'all',
            '.ant-space-item': {
              backgroundColor: 'var(--colorSettings)',
              color: '#fff',
              lineHeight: '16px',
              width: '16px',
              paddingLeft: '1px',
            },
          },
        },
      },

      '.pageWithFixedBlockCss': {
        height: '100%',
        '> .tb-grid:not(:last-child)': {
          '> .tb-schema-initializer-button': { display: 'none' },
        },
      },

      '.tb-page-wrapper': {
        flex: 1,
        padding: token.paddingMD,
        paddingBottom: 0,
        overflowX: 'hidden',
        overflowY: 'scroll',
      },
      '.tb-page-header-button': {
        flex: 1,
        paddingTop: token.paddingMD,
        paddingLeft: token.paddingMD,
        border: 'none',
      },
    },
  };
});

export const useStyles = createStyles(({ css, token }) => {
  return {
    firstmodal: css`
      .ant-modal-content {
        position: relative;
        overflow: hidden;
        border-radius: 16px;
        &::before,
        &::after {
          content: '';
          position: absolute;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(0, 149, 255, 0.11) 0%, transparent 70%);
          z-index: 0;
          pointer-events: none;
        }

        &::before {
          top: -165px;
          left: -10px;
        }

        &::after {
          bottom: -160px;
          right: -150px;
        }
        .ant-modal-header {
          text-align: center;
          margin-bottom: 20px;
          margin-top: 15px;
          .ant-modal-title {
            font-size: x-large;
            font-weight: 400;
          }
        }
        .ant-modal-body {
          justify-items: center;
        }
      }
    `,
    secondmodal: css`
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      margin-top: 20px;
      margin-bottom: 40px;
      position: relative;
      gap: 20%;
      padding-left: 10%;
      padding-right: 10%;
      .tb-header-modal-list {
        width: 50%;
        gap: 10px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        text-align: center;
        border: 1px solid transparent;
        border-color: rgba(203, 227, 254, 0.62);
        box-shadow: none;
        border-radius: 12px;
        padding: 16px;
        transition:
          box-shadow 0.2s ease,
          transform 0.2s ease;
        z-index: 1;
        position: relative;
        &:hover {
          border-color: rgba(0, 120, 255, 0.3);
          box-shadow: 0 4px 16px rgba(0, 120, 255, 0.15);
        }
        &:active {
          box-shadow: none;
          transform: translateY(2px);
        }
        .anticon {
          width: 100%;
          display: flex;
          justify-content: center;
          svg {
            width: 30px;
            height: 30px;
          }
        }
        .tb-header-modal-list-text {
          text-align: center;
        }
      }
    `,
    imageModal: css`
      display: flex;
      justify-content: center;
      .ant-modal-content {
        width: 280px;
        height: 360px;
      }
    `,
  };
});
