import React, { memo, useState, useCallback, useRef } from 'react';
import i18n from '@/i18n';
import classnames from 'classnames';
import styles from './index.less';
import TableList from '../TableList';
import WorkspaceLeftHeader from '../WorkspaceLeftHeader';
import SaveList from '../SaveList';
import OperationLine from '../OperationLine';
import CreateDatabase from '@/components/CreateDatabase';
import Iconfont from '@/components/Iconfont';
import { useConnectionStore } from '@/pages/main/store/connection';
import { setMainPageActiveTab } from '@/pages/main/store/main';
import { useWorkspaceStore } from '@/pages/main/workspace/store';

const WorkspaceLeft = memo(() => {
  const showLeftSaveList = useWorkspaceStore((state) => state.showLeftSaveList);
  const [isConnectionExpanded, setIsConnectionExpanded] = useState(true);
  const [allDbNames, setAllDbNames] = useState<string[]>([]);
  const [selectedDbNames, setSelectedDbNames] = useState<string[] | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const refreshTreeRef = useRef<(refresh?: boolean) => void>(() => {});

  const { connectionList } = useConnectionStore((state) => {
    return { connectionList: state.connectionList };
  });

  const handleDbNamesLoaded = useCallback((names: string[]) => {
    setAllDbNames(names);
    setSelectedDbNames(null);
  }, []);

  const jumpPage = () => {
    setMainPageActiveTab('connections');
  };

  return (
    <>
      <div className={classnames(styles.workspaceLeft)}>
        {connectionList?.length ? (
          showLeftSaveList ? (
            <div className={styles.saveListPanel}>
              <SaveList />
            </div>
          ) : (
            <>
              <OperationLine
                getTreeData={(refresh) => refreshTreeRef.current(refresh)}
                searchValue={searchValue}
                setSearchValue={setSearchValue}
              />
              <WorkspaceLeftHeader
                allDbNames={allDbNames}
                selectedDbNames={selectedDbNames}
                onSelectionChange={setSelectedDbNames}
                isExpanded={isConnectionExpanded}
                onToggleExpand={() => setIsConnectionExpanded((v) => !v)}
              />
              {isConnectionExpanded && (
                <TableList
                  selectedDbNames={selectedDbNames}
                  onDbNamesLoaded={handleDbNamesLoaded}
                  searchValue={searchValue}
                  onRegisterRefresh={(fn) => { refreshTreeRef.current = fn; }}
                />
              )}
            </>
          )
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
