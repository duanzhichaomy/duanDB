import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classnames from 'classnames';

import Iconfont from '@/components/Iconfont';
import { TreeNodeType } from '@/constants';
import { openTableNode } from '@/blocks/Tree/functions/openTable';
import { useWorkspaceStore } from '@/pages/main/workspace/store';
import { loadDbFilter } from '@/pages/main/workspace/functions/dbFilter';
import connectionService from '@/service/connection';
import sqlServer from '@/service/sql';
import { IConnectionListItem } from '@/typings/connection';
import { ITreeNode } from '@/typings';

import styles from './index.less';

interface IProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface IScope {
  databaseName?: string;
  schemaName?: string;
}

interface IQuickOpenTableItem {
  id: string;
  node: ITreeNode;
  comment?: string | null;
  databaseName?: string;
  schemaName?: string;
  dataSourceName: string;
}

function normalizeText(text?: string | null) {
  return (text || '').toLowerCase();
}

function buildTableNode(
  connection: IConnectionListItem,
  scope: IScope,
  table: { name: string; comment?: string | null },
): ITreeNode {
  const stableId = [
    'quick-open-table',
    connection.id,
    scope.databaseName || '',
    scope.schemaName || '',
    table.name,
  ].join(':');

  return {
    uuid: stableId,
    key: table.name,
    name: table.name,
    treeNodeType: TreeNodeType.TABLE,
    comment: table.comment || undefined,
    extraParams: {
      dataSourceId: connection.id,
      dataSourceName: connection.alias,
      databaseType: connection.type,
      databaseName: scope.databaseName,
      schemaName: scope.schemaName,
      tableName: table.name,
    },
  };
}

async function getDatabaseScopes(connection: IConnectionListItem): Promise<IScope[]> {
  if (!connection.supportDatabase) {
    return [{}];
  }

  const dbList = await connectionService.getDatabaseList({ dataSourceId: connection.id });
  const dbNames = (dbList || []).map((item: { name: string }) => item.name).filter(Boolean);
  const selectedDbNames = loadDbFilter(connection.id);
  const activeDbNames = selectedDbNames ? dbNames.filter((name) => selectedDbNames.includes(name)) : dbNames;

  return activeDbNames.map((databaseName) => ({ databaseName }));
}

async function getSchemaScopes(connection: IConnectionListItem, scope: IScope): Promise<IScope[]> {
  if (!connection.supportSchema) {
    return [scope];
  }

  const schemaList = await connectionService.getSchemaList({
    dataSourceId: connection.id,
    databaseName: scope.databaseName,
  });
  const schemaNames = (schemaList || []).map((item: { name: string }) => item.name).filter(Boolean);

  if (!schemaNames.length) {
    return [scope];
  }

  return schemaNames.map((schemaName) => ({
    ...scope,
    schemaName,
  }));
}

const QuickOpenTable = memo<IProps>((props) => {
  const { open, onOpenChange } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);
  const currentConnectionDetails = useWorkspaceStore((state) => state.currentConnectionDetails);
  const [keyword, setKeyword] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<IQuickOpenTableItem[]>([]);

  const close = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const loadTables = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setItems([]);

    try {
      const connection = useWorkspaceStore.getState().currentConnectionDetails;
      if (!connection?.id) {
        return;
      }

      const databaseScopes = await getDatabaseScopes(connection);
      const scopes = (await Promise.all(databaseScopes.map((scope) => getSchemaScopes(connection, scope)))).flat();
      const tableGroups = await Promise.all(
        scopes.map(async (scope) => {
          try {
            const tableList = await sqlServer.getAllTableList({
              dataSourceId: connection.id,
              databaseName: scope.databaseName,
              schemaName: scope.schemaName,
            });

            return (tableList || [])
              .filter((table) => table.name)
              .map((table) => {
                const node = buildTableNode(connection, scope, table);
                return {
                  id: node.uuid,
                  node,
                  comment: table.comment,
                  databaseName: scope.databaseName,
                  schemaName: scope.schemaName,
                  dataSourceName: connection.alias,
                };
              });
          } catch {
            return [];
          }
        }),
      );

      if (requestIdRef.current !== requestId) {
        return;
      }

      setItems(
        tableGroups
          .flat()
          .sort((a, b) => {
            const left = [a.databaseName || '', a.schemaName || '', a.node.name].join('.');
            const right = [b.databaseName || '', b.schemaName || '', b.node.name].join('.');
            return left.localeCompare(right);
          }),
      );
    } catch {
      if (requestIdRef.current === requestId) {
        setItems([]);
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!open) {
      requestIdRef.current += 1;
      return;
    }

    setKeyword('');
    setActiveIndex(0);
    loadTables();
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [open, currentConnectionDetails?.id, loadTables]);

  const filteredItems = useMemo(() => {
    const value = normalizeText(keyword.trim());
    const matched = value
      ? items.filter((item) => {
        return normalizeText(item.node.name).includes(value);
      })
      : items;

    return matched.slice(0, 60);
  }, [items, keyword]);

  useEffect(() => {
    setActiveIndex(0);
  }, [keyword]);

  useEffect(() => {
    if (activeIndex > filteredItems.length - 1) {
      setActiveIndex(Math.max(filteredItems.length - 1, 0));
    }
  }, [activeIndex, filteredItems.length]);

  const openItem = useCallback((item?: IQuickOpenTableItem) => {
    if (!item) return;
    openTableNode(item.node);
    close();
  }, [close]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((value) => Math.min(value + 1, Math.max(filteredItems.length - 1, 0)));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((value) => Math.max(value - 1, 0));
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      openItem(filteredItems[activeIndex]);
    }
  }, [activeIndex, close, filteredItems, openItem]);

  if (!open) {
    return null;
  }

  return (
    <div className={styles.overlay} onMouseDown={close}>
      <div className={styles.palette} onMouseDown={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className={styles.searchBox}>
          <Iconfont code="&#xe600;" className={styles.searchIcon} />
          <input
            ref={inputRef}
            className={styles.input}
            value={keyword}
            placeholder="Open anything search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <span className={styles.shortcutText}>ESC</span>
        </div>

        {(loading || filteredItems.length > 0 || keyword) && (
          <div className={styles.resultPanel}>
            {loading ? (
              <div className={styles.emptyText}>正在加载表...</div>
            ) : filteredItems.length ? (
              filteredItems.map((item, index) => {
                const databaseText = item.databaseName || '';
                return (
                  <div
                    key={item.id}
                    className={classnames(styles.resultItem, { [styles.activeResultItem]: index === activeIndex })}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      openItem(item);
                    }}
                  >
                    <Iconfont code="&#xe611;" className={styles.tableIcon} />
                    <div className={styles.resultBody}>
                      <div className={styles.resultMain}>
                        <span className={styles.tableName}>{item.node.name}</span>
                        {databaseText && <span className={styles.pathText}>{databaseText}</span>}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className={styles.emptyText}>没有匹配的表</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default QuickOpenTable;
