import { createStyles } from 'antd-style';

export const useModalStyles = createStyles(({ css, token }) => {
  return {
    firstmodal: css`
      .ant-modal-content {
        position: relative;
        overflow: hidden;
        border-radius: 16px;
        padding: 0;
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
          margin-top: 30px;
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
      gap: 15%;
      padding-left: 8%;
      padding-right: 8%;
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
