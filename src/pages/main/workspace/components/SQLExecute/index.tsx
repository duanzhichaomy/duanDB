import React, { memo, useEffect, useRef, useState } from 'react';
import styles from './index.less';
import classnames from 'classnames';
import DraggableContainer from '@/components/DraggableContainer';
import ConsoleEditor, { IConsoleRef } from '@/components/ConsoleEditor';
import SearchResult, { ISearchResultRef } from '@/components/SearchResult';
import { useWorkspaceStore } from '@/pages/main/workspace/store';
import { IBoundInfo } from '@/typings';

interface IProps {
  boundInfo: IBoundInfo;
  initDDL: string;
  // 异步加载sql
  loadSQL: () => Promise<string>;
}

const SQLExecute = memo<IProps>((props) => {
  const { boundInfo: _boundInfo, initDDL, loadSQL } = props;
  const draggableRef = useRef<any>();
  const searchResultRef = useRef<ISearchResultRef>(null);
  const consoleRef = useRef<IConsoleRef>(null);
  const [boundInfo, setBoundInfo] = useState<IBoundInfo>(_boundInfo);
  const [hasExecuted, setHasExecuted] = useState(false);
  const pendingSqlRef = useRef<string | null>(null);
  const activeConsoleId = useWorkspaceStore((state) => state.activeConsoleId);

  useEffect(() => {
    if (loadSQL) {
      loadSQL().then((sql) => {
        consoleRef.current?.editorRef?.setValue(sql, 'cover');
      });
    }
  }, []);

  // SearchResult 挂载后执行待执行的 SQL
  useEffect(() => {
    if (hasExecuted && pendingSqlRef.current && searchResultRef.current) {
      searchResultRef.current.handleExecuteSQL(pendingSqlRef.current);
      pendingSqlRef.current = null;
    }
  }, [hasExecuted]);

  const handleExecuteSQL = (sql: string) => {
    if (hasExecuted) {
      // SearchResult 已挂载，直接执行
      searchResultRef.current?.handleExecuteSQL(sql);
    } else {
      // 首次执行，先挂载 SearchResult，等下一个渲染周期再执行
      pendingSqlRef.current = sql;
      setHasExecuted(true);
    }
  };

  return (
    <div className={classnames(styles.sqlExecute)}>
      <DraggableContainer layout="column" className={styles.boxRightCenter}>
        <div ref={draggableRef} className={hasExecuted ? styles.boxRightConsole : styles.boxRightConsoleFull}>
          <ConsoleEditor
            ref={consoleRef}
            source="workspace"
            defaultValue={initDDL}
            boundInfo={boundInfo}
            setBoundInfo={setBoundInfo}
            hasAiChat={false}
            hasAi2Lang={true}
            isActive={activeConsoleId === boundInfo.consoleId}
            onExecuteSQL={handleExecuteSQL}
          />
        </div>
        {hasExecuted && (
          <div className={styles.boxRightResult}>
            <SearchResult
              isActive={activeConsoleId === boundInfo.consoleId}
              ref={searchResultRef}
              executeSqlParams={boundInfo}
            />
          </div>
        )}
      </DraggableContainer>
    </div>
  );
});

export default SQLExecute;
