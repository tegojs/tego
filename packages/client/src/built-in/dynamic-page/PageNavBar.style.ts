import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ css }) => ({
  'page-nav-bar': css`
    position: sticky;
    top: 0;
    z-index: 1000;
    background: #fff;
    padding: 16px 24px;
    border-bottom: 1px solid #f0f0f0;

    .nav-title {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 12px;
      font-size: 16px;
      color: #000;
      cursor: pointer;
    }
  `,
}));
