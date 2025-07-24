import React, { useEffect, useMemo, useState } from 'react';
import { isValid, toArr, useFieldSchema, useForm } from '@tachybase/schema';
import { isPlainObject } from '@tachybase/utils/client';

import { CloseCircleFilled, CloseOutlined } from '@ant-design/icons';
import { useAsyncEffect } from 'ahooks';
import { Select as AntdSelect, Empty, Spin, Tag, type SelectProps } from 'antd';

import { useAPIClient, useRequest } from '../../../api-client';
import { useCollection_deprecated } from '../../../collection-manager';
import { FieldNames, getCurrentOptions } from './utils';

type Props = SelectProps<any, any> & {
  objectValue?: boolean;
  onChange?: (v: any) => void;
  multiple: boolean;
  rawOptions: any[];
  fieldNames: FieldNames;
};

const isEmptyObject = (val: any) => !isValid(val) || (typeof val === 'object' && Object.keys(val).length === 0);

const ObjectSelect = (props: Props) => {
  const { value, options, onChange, mode, fieldNames, loading, rawOptions, defaultValue, ...others } = props;
  const fieldSchema = useFieldSchema();
  const collectionName = fieldSchema['collectionName'];
  const form = useForm();

  useEffect(() => {
    if (collectionName && fieldSchema['name'].toString().includes('__custom') && defaultValue) {
      const name = fieldSchema['name'].toString().split('.')[1];
      form.values['__custom'][name] = defaultValue?.[fieldNames.value];
    }
  }, []);
  const toValue = (v: any) => {
    if (isEmptyObject(v)) {
      return;
    }
    const values = toArr(v)
      .filter((item) => item)
      .map((val) => {
        return isPlainObject(val) ? val[fieldNames.value] : val;
      });
    const filterOption = options;
    const currentOptions = getCurrentOptions(values, filterOption, fieldNames)?.map((val) => {
      return {
        label: val[fieldNames.label],
        value: val[fieldNames.value],
      };
    });
    if (['tags', 'multiple'].includes(mode) || props.multiple) {
      return currentOptions;
    }
    return currentOptions.shift();
  };
  if (fieldNames['formula']) {
    delete others.onSearch;
    delete others.filterOption;
  }
  return (
    <AntdSelect
      // @ts-ignore
      role="button"
      data-testid={`select-object-${mode || 'single'}`}
      value={toValue(value)}
      defaultValue={toValue(defaultValue)}
      allowClear={{
        clearIcon: <CloseCircleFilled role="button" aria-label="icon-close-select" />,
      }}
      labelInValue
      notFoundContent={loading ? <Spin /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      options={options}
      fieldNames={fieldNames}
      showSearch
      popupMatchSelectWidth={false}
      filterOption={(input, option) => (option?.[fieldNames.label || 'label'] ?? '').includes(input)}
      filterSort={(optionA, optionB) => {
        if (typeof optionA[fieldNames.label] === 'number') {
          return optionA[fieldNames.label] - optionB[fieldNames.label];
        } else if (typeof optionA[fieldNames.label] === 'string') {
          return (optionA?.[fieldNames.label || 'label'] ?? '')
            .toLowerCase()
            .localeCompare((optionB?.[fieldNames.label || 'label'] ?? '').toLowerCase());
        }
      }}
      onChange={(changed) => {
        const current = getCurrentOptions(
          toArr(changed).map((v) => v.value),
          rawOptions || options,
          fieldNames,
        );
        if (['tags', 'multiple'].includes(mode as string) || props.multiple) {
          onChange?.(current);
        } else {
          onChange?.(current.shift() || null);
        }
        if (collectionName && fieldSchema['name'].toString().includes('__custom')) {
          const name = fieldSchema['name'].toString().split('.')[1];
          form.values['__custom'][name] = changed?.['value'];
        }
      }}
      mode={mode}
      tagRender={(props) => {
        return (
          // @ts-ignore
          <Tag
            role="button"
            aria-label={props.label}
            closeIcon={<CloseOutlined role="button" aria-label="icon-close-tag" />}
            {...props}
          >
            {props.label}
          </Tag>
        );
      }}
      {...others}
    />
  );
};

const replacePlaceholders = (inputStr, values) => {
  return inputStr.replace(/{{(.*?)}}/g, function (match, placeholder) {
    return Object.prototype.hasOwnProperty.call(values, placeholder) ? values[placeholder] : match;
  });
};

const useLabelOptions = (others) => {
  const fieldSchema = useFieldSchema();
  const { getField } = useCollection_deprecated();
  const collectionField = useMemo(
    () => getField(fieldSchema['x-collection-field']),
    [fieldSchema['x-collection-field']],
  );
  if (!collectionField?.target && !fieldSchema['collectionName']) {
    return others;
  }
  const request = {
    resource: collectionField?.target || fieldSchema['collectionName'],
    action: 'list',
    params: {
      paginate: false,
    },
  };

  const regex = /{{(.*?)}}/g;
  const matches = [];
  let match;
  while ((match = regex.exec(others.fieldNames.formula)) !== null) {
    matches.push(match[1]);
  }
  const association = matches.filter((value) => value.includes('.'));
  if (association.length) {
    request.params['appends'] = association.map((value) => value.split('.')[0]);
  }

  const formula = others.fieldNames.formula;
  const [data, setData] = useState([]);
  const { run } = useRequest(request, {
    manual: true,
    onSuccess: (result) => {
      setData(result.data);
    },
  });
  useEffect(() => {
    if (formula) {
      run();
    } else {
      setData(others.options);
    }
  }, [formula]);
  if (formula) {
    others.options?.forEach((op) => {
      const valueOject = {};
      let outputStr = '';
      let match;
      data?.forEach((opValue) => {
        if (op.id === opValue.id) {
          while ((match = regex.exec(formula))) {
            if (match[1].includes('.')) {
              const opvalue = opValue[match[1].split('.')[0]];
              const value = opvalue ? opValue[match[1].split('.')[0]][match[1].split('.')[1]] : '';
              valueOject[match[1]] = value ?? '';
            } else {
              valueOject[match[1]] = opValue[match[1]] || '';
            }
          }
          outputStr = replacePlaceholders(formula, valueOject);
        }
      });
      op[others.fieldNames.label] = outputStr;
    });
  }
  return others;
};

const FormulaSelect = (props) => {
  const { objectValue, loading, value, rawOptions, defaultValue, ...others } = props;
  let mode: any = props.multiple ? 'multiple' : props.mode;
  const filterField = others?.['params'];
  const [options, setOptions] = useState([]);
  const [collectionName, setCollectionName] = useState('');
  const fieldSchema = useFieldSchema();
  const api = useAPIClient();
  if (mode && !['multiple', 'tags', 'CustomTitle'].includes(mode)) {
    mode = undefined;
  }
  const fieldProps = { ...others };
  if (others?.collection && others.collection !== collectionName) {
    api
      .request({
        url: others.collection + ':list',
        params: {
          paginate: false,
          filter: filterField ? { ...filterField.filter } : {},
        },
      })
      .then((res) => {
        setOptions(res?.data.data);
        fieldProps['options'] = res?.data.data;
      })
      .catch(() => {
        return;
      });
    setCollectionName(others.collection);
  } else if (others?.collection === collectionName) {
    fieldProps['options'] = options.map((option) => {
      return { ...option };
    });
  } else {
    fieldProps['options'] = getFormulaValue(props.fieldNames['formula'], props?.options || [], fieldSchema);
  }
  const modifiedProps = useLabelOptions(fieldProps);

  return (
    <ObjectSelect
      rawOptions={rawOptions}
      {...modifiedProps}
      defaultValue={defaultValue}
      value={value}
      mode={mode}
      loading={loading}
    />
  );
};

export default FormulaSelect;

const getFormulaValue = (template, options, fieldSchema) => {
  return options.map((item) => {
    const label = item.label;
    const customLabel = template.replace(new RegExp(`{{${fieldSchema['name']}}}`, 'g'), label);
    return { ...item, label: customLabel };
  });
};
