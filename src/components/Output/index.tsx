import React, { memo } from 'react';
import styles from './index.less';
import classnames from 'classnames';
import Iconfont from '@/components/Iconfont';
import ScrollLoading from '@/components/ScrollLoading';
import historyService, { IHistoryRecord } from '@/service/history';
import * as monaco from 'monaco-editor';
import i18n from '@/i18n';
import { copy } from '@/utils';
import { createConsole } from '@/pages/main/workspace/store/console';
import { Popover } from 'antd';
import { message } from '@/utils/globalMessage';

interface IProps {
  className?: string;
}

interface IDatasource extends IHistoryRecord {
  highlightedCode: string; // sql处理过的高亮代码
}

export default memo<IProps>((props) => {
  const { className } = props;
  const [dataSource, setDataSource] = React.useState<IDatasource[]>([]);
  const outputContentRef = React.useRef<HTMLDivElement>(null);
  const curPageRef = React.useRef(1);
  const finishedRef = React.useRef(false);

  const getHistoryList = () => {
    return historyService
      .getHistoryList({
        pageNo: curPageRef.current++,
        pageSize: 40,
      })
      .then((res) => {
        finishedRef.current = !res.hasNextPage;
        const promiseList = res.data.map((item) => {
          return new Promise((resolve) => {
            const ddl = item.ddl || '';
            monaco.editor.colorize(ddl, 'sql', {}).then((_res) => {
              resolve({
                ...item,
                highlightedCode: _res,
              });
            });
          });
        });
        Promise.all(promiseList).then((_res) => {
          setDataSource([...dataSource, ..._res] as any);
        });
      });
  };

  const copySql = (text: IDatasource['ddl']) => {
    copy(text || '');
    message.success(i18n('common.tips.saveSuccessfully'));
  }

  const openSql = (data: IDatasource) => {
    createConsole({
      ddl: data.ddl || '',
      dataSourceId: data.dataSourceId!,
      dataSourceName: data.dataSourceName!,
      databaseType: data.type!,
      databaseName: data.databaseName!,
      schemaName: data.schemaName!,
    })
  }

  const formatTime = (timeStr: string | undefined) => {
    if (!timeStr) return '';
    // 只显示时:分:秒
    const match = timeStr.match(/(\d{2}:\d{2}:\d{2})/);
    return match ? match[1] : timeStr;
  };

  return (
    <div className={classnames(styles.output, className)}>
      <div className={styles.outputTitle}>
        <Iconfont code="&#xe8ad;" size={14} />
        <span>{i18n('common.title.executiveLogging')}</span>
      </div>
      <div className={styles.outputContent} ref={outputContentRef}>
        <ScrollLoading
          onReachBottom={getHistoryList}
          scrollerElement={outputContentRef}
          threshold={300}
          finished={finishedRef.current}
        >
          <>
            {dataSource.map((item, index) => {
              const dbPath = [item.databaseName, item.schemaName].filter(Boolean).join(' > ');
              return (
                <div key={index} className={styles.outputItem}>
                  <div className={styles.itemHeader}>
                    <div className={styles.headerLeft}>
                      <Iconfont
                        code={item.status === 'success' ? '&#xe650;' : '&#xe755;'}
                        size={12}
                        className={item.status === 'success' ? styles.statusSuccess : styles.statusError}
                      />
                      <span className={styles.timeText}>{formatTime(item.gmtCreate)}</span>
                      {!!item.useTime && (
                        <span className={styles.durationText}>{item.useTime}ms</span>
                      )}
                    </div>
                    <div className={styles.headerRight}>
                      <Popover mouseEnterDelay={0.8} content={i18n('common.button.copy')}>
                        <div className={styles.actionBtn} onClick={() => copySql(item.ddl)}>
                          <Iconfont code="&#xec7a;" size={12} />
                        </div>
                      </Popover>
                      <Popover mouseEnterDelay={0.8} content={i18n('workspace.tips.openExecutiveLogging')}>
                        <div className={styles.actionBtn} onClick={() => openSql(item)}>
                          <Iconfont code="&#xe6bb;" size={12} />
                        </div>
                      </Popover>
                    </div>
                  </div>
                  {dbPath && (
                    <div className={styles.dbPath}>
                      <Iconfont code="&#xe669;" size={11} className={styles.dbPathIcon} />
                      <span>{dbPath}</span>
                    </div>
                  )}
                  <div className={styles.sqlContent} dangerouslySetInnerHTML={{ __html: item.highlightedCode }} />
                </div>
              );
            })}
          </>
        </ScrollLoading>
      </div>
    </div>
  );
});
