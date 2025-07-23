import classNames from 'classnames';
import { useTranslation } from 'react-i18next';

import { Icon } from '../../../../icon';
import { SortableItem } from '../../../common/sortable-item';
import { DragHandlePageTab } from '../../../common/sortable-item/DragHandlePageTab';
import { useStyles } from '../Page.style';
import { PageTabDesigner } from '../PageTabDesigner';

export const TabItem = (props) => {
  const { schema } = props;
  const { t } = useTranslation();
  const { styles } = useStyles();

  return (
    <SortableItem
      id={schema.name as string}
      schema={schema}
      className={classNames('tb-action-link', 'designerCss', props.className, styles.tabItemClass)}
    >
      <DragHandlePageTab>
        {schema['x-icon'] && <Icon style={{ marginRight: 8 }} type={schema['x-icon']} />}
        <span>{schema.title || t('Unnamed')}</span>
        <div className="tab-designer-wrapper">
          <PageTabDesigner schema={schema} />
        </div>
      </DragHandlePageTab>
    </SortableItem>
  );
};
