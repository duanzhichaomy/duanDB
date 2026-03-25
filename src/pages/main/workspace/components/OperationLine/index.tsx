import React, { memo, useState } from 'react';
import i18n from '@/i18n';
import styles from './index.less';
import { Dropdown, Input, Modal, message } from 'antd';

// ----- constants -----
import { databaseTypeList } from '@/constants';

// ----- components -----
import Iconfont from '@/components/Iconfont';
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
        <div className={styles.operationLineLeft}>
          <Dropdown menu={{ items: addMenuItems }} trigger={['click']}>
            <div>
              <Iconfont code="&#xeb78;" box boxSize={20} size={15} />
            </div>
          </Dropdown>
          <Iconfont
            onClick={() => getTreeData(true)}
            code="&#xe668;"
            box
            boxSize={20}
            size={14}
          />
        </div>
      </div>
      <div className={styles.searchBox}>
        <Input
          size="small"
          prefix={<Iconfont code="&#xe888;" />}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          allowClear
          placeholder={i18n('workspace.tree.search.placeholder')}
        />
      </div>
      <Modal
        open={!!newConnType}
        footer={null}
        onCancel={() => setNewConnType(null)}
        width={560}
        centered
        destroyOnClose
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
