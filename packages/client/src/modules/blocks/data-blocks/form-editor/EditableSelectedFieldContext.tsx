import React, { createContext, useContext, useState } from 'react';
import { Form, GeneralField, ISchemaFieldReactFactoryOptions, Schema, SchemaReactComponents } from '@tachybase/schema';

interface EditableFieldInfo {
  field: GeneralField | null;
  fieldSchema: Schema | null;
  schemaMarkup: Schema | null;
  expressionScope: any;
  schemaComponents: SchemaReactComponents | null;
  schemaOptions: ISchemaFieldReactFactoryOptions | null;
  form: Form | null;
  formBlockValue: any;
  setEditableField: (info: EditableFieldInfoPartial) => void;
}

// 方便 setEditableField 只传部分字段更新
type EditableFieldInfoPartial = Partial<Omit<EditableFieldInfo, 'setEditableField'>>;

// 创建 Context，初始为 null，使用时需要判空
const EditableSelectedFieldContext = createContext<EditableFieldInfo | null>(null);

export const EditableSelectedFieldProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 先初始化为空对象，字段都为 null
  const [fieldInfo, setFieldInfo] = useState<Omit<EditableFieldInfo, 'setEditableField'>>({
    field: null,
    fieldSchema: null,
    schemaMarkup: null,
    expressionScope: null,
    schemaComponents: null,
    schemaOptions: null,
    form: null,
    formBlockValue: null,
  });

  // 包装 setFieldInfo，支持部分更新
  const setEditableField = (info: EditableFieldInfoPartial) => {
    setFieldInfo((prev) => ({
      ...prev,
      ...info,
    }));
  };

  return (
    <EditableSelectedFieldContext.Provider
      value={{
        ...fieldInfo,
        setEditableField,
      }}
    >
      {children}
    </EditableSelectedFieldContext.Provider>
  );
};

// 自定义 Hook，方便调用
export const useEditableSelectedField = () => {
  const ctx = useContext(EditableSelectedFieldContext);
  if (!ctx) {
    throw new Error('useEditableSelectedField must be used within EditableSelectedFieldProvider');
  }
  return ctx;
};
