import React, { memo, useMemo, useState } from 'react';
import classnames from 'classnames';
import styles from './index.less';
import { Checkbox, Dropdown, Input } from 'antd';
import Iconfont from '@/components/Iconfont';
import { useConnectionStore } from '@/pages/main/store/connection';
import { useWorkspaceStore } from '@/pages/main/workspace/store';
import { setCurrentConnectionDetails } from '@/pages/main/workspace/store/common';
import { databaseMap } from '@/constants';
import { IConnectionListItem } from '@/typings/connection';

interface IProps {
  allDbNames: string[];
  selectedDbNames: string[] | null;
  onSelectionChange: (selected: string[] | null) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export default memo<IProps>(({ allDbNames, selectedDbNames, onSelectionChange, isExpanded, onToggleExpand }) => {
  const [filterSearch, setFilterSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  const { connectionList } = useConnectionStore((state) => ({ connectionList: state.connectionList }));
  const { currentConnectionDetails } = useWorkspaceStore((state) => ({ currentConnectionDetails: state.currentConnectionDetails }));

  const effectiveSelected: string[] = selectedDbNames ?? allDbNames;
  const selectedCount = effectiveSelected.length;
  const totalCount = allDbNames.length;

  const filteredDbNames = useMemo(() => {
    if (!filterSearch.trim()) return allDbNames;
    return allDbNames.filter((n) => n.toLowerCase().includes(filterSearch.toLowerCase()));
  }, [allDbNames, filterSearch]);

  const isAllSelected = selectedCount === totalCount && totalCount > 0;
  const isIndeterminate = !isAllSelected && selectedCount > 0;

  const handleToggleDb = (name: string, checked: boolean) => {
    const current = new Set(effectiveSelected);
    if (checked) current.add(name);
    else current.delete(name);
    const arr = allDbNames.filter((n) => current.has(n));
    onSelectionChange(arr.length === allDbNames.length ? null : arr);
  };

  const handleSelectAll = (checked: boolean) => {
    onSelectionChange(checked ? null : []);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectionChange([]);
    setFilterOpen(false);
  };

  const connectionMenuItems = useMemo(
    () =>
      (connectionList ?? []).map((item: IConnectionListItem) => ({
        key: item.id,
        label: (
          <div className={styles.connMenuItem}>
            <span className={styles.envDot} style={{ background: item.environment?.color }} />
            <Iconfont code={databaseMap[item.type]?.icon} className={styles.connMenuIcon} />
            <span className={styles.connMenuName}>{item.alias}</span>
          </div>
        ),
        onClick: () => setCurrentConnectionDetails(item),
      })),
    [connectionList],
  );

  const filterPanel = (
    <div className={styles.filterPanel} onClick={(e) => e.stopPropagation()}>
      <div className={styles.filterSearchBox}>
        <Input
          prefix={<Iconfont code="&#xe888;" />}
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          allowClear
          placeholder="搜索"
          size="small"
        />
      </div>
      <div className={styles.filterHeader}>
        <Checkbox
          checked={isAllSelected}
          indeterminate={isIndeterminate}
          onChange={(e) => handleSelectAll(e.target.checked)}
        >
          全选
        </Checkbox>
        <span className={styles.clearBtn} onClick={handleClear}>
          清除筛选
        </span>
      </div>
      <div className={styles.filterList}>
        {filteredDbNames.map((name) => (
          <div key={name} className={styles.filterItem}>
            <Checkbox
              checked={effectiveSelected.includes(name)}
              onChange={(e) => handleToggleDb(name, e.target.checked)}
            >
              {name}
            </Checkbox>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Dropdown menu={{ items: connectionMenuItems }} trigger={['contextMenu']} classNames={{ root: styles.connDropdown }}>
      <div className={styles.connectionRow}>
        <div
          className={classnames(styles.expandArrow, { [styles.expanded]: isExpanded })}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
        >
          <Iconfont code="&#xe641;" className={styles.arrowIcon} />
        </div>
        <div className={styles.connInfo}>
          {currentConnectionDetails && (
            <Iconfont
              code={databaseMap[currentConnectionDetails.type]?.icon}
              className={styles.dbTypeIcon}
            />
          )}
          <span className={styles.connName}>{currentConnectionDetails?.alias}</span>
          {totalCount > 0 && (
            <Dropdown
              open={filterOpen}
              onOpenChange={setFilterOpen}
              popupRender={() => filterPanel}
              trigger={['click']}
            >
              <span className={styles.dbCount} onClick={(e) => e.stopPropagation()}>
                {selectedCount} of {totalCount}
              </span>
            </Dropdown>
          )}
        </div>
      </div>
    </Dropdown>
  );
});
