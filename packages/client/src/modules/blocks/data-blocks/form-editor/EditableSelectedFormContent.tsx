import React, { createContext, useContext, useState } from 'react';
import { Form, GeneralField, ISchemaFieldReactFactoryOptions, Schema, SchemaReactComponents } from '@tachybase/schema';

interface EditableFormInfo {
  field: GeneralField | null;
  fieldSchema: Schema | null;
  schemaMarkup: Schema | null;
  expressionScope: any;
  schemaComponents: SchemaReactComponents | null;
  schemaOptions: ISchemaFieldReactFactoryOptions | null;
  form: Form | null;
  formBlockValue: any;
  setEditableForm: (info: EditableFormInfoPartial) => void;
}

// 方便 setEditableForm 只传部分字段更新
type EditableFormInfoPartial = Partial<Omit<EditableFormInfo, 'setEditableForm'>>;

// 创建 Context，初始为 null，使用时需要判空
const EditableSelectedFormContext = createContext<EditableFormInfo | null>(null);

export const EditableSelectedFormProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 先初始化为空对象，字段都为 null
  const [fieldInfo, setFormInfo] = useState<Omit<EditableFormInfo, 'setEditableForm'>>({
    field: null,
    fieldSchema: null,
    schemaMarkup: null,
    expressionScope: null,
    schemaComponents: null,
    schemaOptions: null,
    form: null,
    formBlockValue: null,
  });

  // 包装 setFormInfo，支持部分更新
  const setEditableForm = (info: EditableFormInfoPartial) => {
    setFormInfo((prev) => ({
      ...prev,
      ...info,
    }));
  };

  return (
    <EditableSelectedFormContext.Provider
      value={{
        ...fieldInfo,
        setEditableForm,
      }}
    >
      {children}
    </EditableSelectedFormContext.Provider>
  );
};

// 自定义 Hook，方便调用
export const useEditableSelectedForm = () => {
  const ctx = useContext(EditableSelectedFormContext);
  if (!ctx) {
    throw new Error('useEditableSelectedForm must be used within EditableSelectedFormProvider');
  }
  return ctx;
};
