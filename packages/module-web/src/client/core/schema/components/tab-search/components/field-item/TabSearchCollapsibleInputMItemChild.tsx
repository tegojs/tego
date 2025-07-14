import React, { useRef, useState } from 'react';
import { css, useTranslation } from '@tachybase/client';
import { dayjs } from '@tachybase/utils/client';

import { ActionSheet, Button, Calendar, Divider, Grid, Input, Picker, Popup } from 'antd-mobile';
import { DownOutline } from 'antd-mobile-icons';
import type { Action } from 'antd-mobile/es/components/action-sheet';

import { lang } from '../../../../../../locale';
import { convertFormat } from '../../utils';

export const ISelect = (props) => {
  const { options, onChange, customLabelKey } = props;
  const actions: Action[] = options.map((item) => {
    return {
      text: item.label,
      key: item.value,
    };
  });
  const [visible, setVisible] = useState(false);
  return options.length > 1 ? (
    <Grid.Item
      style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      onClick={() => {
        setVisible(true);
      }}
    >
      <span style={{ textAlign: 'center', width: '100%' }}>
        {options.find((option) => option.value === customLabelKey)?.label}
      </span>
      <DownOutline />
      {options.length <= 5 ? (
        <ActionSheet
          visible={visible}
          actions={actions}
          closeOnAction
          onClose={() => setVisible(false)}
          onAction={(v) => {
            onChange(v.key);
          }}
        />
      ) : (
        <Picker
          columns={[options]}
          visible={visible}
          onClose={() => {
            setVisible(false);
          }}
          defaultValue={customLabelKey}
          onConfirm={(v) => {
            onChange(v[0]);
          }}
        />
      )}

      <Divider direction="vertical" style={{ height: '70%', margin: '0 0 0 5px' }} />
    </Grid.Item>
  ) : null;
};

export const IDatePicker = (props) => {
  const { options, value, onChange, onInputChange } = props;
  const time = value.split('&');
  const [visible, setVisible] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const minDate = dayjs().subtract(10, 'year').toDate();
  const maxDate = dayjs().add(3, 'year').toDate();

  const onClick = () => {
    setVisible(true);
  };

  const onChangeDate = ([start, end]) => {
    const startTime = dayjs(start).startOf('date').toISOString();
    const endTime = dayjs(end).endOf('date').toISOString();
    // TODO: 此处受上游影响,格式必须确定为这样, 时间有限,不再往上追查
    const timeString = `"${startTime}"&"${endTime}"`;
    onInputChange(timeString);
    onChange(timeString);

    // XXX: UI 组件库这个组件是实验性组件, 此处模拟实现自动关闭浮层功能
    if (clickCount > 0 && clickCount % 2 === 1) {
      setVisible(false);
      setClickCount(0);
    } else {
      setClickCount((preClickCount) => preClickCount + 1);
    }
  };

  return (
    <Grid.Item span={options.length > 1 ? 3 : 4}>
      <div onClick={onClick}>
        <Grid columns={5}>
          <Grid.Item span={2} style={{ textAlign: 'end' }}>
            {convertFormat(JSON.parse(time[0]))}
          </Grid.Item>
          <Grid.Item span={1} style={{ textAlign: 'center' }}>
            -
          </Grid.Item>
          <Grid.Item span={2} style={{ textAlign: 'start' }}>
            {convertFormat(JSON.parse(time[1]))}
          </Grid.Item>
        </Grid>
      </div>
      <Popup
        visible={visible}
        destroyOnClose
        mask
        closeOnMaskClick
        onMaskClick={() => setVisible(false)}
        onClose={() => setVisible(false)}
        // bodyStyle={{ height: '50vh' }}
      >
        <Calendar
          selectionMode="range"
          allowClear
          min={minDate}
          max={maxDate}
          // defaultValue={defaultRange}
          onChange={onChangeDate}
        />
      </Popup>
    </Grid.Item>
  );
};

export const IInput = (props) => {
  const { options, value, onChange } = props;
  return (
    <Grid.Item style={{ flex: 1 }} span={options.length > 1 ? 2 : 3}>
      <Input
        placeholder={lang('Please enter search content')}
        value={value}
        onChange={onChange}
        style={{ '--font-size': '12px', marginLeft: '5px' }}
      />
    </Grid.Item>
  );
};

export const IButton = (props) => {
  const { onClick } = props;
  const { t } = useTranslation();
  return (
    <Grid.Item onClick={onClick} style={{ color: '#2c6eff', textAlign: 'center', cursor: 'pointer' }}>
      {t('Search')}
    </Grid.Item>
  );
};
