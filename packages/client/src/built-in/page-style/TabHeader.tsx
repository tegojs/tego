import { useContext } from 'react';

import { css } from '@emotion/css';
import { Button } from 'antd';
import cx from 'classnames';
import { useNavigate } from 'react-router';
import { useLocation } from 'react-router-dom';

import { Icon } from '../../icon';
import { PageStyleContext } from './PageStyle.provider';
import { useStyles } from './TabHeader.style';
import { useCloseTab } from './useCloseTab';

export const Tag = ({ onClick, onClose, children, active }) => {
  const { styles } = useStyles();
  return (
    <span onClick={onClick} className={cx(styles.tabHeader, { active })}>
      <span className="tab-text">{children}</span>
      <Button
        className={css`
          color: rgba(255, 255, 255, 0.88);
        `}
        type="text"
        onClick={onClose}
        icon={<Icon type="CloseOutlined" />}
      ></Button>
    </span>
  );
};

export const TabHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { items } = useContext(PageStyleContext);
  const targetKey = location.pathname;
  const { styles } = useStyles();

  const { handleCloseTab } = useCloseTab();

  return (
    <div className={styles.tabWrapper}>
      {items.map((item) => (
        <Tag
          key={item.key}
          active={item.key === targetKey}
          onClick={() => {
            navigate(item.key);
          }}
          onClose={(e) => handleCloseTab(e, item)}
        >
          {item.label}
        </Tag>
      ))}
    </div>
  );
};
