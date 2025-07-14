import { createStyles } from '@tachybase/client';

export const useStyles = createStyles(({ css, token }) => {
  return {
    mobileNav: css`
      position: relative;
      width: 100%;
      .ant-btn {
        display: flex;
        align-items: center;
        height: 100%;
        position: absolute;
        right: 20px;
        bottom: 0;
        border: none;
      }
    `,
  };
});
