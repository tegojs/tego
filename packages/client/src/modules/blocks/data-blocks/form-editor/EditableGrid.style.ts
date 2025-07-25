import { createStyles } from 'antd-style';

const useStyles = createStyles(({ css, token }) => {
  return {
    editableGrid: css`
      .ColDivider {
        flex-shrink: 0;
        width: ${token.marginLG}px;

        .DraggableNode {
          width: ${token.marginLG}px;
          height: 100%;
          position: absolute;
          cursor: col-resize;

          &::before {
            content: ' ';
            width: 100%;
            height: 100%;
            position: absolute;
            cursor: col-resize;
          }

          &:hover::before {
            background: var(--colorBgSettingsHover) !important;
          }
        }
      }

      .RowDivider {
        height: ${token.marginLG}px;
        width: 100%;
        position: absolute;
        margin-top: calc(-1 * ${token.marginLG}px);
      }

      .CardRow {
        display: flex;
        position: relative;
      }

      .showDivider {
        margin: 0 calc(-1 * ${token.marginLG}px);
      }
    `,
  };
});

export default useStyles;
