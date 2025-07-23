import { PlusOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { cx } from 'antd-style';
import { useTranslation } from 'react-i18next';

import { FormDialog, ScrollArea } from '../..';
import { useGetAriaLabelOfSchemaInitializer } from '../../../../schema-initializer/hooks/useGetAriaLabelOfSchemaInitializer';
import { useDesignable } from '../../../hooks';
import { useStyles } from '../Page.style';
import { AddTabForm } from './AddTabForm';

export const TabBarExtraContent = (props) => {
  const { showScrollArea, options, theme } = props;
  const dn = useDesignable();
  const { t } = useTranslation();
  const { getAriaLabel } = useGetAriaLabelOfSchemaInitializer();
  const { styles } = useStyles();
  const handleAddTab = async () => {
    const values = await FormDialog(t('Add tab'), () => <AddTabForm options={options} />, theme).open({
      initialValues: {},
    });
    const { title, icon } = values;
    dn.insertBeforeEnd({
      type: 'void',
      title,
      'x-icon': icon,
      'x-component': 'Grid',
      'x-initializer': 'page:addBlock',
      properties: {},
    });
  };

  return (
    <div
      className={cx(styles.tabWrapper, {
        designable: dn.designable,
      })}
    >
      {dn.designable && (
        <Button
          className="add-tab-btn"
          type="text"
          aria-label={getAriaLabel('tabs')}
          icon={<PlusOutlined />}
          onClick={handleAddTab}
        />
      )}
      {showScrollArea && <ScrollArea className="scroll-area-extra-content" />}
    </div>
  );
};
