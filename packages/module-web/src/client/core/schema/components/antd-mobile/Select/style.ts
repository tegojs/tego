import { createStyles } from '@tachybase/client';

export const useStyles = createStyles(({ css }) => ({
  PopupStyle: css`
    .adm-popup-body {
      padding: 10px;
      .adm-space {
        width: 100%;
        margin: 10px 0 10px 0;
        color: #4592ff;
        button {
          width: 23vw;
        }
      }
      .adm-divider {
        margin: 0;
      }
      .adm-list-body {
        height: 30vh;
        overflow: auto;
        text-align: center;
      }
    }
  `,
  customPickerView: css`
    --item-height: 80px;
    .adm-picker-view-column-item-label.adm-picker-view-column-item-label {
      white-space: normal;
      word-wrap: break-word;
      word-break: break-all;
      line-height: 1.4;
      padding: 8px 12px;
      min-height: 44px;
      display: flex;
      align-items: center;
    }
  `,
}));
