import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import styles from './index.less';
import classnames from 'classnames';

import { useWorkspaceStore } from '@/pages/main/workspace/store';

import Tree from '@/blocks/Tree';
import { treeConfig } from '@/blocks/Tree/treeConfig';
import { ITreeNode } from '@/typings';
import { TreeNodeType } from '@/constants';

interface IProps {
  className?: string;
  selectedDbNames?: string[] | null;
  onDbNamesLoaded?: (names: string[]) => void;
  searchValue?: string;
  onRegisterRefresh?: (fn: (refresh?: boolean) => void) => void;
}

export default memo<IProps>((props) => {
  const { className, selectedDbNames, onDbNamesLoaded, searchValue = '', onRegisterRefresh } = props;
  const [treeData, setTreeData] = useState<ITreeNode[] | null>(null);

  const currentConnectionDetails = useWorkspaceStore((state) => state.currentConnectionDetails);

  const getTreeData = (refresh = false) => {
    if (!currentConnectionDetails?.id) {
      setTreeData([]);
      return;
    }
    const treeNodeType = currentConnectionDetails.supportDatabase ? TreeNodeType.DATA_SOURCE : TreeNodeType.DATABASE;
    setTreeData(null);
    treeConfig[treeNodeType]
      .getChildren?.({
        dataSourceId: currentConnectionDetails.id,
        dataSourceName: currentConnectionDetails.alias,
        refresh,
        extraParams: {
          dataSourceId: currentConnectionDetails.id,
          dataSourceName: currentConnectionDetails.alias,
          databaseType: currentConnectionDetails.type,
        },
      })
      .then((res) => {
        setTreeData(res);
        if (onDbNamesLoaded) {
          onDbNamesLoaded((res as ITreeNode[]).map((n) => n.name));
        }
      })
      .catch(() => {
        setTreeData([]);
      });
  };

  useEffect(() => {
    if (onRegisterRefresh) {
      onRegisterRefresh(getTreeData);
    }
  }, [currentConnectionDetails]);

  useEffect(() => {
    getTreeData();
  }, [currentConnectionDetails]);

  const filteredTreeData = useMemo(() => {
    if (!treeData || !selectedDbNames) return treeData;
    return treeData.filter((node) => selectedDbNames.includes(node.name));
  }, [treeData, selectedDbNames]);

  return (
    <div className={classnames(styles.treeContainer, className)}>
      <Tree className={styles.treeBox} searchValue={searchValue} treeData={filteredTreeData} />
    </div>
  );
});
