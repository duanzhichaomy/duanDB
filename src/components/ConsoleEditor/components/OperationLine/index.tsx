import React from 'react';
import i18n from '@/i18n';
import { Tooltip } from 'antd';
import { message } from '@/utils/globalMessage';
import { IBoundInfo } from '@/typings/workspace';
import styles from './index.less';
import Iconfont from '@/components/Iconfont';
import { formatSql } from '@/utils/sql';
import { osNow } from '@/utils';
import { saveTextWithDialog } from '@/utils/file';

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
    const sql = editorRef?.current?.getCurrentStatementContent();
    if (sql) {
      executeSQL(sql);
    }
  };

  const handleExplain = () => {
    const sql = editorRef?.current?.getCurrentStatementContent();
    if (sql) {
      executeSQL(`EXPLAIN ${sql}`);
    }
  };

  const handleSaveAsFile = async () => {
    const sql = editorRef?.current?.getAllContent() || '';
    if (!sql) {
      return;
    }
    try {
      const saved = await saveTextWithDialog(
        sql,
        `query_${Date.now()}.sql`,
        [{ name: 'SQL', extensions: ['sql'] }],
        'text/sql',
      );
      if (saved) {
        message.success(i18n('common.text.successfulExecution'));
      }
    } catch (e: any) {
      console.error('保存 SQL 文件失败:', e);
      message.error(`保存失败: ${e?.message || e}`);
    }
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
