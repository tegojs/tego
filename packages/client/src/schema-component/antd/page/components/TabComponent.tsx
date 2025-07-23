import { useEffect, useState } from 'react';

import { PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Tabs } from 'antd';

import { DndContext } from '../../../common';
import { useStyles } from '../Page.style';
import { TabBarExtraContent } from './TabBarExtraContent';

export const TabComponent = (props) => {
  const { activeKey, setLoading, setPageTabUrl, showScrollArea, options, theme, items } = props;

  const { styles } = useStyles();

  // react18  tab 动画会卡顿，所以第一个 tab 时，动画禁用，后面的 tab 才启用
  const [hasMounted, setHasMounted] = useState(false);

  // 配置传感器（确保拖拽行为正常）
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 移动 5px 后触发拖拽
      },
    }),
  );

  const handleTabClick = (activeKey) => {
    setPageTabUrl(activeKey);
  };

  useEffect(() => {
    setTimeout(() => {
      setHasMounted(true);
    });
  }, []);
  return (
    <DndContext sensors={sensors}>
      <Tabs
        className={styles.tabComponentClass}
        type="card"
        size={'small'}
        animated={hasMounted}
        activeKey={activeKey}
        items={items}
        onTabClick={handleTabClick}
        tabBarExtraContent={<TabBarExtraContent theme={theme} showScrollArea={showScrollArea} options={options} />}
      />
    </DndContext>
  );
};
