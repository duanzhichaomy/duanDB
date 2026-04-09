import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import i18n from '@/i18n';
import styles from './index.less';
import { Dropdown, Modal } from 'antd';
import { message } from '@/utils/globalMessage';

// ----- constants -----
import { databaseTypeList } from '@/constants';

// ----- components -----
import Iconfont from '@/components/Iconfont';
import classnames from 'classnames';
import ConnectionEdit from '@/components/ConnectionEdit';

// ----- services -----
import connectionService from '@/service/connection';

// ----- store -----
import { getConnectionList } from '@/pages/main/store/connection';

interface IProps {
  searchValue: string;
  setSearchValue: (value: string) => void;
  getTreeData: (refresh?: boolean) => void;
}

const OperationLine = (props: IProps) => {
  const { searchValue, setSearchValue, getTreeData } = props;
  const [newConnType, setNewConnType] = useState<string | null>(null);
  const [searchActive, setSearchActive] = useState(false);
  const [refreshSpinning, setRefreshSpinning] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleRefresh = useCallback(() => {
    setRefreshSpinning(true);
    getTreeData(true);
    setTimeout(() => setRefreshSpinning(false), 600);
  }, [getTreeData]);

  const activateSearch = () => {
    setSearchActive(true);
    setTimeout(() => searchInputRef.current?.focus(), 0);
  };

  const handleSearchBlur = () => {
    if (!searchValue) {
      setSearchActive(false);
    }
  };

  const handleSearchClear = () => {
    setSearchValue('');
    setSearchActive(false);
  };

  // ⌘F shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        activateSearch();
      }
      if (e.key === 'Escape' && searchActive) {
        handleSearchClear();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [searchActive, searchValue]);

  const addMenuItems = [
    {
      key: 'newGroup',
      label: (
        <span className={styles.dropdownItem}>
          <Iconfont code="&#xe637;" className={styles.dropdownItemIcon} />
          <span>{i18n('connection.menu.newGroup')}</span>
        </span>
      ),
      onClick: () => message.info('功能开发中'),
    },
    {
      key: 'newConnection',
      label: (
        <span className={styles.dropdownItem}>
          <Iconfont code="&#xe622;" className={styles.dropdownItemIcon} />
          <span>{i18n('connection.menu.newConnection')}</span>
        </span>
      ),
      children: databaseTypeList.map((db) => ({
        key: db.code,
        label: (
          <span className={styles.dropdownItem}>
            <Iconfont code={db.icon} className={styles.dropdownItemIcon} />
            <span>{db.name}</span>
          </span>
        ),
        onClick: () => setNewConnType(db.code),
      })),
    },
  ];

  const handleSaveConnection = async (data: any) => {
    await connectionService.save(data);
    await getConnectionList();
    setNewConnType(null);
    message.success(i18n('common.message.addedSuccessfully'));
  };

  return (
    <>
      <div className={styles.operationLine}>
        <div className={styles.leftActions}>
          <Dropdown menu={{ items: addMenuItems }} trigger={['click']}>
            <div className={styles.actionBtn}>
              <Iconfont code="&#xeb78;" size={15} />
            </div>
          </Dropdown>
          <div className={styles.actionBtn} onClick={handleRefresh}>
            <Iconfont code="&#xe668;" size={14} className={classnames({ [styles.spinning]: refreshSpinning })} />
          </div>
        </div>

        <div className={styles.searchArea}>
          {searchActive ? (
            <div className={styles.searchInput}>
              <Iconfont code="&#xe600;" size={13} className={styles.searchIcon} />
              <input
                ref={searchInputRef}
                className={styles.searchNativeInput}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onBlur={handleSearchBlur}
                placeholder="搜索"
                autoComplete="new-password"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-form-type="other"
                name="duandb-tree-search-nofill"
              />
              {searchValue && (
                <span className={styles.searchClear} onMouseDown={handleSearchClear}>
                  ✕
                </span>
              )}
            </div>
          ) : (
            <div className={styles.searchTrigger} onClick={activateSearch}>
              <Iconfont code="&#xe600;" size={13} className={styles.searchTriggerIcon} />
              <span className={styles.searchTriggerText}>搜索</span>
              <span className={styles.searchShortcut}>⌘F</span>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={!!newConnType}
        footer={null}
        onCancel={() => setNewConnType(null)}
        width={560}
        centered
        destroyOnHidden
      >
        {newConnType && (
          <ConnectionEdit
            connectionData={{ type: newConnType } as any}
            closeCreateConnection={() => setNewConnType(null)}
            submit={handleSaveConnection}
          />
        )}
      </Modal>
    </>
  );
};

export default memo(OperationLine);
