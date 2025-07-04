import { ActionBarProvider as ClientActionBarProvider, useCompile, useCurrentUserContext } from '@tachybase/client';
import { useFlowContext } from '@tachybase/module-workflow/client';
import { useFieldSchema } from '@tachybase/schema';
import { str2moment } from '@tachybase/utils/client';

import { Space, Tag } from 'antd';

import { approvalTodoStatusOptions } from '../../../../common/constants/approval-todo-status-options';
import { useTranslation } from '../../../../locale';
import { useContextApprovalExecution } from '../../context/ApprovalExecution';

export function ActionBarProvider(props) {
  const { status } = useContextApprovalExecution();

  if (status) {
    return <ComponentUserInfo />;
  } else {
    return <ClientActionBarProvider {...props} />;
  }
}

const ComponentUserInfo = () => {
  const { t } = useTranslation();
  const { status, updatedAt, user } = useContextApprovalExecution();
  const configObj = approvalTodoStatusOptions.find((value) => value.value === status);
  return (
    <Space>
      <Tag color={configObj.color}>{t(configObj.label)}</Tag>
      <time>{str2moment(updatedAt).format('YYYY-MM-DD HH:mm:ss')}</time>
      <Tag>{user.nickname}</Tag>
    </Space>
  );
};

export function ActionBarUserJobsProvider(props) {
  const { data: user } = useCurrentUserContext();
  const { userJob } = useFlowContext();
  const { status, result, userId } = userJob;
  const buttonSchema = useFieldSchema();
  const { name } = buttonSchema.parent.toJSON();

  let { children: content } = props;
  if (status) {
    if (!result[name]) {
      content = null;
    }
  } else {
    if (user?.data?.id !== userId) {
      content = null;
    }
  }

  return content;
}
