import { OperationColumn, WorkspaceTabType } from '@/constants';
import { addWorkspaceTab } from '@/pages/main/workspace/store/console';
import { ITreeNode } from '@/typings';
import { compatibleDataBaseName } from '@/utils/database';

export function openTableNode(treeNodeData: ITreeNode) {
  const databaseName = compatibleDataBaseName(treeNodeData.name!, treeNodeData.extraParams!.databaseType);
  const dbName = treeNodeData.extraParams?.databaseName;
  const tabTitle = dbName ? `${treeNodeData.name} (${dbName})` : treeNodeData.name;

  addWorkspaceTab({
    id: `${OperationColumn.OpenTable}-${treeNodeData.uuid}`,
    title: tabTitle,
    type: WorkspaceTabType.EditTableData,
    uniqueData: {
      dataSourceId: treeNodeData.extraParams!.dataSourceId!,
      databaseType: treeNodeData.extraParams!.databaseType!,
      databaseName: treeNodeData.extraParams?.databaseName,
      schemaName: treeNodeData.extraParams?.schemaName,
      tableName: treeNodeData.name,
      sql: 'select * from ' + databaseName,
    },
  });
}
