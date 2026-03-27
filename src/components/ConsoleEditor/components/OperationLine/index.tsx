import React from 'react';
import i18n from '@/i18n';
import { Tooltip, message } from 'antd';
import { IBoundInfo } from '@/typings/workspace';
import styles from './index.less';
import Iconfont from '@/components/Iconfont';
import { formatSql } from '@/utils/sql';
import { osNow } from '@/utils';

interface IProps {
  saveConsole: (sql: string) => void;
  executeSQL: (sql?: string) => void;
  editorRef: any;
  hasSaveBtn: boolean;
  boundInfo: IBoundInfo;
}

const keyboardKey = (function () {
  if (osNow().isMac) {
    return {
      command: 'Cmd',
      Shift: 'Shift',
    };
  }
  return {
    command: 'Ctrl',
    Shift: 'Shift',
  };
})();

const OperationLine = (props: IProps) => {
  const { saveConsole, editorRef, hasSaveBtn, executeSQL, boundInfo } = props;

  const handleSQLFormat = () => {
    let setValueType = 'select';
    let sql = editorRef?.current?.getCurrentSelectContent();
    if (!sql) {
      sql = editorRef?.current?.getAllContent() || '';
      setValueType = 'cover';
    }
    formatSql(sql, boundInfo.databaseType!).then((res) => {
      editorRef?.current?.setValue(res, setValueType);
    });
  };

  const handleExecuteSingle = () => {
    const sql = editorRef?.current?.getCurrentSelectContent();
    if (sql) {
      executeSQL(sql);
    } else {
      const allSql = editorRef?.current?.getAllContent() || '';
      if (allSql) {
        // 取第一条语句
        const firstStatement = allSql.split(';').filter((s: string) => s.trim())[0];
        if (firstStatement) {
          executeSQL(firstStatement.trim());
        }
      }
    }
  };

  const handleExplain = () => {
    let sql = editorRef?.current?.getCurrentSelectContent();
    if (!sql) {
      const allSql = editorRef?.current?.getAllContent() || '';
      const firstStatement = allSql.split(';').filter((s: string) => s.trim())[0];
      sql = firstStatement?.trim();
    }
    if (sql) {
      executeSQL(`EXPLAIN ${sql}`);
    }
  };

  const handleSaveAsFile = () => {
    const sql = editorRef?.current?.getAllContent() || '';
    if (!sql) {
      return;
    }
    const blob = new Blob([sql], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_${Date.now()}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.consoleOptionsWrapper}>
      <Tooltip title={`${i18n('common.button.execute')} (${keyboardKey.command}+R)`} mouseEnterDelay={0.5}>
        <div className={`${styles.toolBtn} ${styles.toolBtnPrimary}`} onClick={() => executeSQL()}>
          <Iconfont code="&#xe637;" />
        </div>
      </Tooltip>
      <Tooltip title={i18n('common.button.executeSingle')} mouseEnterDelay={0.5}>
        <div className={styles.toolBtn} onClick={handleExecuteSingle}>
          <Iconfont code="&#xe656;" />
        </div>
      </Tooltip>
      <Tooltip title={i18n('common.button.explain')} mouseEnterDelay={0.5}>
        <div className={styles.toolBtn} onClick={handleExplain}>
          <Iconfont code="&#xe606;" />
        </div>
      </Tooltip>
      {hasSaveBtn && (
        <Tooltip title={`${i18n('common.button.save')} (${keyboardKey.command}+S)`} mouseEnterDelay={0.5}>
          <div className={styles.toolBtn} onClick={() => saveConsole(editorRef?.current?.getAllContent())}>
            <Iconfont code="&#xe645;" />
          </div>
        </Tooltip>
      )}
      <Tooltip title={i18n('common.button.saveAsFile')} mouseEnterDelay={0.5}>
        <div className={styles.toolBtn} onClick={handleSaveAsFile}>
          <Iconfont code="&#xe66c;" />
        </div>
      </Tooltip>
      <Tooltip title={i18n('common.button.format')} mouseEnterDelay={0.5}>
        <div className={styles.toolBtn} onClick={handleSQLFormat}>
          <Iconfont code="&#xe7f8;" />
        </div>
      </Tooltip>
    </div>
  );
};

export default OperationLine;
