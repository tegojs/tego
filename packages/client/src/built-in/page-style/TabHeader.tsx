import { useCallback, useContext } from 'react';

import { css } from '@emotion/css';
import { Button } from 'antd';
import cx from 'classnames';
import { useNavigate } from 'react-router';
import { useLocation } from 'react-router-dom';

import { Icon } from '../../icon';
import { PageStyleContext } from './PageStyle.provider';
import { useStyles } from './TabHeader.style';

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
  const { items, setItems } = useContext(PageStyleContext);
  const targetKey = location.pathname;
  const { styles } = useStyles();

  const handleCloseTab = useCallback(
    (e, item) => {
      e.stopPropagation();
      setItems((items) => {
        const idx = items.findIndex((i) => i.key === item.key);
        const isCurrent = item.key === targetKey;
        const newItems = items.filter((i) => i.key !== item.key);

        if (isCurrent) {
          // 关闭的是当前标签页
          if (newItems.length === 0) {
            // 没有标签页了，跳转到首页
            navigate('/');
          } else {
            // 优先跳转到右侧标签页，否则跳转到左侧
            const nextTab = items[idx + 1] || items[idx - 1];
            if (nextTab) {
              navigate(nextTab.key);
            } else {
              // 理论上不会走到这里，但兜底跳转首页
              navigate('/');
            }
          }
        }
        return newItems;
      });
    },
    [items, targetKey, navigate, setItems],
  );

  return (
    <div className={styles.tabWrapper}>
      {items.map((item) => (
        <Tag
          key={item.key}
          active={item.key === targetKey}
          onClick={() => {
            navigate(item.key);
          }}
          onClose={useCallback((e) => handleCloseTab(e, item), [handleCloseTab, item])}
        >
          {item.label}
        </Tag>
      ))}
    </div>
  );
};
