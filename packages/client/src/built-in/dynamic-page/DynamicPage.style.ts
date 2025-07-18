import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ css, token }) => ({
  'dynamic-page': css`
    display: flex;
    flex-direction: column;
    /* height: 100vh; */
    .page-content {
      /* height: 90%; */
      margin: ${token.paddingContentHorizontal}px;
      overflow: hidden;

      .ant-card-body {
        position: relative;
        height: 90vh;
        overflow: hidden;
        .ant-formily-layout {
          height: 100%;
          .ant-tb-grid {
            height: 70vh;
            overflow-x: hidden;
            overflow-y: scroll;
            margin-bottom: 200px;
          }
        }
      }
    }
  `,
}));
