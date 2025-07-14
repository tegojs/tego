import React from 'react';
import { css, useTranslation } from '@tachybase/client';
import { DatePicker } from '@tachybase/components';
import { dayjs } from '@tachybase/utils/client';

import { Button, Col, Divider, Input, Select } from 'antd';

export const ISelect = (props) => {
  const { options, onChange } = props;
  return options.length > 1 ? (
    <Col flex={1} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
      <Select style={{ width: '100%' }} options={options} defaultValue={options[0].value} onChange={onChange} />
      <Divider type="vertical" style={{ height: '70%' }} />
    </Col>
  ) : null;
};

export const IInput = (props) => {
  const { options, value, onChange } = props;
  const { t } = useTranslation();
  return (
    <Col flex={options.length > 1 ? 3 : 4}>
      <Input placeholder={t('Please enter search content')} value={value} onChange={onChange} />
    </Col>
  );
};

export const IDatePicker = (props) => {
  const { options, value, onInputChange } = props;
  const time = value.split('&');
  const onDateChange = (e) => {
    const timeString = `"${e[0]}"&"${e[1]}"`;
    onInputChange(timeString);
  };
  return (
    <Col flex={options.length > 1 ? 3 : 4}>
      <DatePicker.RangePicker
        className={css`
          width: 100%;
          border: none;
          input {
            text-align: center;
          }
        `}
        value={time}
        onChange={onDateChange}
      />
    </Col>
  );
};

export const IButton = (props) => {
  const { onClick } = props;
  const { t } = useTranslation();

  return (
    <Col flex={1}>
      <Button style={{ width: '100%', color: '#2c6eff' }} type="link" onClick={onClick}>
        {t('Search')}
      </Button>
    </Col>
  );
};
