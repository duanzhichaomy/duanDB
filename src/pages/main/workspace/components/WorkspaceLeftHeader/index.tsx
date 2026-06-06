import React, { memo, useMemo, useState } from 'react';
import classnames from 'classnames';
import styles from './index.less';
import { Checkbox, Dropdown, Input, Modal } from 'antd';
import Iconfont from '@/components/Iconfont';
import { useWorkspaceStore } from '@/pages/main/workspace/store';
import { databaseMap } from '@/constants';
import i18n from '@/i18n';
import connectionService from '@/service/connection';
import ConnectionEdit from '@/components/ConnectionEdit';
import LoadingContent from '@/components/Loading/LoadingContent';
import MenuLabel from '@/components/MenuLabel';
import { getConnectionList } from '@/pages/main/store/connection';
import { getOpenConsoleList } from '@/pages/main/workspace/store/console';
import { IConnectionDetails } from '@/typings/connection';
import { message } from '@/utils/globalMessage';

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
  const [manageOpen, setManageOpen] = useState(false);
  const [connectionDetail, setConnectionDetail] = useState<IConnectionDetails | null | undefined>(null);

  const { currentConnectionDetails } = useWorkspaceStore((state) => ({
    currentConnectionDetails: state.currentConnectionDetails,
  }));

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

  const handleManageConnection = () => {
    if (!currentConnectionDetails?.id) return;

    setManageOpen(true);
    setConnectionDetail(undefined);
    connectionService
      .getDetails({ id: currentConnectionDetails.id })
      .then((res) => {
        setConnectionDetail(res);
      })
      .catch(() => {
        setManageOpen(false);
        setConnectionDetail(null);
      });
  };

  const deleteConnection = () => {
    if (!currentConnectionDetails?.id) return;

    Modal.confirm({
      title: i18n('connection.tips.deleteConnection', `"${currentConnectionDetails.alias}"`),
      okText: i18n('common.button.delete'),
      okButtonProps: { danger: true },
      cancelText: i18n('common.button.cancel'),
      onOk: () =>
        connectionService.remove({ id: currentConnectionDetails.id }).then(() => {
          message.success(i18n('common.text.successfullyDelete'));
          setManageOpen(false);
          setConnectionDetail(null);
          getConnectionList().then(() => {
            getOpenConsoleList();
          });
        }),
    });
  };

  const connectionMenuItems = useMemo(
    () => [
      {
        key: 'manage',
        label: <MenuLabel icon="&#xe602;" label={i18n('connection.button.manage')} />,
        onClick: handleManageConnection,
      },
      {
        key: 'delete',
        label: <MenuLabel icon="&#xe6a7;" label={i18n('connection.button.remove')} />,
        onClick: deleteConnection,
      },
    ],
    [currentConnectionDetails?.id, currentConnectionDetails?.alias],
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
    <>
      <Dropdown menu={{ items: connectionMenuItems }} trigger={['contextMenu']} classNames={{ root: styles.connDropdown }}>
        <div className={styles.connectionRow} onClick={handleManageConnection}>
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
      <Modal
        open={manageOpen}
        footer={null}
        onCancel={() => setManageOpen(false)}
        width={720}
        centered
        destroyOnHidden
      >
        <LoadingContent isLoading={connectionDetail === undefined}>
          {connectionDetail && (
            <ConnectionEdit
              connectionData={connectionDetail}
              closeCreateConnection={() => setManageOpen(false)}
              onDelete={deleteConnection}
            />
          )}
        </LoadingContent>
      </Modal>
    </>
  );
});
