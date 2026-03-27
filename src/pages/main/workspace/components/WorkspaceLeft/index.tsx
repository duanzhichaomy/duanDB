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

const DB_FILTER_STORAGE_KEY = 'workspace-db-filter';

function loadDbFilter(connectionId: number | undefined): string[] | null {
  if (!connectionId) return null;
  try {
    const stored = localStorage.getItem(DB_FILTER_STORAGE_KEY);
    if (stored) {
      const map = JSON.parse(stored);
      return map[connectionId] ?? null;
    }
  } catch {}
  return null;
}

function saveDbFilter(connectionId: number | undefined, selected: string[] | null) {
  if (!connectionId) return;
  try {
    const stored = localStorage.getItem(DB_FILTER_STORAGE_KEY);
    const map = stored ? JSON.parse(stored) : {};
    if (selected === null) {
      delete map[connectionId];
    } else {
      map[connectionId] = selected;
    }
    localStorage.setItem(DB_FILTER_STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

const WorkspaceLeft = memo(() => {
  const showLeftSaveList = useWorkspaceStore((state) => state.showLeftSaveList);
  const currentConnectionDetails = useWorkspaceStore((state) => state.currentConnectionDetails);
  const [isConnectionExpanded, setIsConnectionExpanded] = useState(true);
  const [allDbNames, setAllDbNames] = useState<string[]>([]);
  const [selectedDbNames, setSelectedDbNames] = useState<string[] | null>(
    () => loadDbFilter(currentConnectionDetails?.id),
  );
  const [searchValue, setSearchValue] = useState('');
  const refreshTreeRef = useRef<(refresh?: boolean) => void>(() => {});

  const { connectionList } = useConnectionStore((state) => {
    return { connectionList: state.connectionList };
  });

  const handleSelectionChange = useCallback((selected: string[] | null) => {
    setSelectedDbNames(selected);
    saveDbFilter(currentConnectionDetails?.id, selected);
  }, [currentConnectionDetails?.id]);

  const handleDbNamesLoaded = useCallback((names: string[]) => {
    setAllDbNames(names);
    // 恢复持久化的筛选，过滤掉已不存在的数据库
    const saved = loadDbFilter(currentConnectionDetails?.id);
    if (saved) {
      const valid = saved.filter((n) => names.includes(n));
      setSelectedDbNames(valid.length > 0 ? valid : null);
    } else {
      setSelectedDbNames(null);
    }
  }, [currentConnectionDetails?.id]);

  const jumpPage = () => {
    setMainPageActiveTab('connections');
  };

  return (
    <>
      <div className={classnames(styles.workspaceLeft)}>
        {connectionList?.length ? (
          <>
            <div className={styles.saveListPanel} style={{ display: showLeftSaveList ? undefined : 'none' }}>
              <SaveList />
            </div>
            <div style={{ display: showLeftSaveList ? 'none' : 'contents' }}>
              <OperationLine
                getTreeData={(refresh) => refreshTreeRef.current(refresh)}
                searchValue={searchValue}
                setSearchValue={setSearchValue}
              />
              <WorkspaceLeftHeader
                allDbNames={allDbNames}
                selectedDbNames={selectedDbNames}
                onSelectionChange={handleSelectionChange}
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
