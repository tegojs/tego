import {
  TableFieldResource,
  useActionContext,
  useAPIClient,
  useBlockRequestContext,
  useCollection_deprecated,
  useCompile,
  useParsedFilter,
  useRecord,
} from '@tachybase/client';
import { useField, useFieldSchema, useForm } from '@tachybase/schema';
import { isURL, parse } from '@tachybase/utils/client';

import { App } from 'antd';
import { saveAs } from 'file-saver';
import { useNavigate } from 'react-router-dom';

import { useTranslation } from '../locale';

// 从header提取下载文件名
function getFilenameFromHeader(header) {
  if (!header) return null;

  // 匹配 filename="example.txt"
  let match = header.match(/filename="([^"]+)"/i);
  if (match) {
    return match[1];
  }

  // 匹配 filename*=UTF-8''example%20file.txt
  match = header.match(/filename\*=UTF-8''(.+)/i);
  if (match) {
    return decodeURIComponent(match[1]); // 解码 URL 编码的文件名
  }

  return null;
}

const matchReturnValue = (inputArray, context) => {
  const getValueByPath = (obj, pathArray) => {
    return pathArray.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
  };

  const resolveExpression = (expr, context) => {
    if (typeof expr === 'string') {
      // 同时匹配 ${...} 和 {{...}}
      return expr
        .replace(/\$\{([^}]+)\}/g, (_, path) => {
          const value = getValueByPath(context, path.trim().split('.'));
          return value !== undefined ? value : '';
        })
        .replace(/\{\{([^}]+)\}\}/g, (_, path) => {
          const value = getValueByPath(context, path.trim().split('.'));
          return value !== undefined ? value : '';
        });
    }
    return expr;
  };

  const resolveInputArray = (inputArray, context) => {
    return inputArray.map((item) => ({
      name: item.name,
      value: resolveExpression(item.value, context),
    }));
  };
  return resolveInputArray(inputArray, context);
};

export const useCustomizeRequestActionProps = () => {
  const apiClient = useAPIClient();
  const navigate = useNavigate();
  const actionSchema = useFieldSchema();
  const compile = useCompile();
  const form = useForm();
  const { getPrimaryKey } = useCollection_deprecated();
  const { resource, __parent, service } = useBlockRequestContext();
  const record = useRecord();
  const fieldSchema = useFieldSchema();
  const actionField = useField();
  const { setVisible } = useActionContext();
  const { modal, message } = App.useApp();
  const { t } = useTranslation();
  return {
    async onClick() {
      const { skipValidator, onSuccess } = actionSchema?.['x-action-settings'] ?? {};
      const { resultValues } = actionSchema?.['x-request-setting'] ?? {};
      const xAction = actionSchema?.['x-action'];
      if (skipValidator !== true && xAction === 'customize:form:request') {
        await form.submit();
      }

      let formValues = {};
      if (xAction === 'customize:form:request') {
        formValues = form.values;
      }

      actionField.data ??= {};
      actionField.data.loading = true;
      try {
        const res = (await apiClient.request({
          url: `/customRequests:send/${fieldSchema['x-uid']}`,
          method: 'POST',
          responseType: onSuccess?.down ? 'blob' : 'json',
          data: {
            currentRecord: {
              id: record[getPrimaryKey()],
              appends: service.params[0]?.appends,
              data: formValues,
            },
            successMessage: onSuccess.successMessage,
          },
          headers: {
            'X-Response-Type': onSuccess?.down ? 'blob' : 'json',
          },
        })) as any;

        const headerContentType = res.headers.getContentType();
        let filename = getFilenameFromHeader(res.headers['content-disposition']);

        if (resultValues?.length) {
          const requestData = { ...JSON.parse(res?.data?.data || {}), ...form.values };
          const reqFormValues = {};
          const matchValues = matchReturnValue(resultValues, requestData);
          matchValues.forEach((valueItem) => {
            reqFormValues[valueItem.name] = valueItem.value;
          });
          form.setValues(reqFormValues);
        }
        if (onSuccess?.down) {
          if (headerContentType === 'application/octet-stream') {
            const downTitle = onSuccess.downTitle;
            saveAs(res.data, parse(downTitle)({ filename: filename || '' }));
          } else {
            message.error(t('The current return type is not a document type'));
          }
        }
        actionField.data.loading = false;
        if (!(resource instanceof TableFieldResource)) {
          __parent?.service?.refresh?.();
        }
        service?.refresh?.();
        if (xAction === 'customize:form:request') {
          setVisible?.(false);
        }
        if (onSuccess?.successMessage) {
          let messageStr = parse(onSuccess?.successMessage)({ res, filename });
          if (typeof messageStr !== 'string') {
            messageStr = JSON.stringify(messageStr);
          }
          if (onSuccess?.manualClose) {
            modal.success({
              title: compile(messageStr),
              onOk: async () => {
                if (onSuccess?.redirecting && onSuccess?.redirectTo) {
                  if (isURL(onSuccess.redirectTo)) {
                    window.location.href = onSuccess.redirectTo;
                  } else {
                    navigate(onSuccess.redirectTo);
                  }
                }
              },
            });
          } else {
            message.success(compile(messageStr));
            if (onSuccess?.redirecting && onSuccess?.redirectTo) {
              if (isURL(onSuccess.redirectTo)) {
                window.location.href = onSuccess.redirectTo;
              } else {
                navigate(onSuccess.redirectTo);
              }
            }
          }
        } else {
          message.success(t('Request success'));
        }
      } finally {
        actionField.data.loading = false;
      }
    },
  };
};
