import React, { useEffect, useState } from 'react';
import {
  BlockItem,
  CollectionProvider,
  MobileProvider,
  useCollectionManager,
  useFieldServiceFilter,
  useRequest,
  useTranslation,
} from '@tachybase/client';
import { ArrayField, observer, useField, useFieldSchema, useForm } from '@tachybase/schema';
import { isArray } from '@tachybase/utils/client';

import { Button, CascaderView, Divider, Popup, SearchBar, Space } from 'antd-mobile';
import { CloseOutline } from 'antd-mobile-icons';

import { MInput } from '../Input';
import { useStyles } from './style';

export const AntdCascader = observer((props) => {
  const {
    service,
    fieldNames,
    disabled,
    useLoadData,
    useDataSource,
    multiple,
    onChange,
    value,
    formCascaderValues,
    index,
  } = props as any;
  const fieldSchema = useFieldSchema();
  const cm = useCollectionManager();
  const { styles } = useStyles();
  const collectionField = cm.getCollectionField(fieldSchema['x-collection-field']);
  const changOnSelect = fieldSchema['x-component-props']?.changOnSelect || false;
  const collection = cm.getCollection(fieldSchema['x-collection-field']);
  const isChinaRegion = collectionField.interface === 'chinaRegion';
  const [options, setOptions] = useState([]);
  const [popupVisible, setPopupVisible] = useState(false);
  const [fieldServiceFilter] = useFieldServiceFilter(service?.params);
  const [filter, setFilter] = useState(fieldServiceFilter);
  const [searchValue, setSearchValue] = useState('');
  const [cascaderValue, setCascaderValue] = useState(value);
  const [valueText, setValueText] = useState('');
  const [flatOption, setFlatOption] = useState([]);
  const field = useField<ArrayField>();
  const { loading: collectionLoading, run: collectionRun } = useRequest(
    {
      resource: collection?.name,
      action: 'list',
      params: {
        filter,
        tree: true,
      },
    },
    {
      manual: true,
      onSuccess({ data }) {
        if (data) {
          setOptions(data);
          field.dataSource = data || [];
          const valueOption = flatOptions(data);
          setFlatOption(valueOption);
          if (value) {
            setValueText(getValueText(valueOption, value, '', fieldNames['label']));
          }
        }
      },
    },
  );
  const loadData = useLoadData?.(props);
  const { loading: areaLoading, run: areaRun } = useDataSource?.({
    onSuccess(data) {
      field.dataSource = data?.data || [];
      setOptions(data?.data);
    },
  }) || { loading: true, run: null };
  if (!valueText && value && isChinaRegion) {
    setValueText(getChinaRegionText(value, fieldNames));
  }
  useEffect(() => {
    if (!isChinaRegion && collection?.name) {
      checkedPopup();
    }
  }, [filter]);
  useEffect(() => {
    if (!isChinaRegion && flatOption.length) {
      setValueText(getValueText(flatOption, value, '', fieldNames['label']));
    }
  }, [fieldSchema['x-component-props']?.['fieldNames']]);

  const handleSelect = async (option) => {
    if (option) {
      setCascaderValue(isChinaRegion ? option : option[option.length - 1]);
    } else {
      setCascaderValue({});
    }
  };

  const checkedPopup = () => {
    if (!isChinaRegion) {
      collectionRun();
    } else {
      areaRun();
    }
  };

  return (
    <CollectionProvider name={collectionField.collectionName}>
      <div
        onClick={() => {
          if (disabled) return;
          setPopupVisible(true);
          checkedPopup();
        }}
        style={{ display: 'flex', alignItems: 'center' }}
      >
        {value && Object.keys(value).length ? (
          <MInput style={{ '--color': '#1e8bf1' }} value={valueText} disabled={disabled} clearable={false} />
        ) : (
          <MInput value={valueText ? '' : '请选择'} style={{ '--color': '#c5c5c5' }} />
        )}
        {(value && Object.keys(value).length) || (formCascaderValues && index !== 0) ? (
          <CloseOutline
            style={{ margin: '5px 10px 5px 20px' }}
            onClick={() => {
              if (index) {
                const formValue = [...formCascaderValues];
                if (formCascaderValues.length === 1 && index === 0) {
                  formValue[index] = {};
                } else {
                  formValue.splice(index, 1);
                }
                onChange(formValue);
              } else {
                onChange({});
              }
            }}
          />
        ) : null}
      </div>
      <Popup
        visible={popupVisible}
        className={`${styles['PopupStyle']}`}
        onMaskClick={() => {
          setPopupVisible(false);
        }}
      >
        <MobileProvider>
          {!isChinaRegion ? (
            <>
              <SearchBar
                placeholder="请输入内容"
                value={searchValue}
                onChange={(value) => {
                  const paramsFilter = { ...filter };
                  paramsFilter[fieldNames['label']] = { $includes: value };
                  setFilter(paramsFilter);
                  setSearchValue(value);
                }}
              />
              <Divider />
            </>
          ) : null}
          <CascaderView
            loading={isChinaRegion ? areaLoading : collectionLoading}
            fieldNames={fieldNames}
            options={options}
            onChange={(value, extend) => {
              if (isChinaRegion) {
                const maxLevel = field.componentProps.maxLevel;
                const targetOption = extend['items'][extend['items'].length - 1];
                if (maxLevel > targetOption.level) {
                  targetOption.children = [];
                }
                loadData(extend['items'], (data) => {
                  if (data?.data.length) {
                    targetOption.children = data.data.map((item) => {
                      if (maxLevel > item.level) {
                        item.isLeaf = false;
                      }
                      return item;
                    });
                    setOptions([...options]);
                  }
                });
              }
              handleSelect(extend['items']);
            }}
          />
          <Space justify="evenly" align="center">
            <Button
              color="primary"
              onClick={() => {
                setPopupVisible(false);
                const paramsFilter = { ...filter };
                if (paramsFilter[fieldNames['label']]) delete paramsFilter[fieldNames['label']];
                setSearchValue('');
                setFilter(paramsFilter);
              }}
            >
              取消
            </Button>
            <Button
              color="primary"
              onClick={() => {
                const changevalue = multiple ? getChangValue(formCascaderValues, cascaderValue, index) : cascaderValue;
                onChange(changevalue);
                const valText = isChinaRegion
                  ? getChinaRegionText(cascaderValue, fieldNames)
                  : getValueText(flatOption, cascaderValue, '', fieldNames['label']);
                setValueText(valText);
                setPopupVisible(false);
                if (!isChinaRegion) {
                  const paramsFilter = { ...filter };
                  delete paramsFilter[fieldNames['label']];
                  setSearchValue('');
                  setFilter(paramsFilter);
                }
              }}
              disabled={
                !changOnSelect
                  ? cascaderValue &&
                    cascaderValue !== '{}' &&
                    (!cascaderValue?.children || !cascaderValue?.children.length)
                    ? false
                    : true
                  : cascaderValue && cascaderValue !== '{}'
                    ? false
                    : true
              }
            >
              确定
            </Button>
          </Space>
        </MobileProvider>
      </Popup>
    </CollectionProvider>
  );
});

