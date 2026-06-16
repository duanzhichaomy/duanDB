import React, { useMemo, useState } from 'react';
import { Button, Input } from 'antd';
import i18n from '@/i18n';
import mysqlService from '@/service/sql';
import { ITreeNode } from '@/typings';
import { openModal } from '@/store/common/components';
import styles from './renameTable.less';

const escapeIdentifier = (name: string) => {
  return `\`${name.replace(/`/g, '``')}\``;
};

const buildTableRef = (databaseName: string | undefined, tableName: string) => {
  if (databaseName) {
    return `${escapeIdentifier(databaseName)}.${escapeIdentifier(tableName)}`;
  }
  return escapeIdentifier(tableName);
};

const buildRenameTableSql = (treeNodeData: ITreeNode, newTableName: string) => {
  const databaseName = treeNodeData.extraParams?.databaseName;
  const oldTableName = treeNodeData.extraParams?.tableName || treeNodeData.name;

  return [
    'RENAME TABLE',
    buildTableRef(databaseName, oldTableName),
    'TO',
    buildTableRef(databaseName, newTableName),
  ].join(' ');
};

export const renameTable = (treeNodeData: ITreeNode, loadData?: any) => {
  openModal({
    title: i18n('workspace.menu.renameTable'),
    width: '450px',
    content: <RenameTableModalContent treeNodeData={treeNodeData} loadData={loadData} />,
  });
};

const RenameTableModalContent = (props: { treeNodeData: ITreeNode; loadData?: any }) => {
  const { treeNodeData, loadData } = props;
  const [newTableName, setNewTableName] = useState(treeNodeData.name);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const normalizedTableName = newTableName.trim();
  const oldTableName = treeNodeData.extraParams?.tableName || treeNodeData.name;

  const inputError = useMemo(() => {
    if (!normalizedTableName) {
      return i18n('workspace.renameTable.nameRequired');
    }
    if (normalizedTableName === oldTableName) {
      return i18n('workspace.renameTable.nameSame');
    }
    return '';
  }, [normalizedTableName, oldTableName]);

  const refreshParentNode = () => {
    const params = {
      refresh: true,
      treeNodeData: treeNodeData.parentNode,
    };
    if (loadData) {
      loadData(params);
    } else {
      treeNodeData.parentNode?.loadData?.({ refresh: true });
    }
  };

  const onOk = () => {
    if (inputError) {
      setErrorMessage(inputError);
      return;
    }

    setLoading(true);
    setErrorMessage('');
    mysqlService
      .executeDDL({
        dataSourceId: treeNodeData.extraParams!.dataSourceId,
        databaseName: treeNodeData.extraParams?.databaseName,
        schemaName: treeNodeData.extraParams?.schemaName,
        sql: buildRenameTableSql(treeNodeData, normalizedTableName),
      })
      .then((res) => {
        if (res.success) {
          refreshParentNode();
          openModal(false);
        } else {
          setErrorMessage(res.message || i18n('workspace.renameTable.failed'));
        }
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div className={styles.renameTableContent}>
      <div className={styles.renameTableName}>{i18n('workspace.renameTable.currentName', oldTableName)}</div>
      <Input
        autoFocus
        value={newTableName}
        status={errorMessage ? 'error' : undefined}
        placeholder={i18n('workspace.renameTable.placeholder')}
        autoComplete="off"
        onChange={(e) => {
          setNewTableName(e.target.value);
          setErrorMessage('');
        }}
        onPressEnter={onOk}
      />
      <div className={styles.renameTableError}>{errorMessage}</div>
      <div className={styles.renameTableFooter}>
        <Button
          onClick={() => {
            openModal(false);
          }}
        >
          {i18n('common.button.cancel')}
        </Button>
        <Button type="primary" loading={loading} disabled={!!inputError} onClick={onOk}>
          {i18n('common.button.affirm')}
        </Button>
      </div>
    </div>
  );
};
