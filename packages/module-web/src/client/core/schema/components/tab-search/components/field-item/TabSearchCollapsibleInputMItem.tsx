import React from 'react';
import { css, SortableItem, useTranslation, withDynamicSchemaProps } from '@tachybase/client';

import { Checkbox, Grid, Switch } from 'antd-mobile';

import { canBeDataField } from '../../utils';
import { useTabSearchCollapsibleInputItemAction } from './TabSearchCollapsibleInputItemAction';
import { IButton, IDatePicker, IInput, ISelect } from './TabSearchCollapsibleInputMItemChild';

export const TabSearchCollapsibleInputMItem = withDynamicSchemaProps(
  (props) => {
    const {
      collectionField,
      Designer,
      options,
      value,
      needSort,
      onSelectChange,
      onInputChange,
      onButtonClick,
      customLabelKey,
      fieldInterface,
      onDateClick,
      setNeedSort,
    } = useTabSearchCollapsibleInputItemAction(props);
    const { t } = useTranslation();

    if (!collectionField) {
      return null;
    }
    return (
      <SortableItem>
        <Designer />
        <div
          className={css`
            display: flex;
            flex-direction: row;
            align-items: center;
          `}
        >
          <Grid
            columns={4}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'flex-start',
              padding: '10px',
              backgroundColor: '#f9f9f9',
              borderRadius: '5px',
              margin: '5px 0 0 0',
            }}
          >
            <ISelect options={options} onChange={onSelectChange} customLabelKey={customLabelKey} />
            {canBeDataField(fieldInterface) ? (
              <IDatePicker value={value} onChange={onDateClick} onInputChange={onInputChange} options={options} />
            ) : (
              <>
                <IInput options={options} value={value} onChange={onInputChange} />
                <IButton onClick={onButtonClick} />
              </>
            )}
          </Grid>
          {/* <Checkbox
            className={css`
              margin-right: 10px;
            `}
            checked={needSort}
            onChange={setNeedSort}
          >
            {t('sort')}
          </Checkbox> */}
        </div>
      </SortableItem>
    );
  },
  { displayName: 'TabSearchCollapsibleInputItem' },
);