const getValueText = (option, item, value, label) => {
  const text = `${item?.[label] || ''}${value}`;
  if (item?.parentId) {
    const filterItem = option.find((optionsItem) => optionsItem.id === item.parentId);
    const itemText = `/${text}`;
    return getValueText(option, filterItem, itemText, label);
  }
  return text;
};

const flatOptions = (options) => {
  const flatChildren = (item, option) => {
    option.push(item);
    if (item?.children) {
      item.children.forEach((childrenItem) => {
        return flatChildren(childrenItem, option);
      });
    }
    return option;
  };
  const optionflat = [];
  options.forEach((value) => {
    const flatValue = flatChildren(value, []);
    optionflat.push(...flatValue);
  });
  return optionflat;
};

const getChangValue = (formCascaderValues, cascaderValue, index) => {
  const value = [];
  if (formCascaderValues && (index || index === 0)) {
    formCascaderValues[index] = cascaderValue;
    value.push(...formCascaderValues);
  } else {
    value.push(cascaderValue);
  }
  return value;
};

const getChinaRegionText = (value, fieldNames) => {
  return value?.reduce((prev, curr, index) => {
    return prev + `${curr[fieldNames['label']]}${value.length - 1 === index ? '' : '/'}`;
  }, '');
};

export const InternalCascader = observer((props) => {
  const { value, onChange, multiple } = props as any;
  const { t } = useTranslation();
  return (
    <>
      {isArray(value) && multiple ? (
        <>
          {value.map((item, index) => {
            const filterProps = {
              ...props,
              value: item,
              formCascaderValues: value || [],
              index,
            };
            return <AntdCascader {...filterProps} key={index} />;
          })}
        </>
      ) : (
        <AntdCascader {...props} />
      )}
      {multiple ? (
        <>
          <Button
            style={{
              textAlign: 'center',
              width: '100%',
              border: '1px dashed #c5c5c5',
              color: '#c5c5c5',
              fontSize: '12px',
              height: '5vh',
              lineHeight: '2vh',
            }}
            onClick={() => {
              const pushValue = value ? [...value, {}] : [{}, {}];

              onChange(pushValue);
            }}
          >
            + {t('Add new')}
          </Button>
        </>
      ) : null}
    </>
  );
});
