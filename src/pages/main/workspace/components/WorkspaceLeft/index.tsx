import React, { memo, useState } from 'react';
import i18n from '@/i18n';
import classnames from 'classnames';
import styles from './index.less';
import TableList from '../TableList';
import WorkspaceLeftHeader from '../WorkspaceLeftHeader';
import SaveList from '../SaveList';
import CreateDatabase from '@/components/CreateDatabase';
import Iconfont from '@/components/Iconfont';
import { useConnectionStore } from '@/pages/main/store/connection';
import { setMainPageActiveTab } from '@/pages/main/store/main';

const WorkspaceLeft = memo(() => {
  const [saveListOpen, setSaveListOpen] = useState(false);

  const { connectionList } = useConnectionStore((state) => {
    return {
      connectionList: state.connectionList,
    };
  });

  const jumpPage = () => {
    setMainPageActiveTab('connections');
  };

  return (
    <>
      <div className={classnames(styles.workspaceLeft)}>
        {connectionList?.length ? (
          <>
            <WorkspaceLeftHeader />
            <div className={styles.tableListWrapper}>
              <TableList />
            </div>
            <div className={styles.saveListSection}>
              <div
                className={styles.saveListHeader}
                onClick={() => setSaveListOpen((v) => !v)}
              >
                <Iconfont code="&#xe619;" className={styles.saveListHeaderIcon} />
                <span className={styles.saveListHeaderText}>{i18n('workspace.title.savedConsole')}</span>
                <Iconfont
                  code="&#xe88e;"
                  className={classnames(styles.saveListArrow, { [styles.saveListArrowOpen]: saveListOpen })}
                />
              </div>
              {saveListOpen && (
                <div className={styles.saveListBody}>
                  <SaveList />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className={styles.noConnectionList}>
            <Iconfont className={styles.noConnectionListIcon} code="&#xe638;" />
            <div className={styles.noConnectionListTips}>{i18n('workspace.tips.noConnection')}</div>
            <div>
              <span className={styles.create} onClick={jumpPage}>
                {i18n('common.title.create')}
              </span>
              {i18n('connection.title.connections')}
            </div>
          </div>
        )}
      </div>
      <CreateDatabase />
    </>
  );
});

export default WorkspaceLeft;
