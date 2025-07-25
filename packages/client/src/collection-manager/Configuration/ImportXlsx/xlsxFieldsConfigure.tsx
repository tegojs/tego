import { useCallback, useEffect, useState } from 'react';
import { observer, useForm } from '@tachybase/schema';

import { Input, message, Select, Space, Switch, Table, Tooltip } from 'antd';
import { cloneDeep } from 'lodash';
import { useTranslation } from 'react-i18next';

import { useDataSourceManager } from '../../../data-source';
import { useCompile } from '../../../schema-component';
import { useCollectionManager_deprecated } from '../../hooks';
import { useFieldInterfaceOptions } from '../interfaces';
import { xlsxFormValueContext } from './xlsxFormValueContextProvider';
import { XlsxEditFieldAction } from './xlsxImportAction';

export const xlsxFieldsConfigure = observer(
  (props: any) => {
    const { filedata } = props;
    const { fields, data } = filedata;
    const dm = useDataSourceManager();
    const { t } = useTranslation();
    const initOptions = useFieldInterfaceOptions();
    const compile = useCompile();
    const [selectedTitleField, setSelectedTitleField] = useState<string | null>();
    const form = useForm();
    const [formValue, setFormValue] = useState(fields);
    const { getInterface } = useCollectionManager_deprecated();

    const getDefaultUiSchema = (interfaceType, title) => {
      const interfaceConfig = getInterface(interfaceType) || {};
      const interfaceConfigValues = cloneDeep(interfaceConfig) as any;
      const defaultUiSchema = interfaceConfigValues?.default?.uiSchema || {};
      return {
        ...defaultUiSchema,
        title,
      };
    };

    const handleFieldChange = (updatedField: any, index: number) => {
      const updatedFieldData = [...formValue];
      updatedFieldData[index] = updatedField;
      setFormValue(updatedFieldData);
    };

    const handleFieldTypeChange = async (updatedField: any, index: number) => {
      const { type, name: dataIndex, uiSchema } = updatedField;
      const updatedData = [...data];
      let hasError = false;
      const typeToInterface = {
        json: 'json',
        boolean: 'checkbox',
        string: 'input',
        integer: 'integer',
        float: 'number',
        date: 'datetime',
      };
      updatedField.interface = (await typeToInterface[type]) || null;
      const currentUiSchema = await getDefaultUiSchema(updatedField.interface, uiSchema.title);
      updatedField.uiSchema = currentUiSchema;
      updatedData.forEach((row, rowIndex) => {
        try {
          if (row[dataIndex] !== undefined) {
            row[dataIndex] = parseValue(row[dataIndex], type);
          }
        } catch (error) {
          hasError = true;
          message.error(`Row ${rowIndex + 1}, Column ${uiSchema.title}: ${error.message}`);
        }
      });
      if (!hasError) {
        message.success(`${t('Fields')} "${uiSchema.title}"${t('Converted to')} ${type}`);
        const updatedFieldData = [...formValue];
        updatedFieldData[index] = updatedField;
        setFormValue(updatedFieldData);
      }
    };

    const handleFieldInterfaceChange = async (updatedField: any, index: number) => {
      const currentUiSchema = await getDefaultUiSchema(updatedField.interface, updatedField.uiSchema.title);
      updatedField.uiSchema = currentUiSchema;
      const updatedFieldData = [...formValue];
      updatedFieldData[index] = updatedField;
      setFormValue(updatedFieldData);
    };

    const parseValue = (value: string, type: string) => {
      try {
        switch (type) {
          case 'boolean':
            if (value.toLowerCase() === 'true') return true;
            if (value.toLowerCase() === 'false') return false;
            throw new Error('Invalid boolean');
          case 'integer':
            if (!/^-?\d+$/.test(value)) throw new Error('Invalid integer');
            return parseInt(value, 10);
          case 'float':
            if (!/^-?\d+(\.\d+)?$/.test(value)) throw new Error('Invalid number');
            return Number(value);
          case 'json':
            return JSON.parse(value);
          case 'date':
            if (isNaN(Date.parse(value))) throw new Error('Invalid date');
            return new Date(value);
          default:
            if (value === null || value === undefined || value === '') {
              return '';
            }
            return value.toString();
        }
      } catch (error) {
        throw new Error(`Type conversion error: ${error.message}`);
      }
    };

    const handleTitleChange = (checked: boolean, field: any) => {
      const newTitleField = checked ? field.name : null;
      setSelectedTitleField(newTitleField);
      form.setValuesIn('titleField', newTitleField);
    };

    const isTitleField = (field) => {
      return !field.isForeignKey && getInterface(field.interface)?.titleUsable;
    };

    const getOptions = (type) => {
      const InterfaceOptions = getInterfaceOptions(initOptions, type);
      const options = InterfaceOptions.map((group) => ({
        label: <span>{compile(group.label)}</span>,
        title: group.key,
        options: group.children.map((item) => ({
          label: <span>{compile(item.label)}</span>,
          value: item.name,
        })),
      }));
      return options;
    };

    const getInterfaceOptions = (data, type) => {
      const interfaceOptions = [];
      data.forEach((item) => {
        const options = item.children.filter((h) => h?.availableTypes?.includes(type));
        interfaceOptions.push({
          label: item.label,
          key: item.key,
          children: options,
        });
      });
      return interfaceOptions.filter((v) => {
        if (type === 'sort') {
          return v.key === 'advanced';
        }
        return v.children.length > 0;
      });
    };

    const columns = [
      {
        title: t('Field display name'),
        dataIndex: 'title',
        key: 'title',
        render: (text: string, record: any, index: number) => {
          const field = formValue[index];
          return (
            <Input
              value={field.uiSchema.title || text}
              onChange={(e) => handleFieldChange({ ...field, uiSchema: { title: e.target.value } }, index)}
            />
          );
        },
      },
      {
        title: t('Field name'),
        dataIndex: 'name',
        key: 'name',
        render: (text: string, record: any, index: number) => {
          const field = formValue[index];
          return <Input value={field.name || text} variant="borderless" disabled={true} />;
        },
      },
      {
        title: t('Field type'),
        dataIndex: 'type',
        key: 'type',
        render: (text: string, record: any, index: number) => {
          const field = formValue[index];
          return (
            <Select
              value={field.type || text}
              onChange={(e) => handleFieldTypeChange({ ...field, type: e }, index)}
              options={[
                { value: 'string', label: <span>string</span> },
                { value: 'boolean', label: <span>boolean</span> },
                { value: 'integer', label: <span>integer</span> },
                { value: 'float', label: <span>float</span> },
                { value: 'json', label: <span>json</span> },
                { value: 'date', label: <span>date</span> },
              ]}
            />
          );
        },
      },
      {
        title: t('Field interface'),
        dataIndex: 'interface',
        key: 'interface',
        render: (text: string, record: any, index: number) => {
          const field = formValue[index];

          const options = getOptions(field.type);
          return (
            <Select
              aria-label={`field-interface-${field?.type}`}
              //@ts-ignore
              role="button"
              value={field.interface}
              popupMatchSelectWidth={false}
              onChange={(e) => handleFieldInterfaceChange({ ...field, interface: e }, index)}
              options={options}
            />
          );
        },
      },
      {
        dataIndex: 'titleField',
        title: t('Title field'),
        render: function Render(_, record: any, index: any) {
          const field = formValue[index];
          return isTitleField(field) ? (
            <Tooltip
              title={t('Default title for each record')}
              placement="right"
              overlayInnerStyle={{ textAlign: 'center' }}
            >
              <Switch
                aria-label={`switch-title-field-${field.name}`}
                size="small"
                checked={field.name === selectedTitleField}
                onChange={(checked) => handleTitleChange(checked, field)}
              />
            </Tooltip>
          ) : null;
        },
      },
      {
        title: t('Description'),
        dataIndex: 'description',
        key: 'description',
        render: (text: string, record: any, index: number) => {
          const field = formValue[index];
          return <Input.TextArea value={field.description} variant="borderless" disabled={true} />;
        },
      },
      {
        title: t('Actions'),
        dataIndex: 'actions',
        key: 'actions',
        render: (text: string, record: any, index: number) => {
          const field = formValue[index];
          return (
            <Space size="middle">
              <XlsxEditFieldAction record={{ index, ...field }} {...props} />
            </Space>
          );
        },
      },
    ];

    const previewTablecolumns = formValue.map((field) => ({
      title: field.uiSchema.title,
      dataIndex: field.name,
      key: field.name,
      render: (text) => {
        if (typeof text === 'boolean') {
          return text ? 'True' : 'False';
        }
        if (field.type === 'date' && text) {
          return new Date(text).toLocaleString();
        }
        if (field.type === 'json' && text) {
          try {
            return typeof text === 'string' ? text : JSON.stringify(text, null, 2);
          } catch (error) {
            return 'Invalid JSON';
          }
        }
        return text;
      },
      width: 200,
    }));

    useEffect(() => {
      form.setValuesIn('fields', formValue);

      form.setValuesIn('collectionData', filedata.data);
    }, [formValue]);

    return (
      <xlsxFormValueContext.Provider
        value={{
          value: formValue,
          setFormValue,
        }}
      >
        <Table
          bordered
          size="small"
          columns={columns}
          dataSource={formValue}
          scroll={{ y: 300 }}
          pagination={false}
          rowClassName="row"
          rowKey="uid"
          style={{ marginBottom: '16px' }}
          {...props}
        />
        <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>{t('Preview')}:</div>
        <Table
          bordered
          size="small"
          columns={previewTablecolumns}
          dataSource={filedata.data}
          scroll={{ y: 300, x: 'max-content' }}
          // pagination={{ pageSize: 10 }}
          rowKey="name"
        />
      </xlsxFormValueContext.Provider>
    );
  },
  { displayName: 'FieldsConfigure' },
);
