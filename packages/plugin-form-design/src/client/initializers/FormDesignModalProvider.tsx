import { useState } from 'react';

import { createPortal } from 'react-dom';

import { EditableSelectedFieldProvider, FormSchemaEditor } from './components/form-editor';
import { EditableSelectedFormProvider } from './components/form-editor/EditableSelectedFormContent';
import { ProviderContextFormDesign } from './contexts/FormDesign';

export const FormDesignModalProvider = (props: { children: React.ReactNode }) => {
  const [isVisible, setIsVisible] = useState(false);
  const { children } = props;
  const [pendingOptions, setPendingOptions] = useState<any>(null);
  const schemaUID = pendingOptions?.schema['x-uid'] || null;
  const handleClose = () => {
    setIsVisible(false);
    setPendingOptions(null);
  };

  return (
    <>
      <ProviderContextFormDesign value={{ visible: isVisible, setVisible: setIsVisible }}>
        {children}
      </ProviderContextFormDesign>
      {createPortal(
        <EditableSelectedFormProvider>
          <EditableSelectedFieldProvider>
            <FormSchemaEditor key={schemaUID} open={isVisible} onCancel={handleClose} options={pendingOptions} />
          </EditableSelectedFieldProvider>
        </EditableSelectedFormProvider>,
        document.body,
      )}
    </>
  );
};
