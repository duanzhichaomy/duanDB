import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Drawer, Tooltip, Select, Button, Popover } from 'antd';
import { message } from '@/utils/globalMessage';
import classnames from 'classnames';
import Iconfont from '@/components/Iconfont';
import ScrollLoading from '@/components/ScrollLoading';
import historyService, { IHistoryRecord } from '@/service/history';
import * as monaco from 'monaco-editor';
import { copy } from '@/utils';
import { createConsole } from '@/pages/main/workspace/store/console';
import i18n from '@/i18n';
import {
  useLogStore,
  setLogOpen,
  clearLogs,
  formatLogsForCopy,
  type LogLevel,
  type ILogEntry,
} from '@/store/log';
import styles from './index.less';

const levelColors: Record<LogLevel, string> = {
  log: 'var(--color-text-secondary)',
  info: 'var(--color-primary)',
  warn: '#faad14',
  error: '#ff4d4f',
};

const levelLabels: Record<LogLevel, string> = {
  log: 'LOG',
  info: 'INFO',
  warn: 'WARN',
  error: 'ERROR',
};

type TabKey = 'appLog' | 'executiveLog';

interface IDatasource extends IHistoryRecord {
  highlightedCode: string;
}

interface IProps {
  className?: string;
}

function LogViewer(props: IProps) {
  const { className } = props;
  const { isOpen, logs, unreadCount } = useLogStore((state) => ({
    isOpen: state.isOpen,
    logs: state.logs,
    unreadCount: state.unreadCount,
  }));
  const [activeTab, setActiveTab] = useState<TabKey>('appLog');
  const [filterLevel, setFilterLevel] = useState<LogLevel | 'all'>('all');
  const listRef = useRef<HTMLDivElement>(null);

  // 执行记录状态
  const [historyData, setHistoryData] = useState<IDatasource[]>([]);
  const historyContentRef = useRef<HTMLDivElement>(null);
  const curPageRef = useRef(1);
  const finishedRef = useRef(false);

  const filteredLogs = useMemo(() => {
    if (filterLevel === 'all') return logs;
    return logs.filter((l) => l.level === filterLevel);
  }, [logs, filterLevel]);

  // 自动滚动到底部
  useEffect(() => {
    if (isOpen && activeTab === 'appLog' && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [filteredLogs.length, isOpen, activeTab]);

  // 切换到执行记录时重新加载
  useEffect(() => {
    if (isOpen && activeTab === 'executiveLog' && historyData.length === 0) {
      getHistoryList();
    }
  }, [isOpen, activeTab]);

  const getHistoryList = () => {
    return historyService
      .getHistoryList({ pageNo: curPageRef.current++, pageSize: 40 })
      .then((res) => {
        finishedRef.current = !res.hasNextPage;
        const promiseList = res.data.map((item) => {
          return new Promise((resolve) => {
            const ddl = item.ddl || '';
            monaco.editor.colorize(ddl, 'sql', {}).then((_res) => {
              resolve({ ...item, highlightedCode: _res });
            });
          });
        });
        Promise.all(promiseList).then((_res) => {
          setHistoryData((prev) => [...prev, ..._res] as IDatasource[]);
        });
      });
  };

  const handleCopyAll = () => {
    const text = formatLogsForCopy(filteredLogs);
    if (!text) {
      message.info('暂无日志');
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      message.success('已复制到剪贴板');
    });
  };

  const handleCopyEntry = (entry: ILogEntry) => {
    const text = formatLogsForCopy([entry]);
    navigator.clipboard.writeText(text).then(() => {
      message.success('已复制');
    });
  };

  const copySql = (text: IDatasource['ddl']) => {
    copy(text || '');
    message.success(i18n('common.tips.saveSuccessfully'));
  };

  const openSql = (data: IDatasource) => {
    createConsole({
      ddl: data.ddl || '',
      dataSourceId: data.dataSourceId!,
      dataSourceName: data.dataSourceName!,
      databaseType: data.type!,
      databaseName: data.databaseName!,
      schemaName: data.schemaName!,
    });
  };

  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatHistoryTime = (timeStr: string | undefined) => {
    if (!timeStr) return '';
    const match = timeStr.match(/(\d{2}:\d{2}:\d{2})/);
    return match ? match[1] : timeStr;
  };

  const handleClearHistory = () => {
    setHistoryData([]);
    curPageRef.current = 1;
    finishedRef.current = false;
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'appLog', label: '应用日志' },
    { key: 'executiveLog', label: i18n('common.title.executiveLogging') },
  ];

  const drawerTitle = (
    <div className={styles.tabBar}>
      {tabs.map((tab) => (
        <div
          key={tab.key}
          className={classnames(styles.tab, { [styles.tabActive]: activeTab === tab.key })}
          onClick={() => setActiveTab(tab.key)}
        >
          {tab.label}
        </div>
      ))}
    </div>
  );

  const toolbarContent = activeTab === 'appLog' ? (
    <div className={styles.toolbar}>
      <Select
        size="small"
        value={filterLevel}
        onChange={setFilterLevel}
        style={{ width: 100 }}
        options={[
          { label: '全部', value: 'all' },
          { label: 'LOG', value: 'log' },
          { label: 'INFO', value: 'info' },
          { label: 'WARN', value: 'warn' },
          { label: 'ERROR', value: 'error' },
        ]}
      />
      <Button size="small" onClick={handleCopyAll}>
        复制全部
      </Button>
      <Button size="small" onClick={clearLogs}>
        清空
      </Button>
    </div>
  ) : (
    <div className={styles.toolbar}>
      <Button size="small" onClick={handleClearHistory}>
        清空
      </Button>
    </div>
  );

  return (
    <>
      <Tooltip placement="right" title="应用日志">
        <div
          className={classnames(className, styles.triggerBox)}
          onClick={() => setLogOpen(true)}
        >
          <Badge count={unreadCount} size="small" offset={[4, -4]}>
            <Iconfont className={styles.logIcon} code="&#xe8ad;" />
          </Badge>
        </div>
      </Tooltip>

      <Drawer
        title={drawerTitle}
        placement="bottom"
        size="large"
        open={isOpen}
        onClose={() => setLogOpen(false)}
        styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column' } }}
        extra={toolbarContent}
      >
        {activeTab === 'appLog' && (
          <div className={styles.logList} ref={listRef}>
            {filteredLogs.length === 0 && <div className={styles.empty}>暂无日志</div>}
            {filteredLogs.map((entry) => (
              <div
                key={entry.id}
                className={classnames(styles.logEntry, styles[`level-${entry.level}`])}
                onClick={() => handleCopyEntry(entry)}
                title="点击复制此条日志"
              >
                <span className={styles.time}>{formatTime(entry.timestamp)}</span>
                <span className={styles.level} style={{ color: levelColors[entry.level] }}>
                  {levelLabels[entry.level]}
                </span>
                <span className={styles.source}>[{entry.source}]</span>
                <span className={styles.message}>{entry.message}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'executiveLog' && (
          <div className={styles.historyList} ref={historyContentRef}>
            <ScrollLoading
              onReachBottom={getHistoryList}
              scrollerElement={historyContentRef}
              threshold={300}
              finished={finishedRef.current}
            >
              <>
                {historyData.length === 0 && <div className={styles.empty}>暂无执行记录</div>}
                {historyData.map((item, index) => {
                  const dbPath = [item.databaseName, item.schemaName].filter(Boolean).join(' > ');
                  return (
                    <div key={index} className={styles.historyItem}>
                      <div className={styles.historyHeader}>
                        <div className={styles.historyHeaderLeft}>
                          <Iconfont
                            code={item.status === 'success' ? '&#xe650;' : '&#xe755;'}
                            size={12}
                            className={item.status === 'success' ? styles.statusSuccess : styles.statusError}
                          />
                          <span className={styles.timeText}>{formatHistoryTime(item.gmtCreate)}</span>
                          {!!item.useTime && (
                            <span className={styles.durationText}>{item.useTime}ms</span>
                          )}
                        </div>
                        <div className={styles.historyHeaderRight}>
                          <Popover mouseEnterDelay={0.8} content={i18n('common.button.copy')}>
                            <div className={styles.historyActionBtn} onClick={() => copySql(item.ddl)}>
                              <Iconfont code="&#xec7a;" size={12} />
                            </div>
                          </Popover>
                          <Popover mouseEnterDelay={0.8} content={i18n('workspace.tips.openExecutiveLogging')}>
                            <div className={styles.historyActionBtn} onClick={() => openSql(item)}>
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
        )}
      </Drawer>
    </>
  );
}

export default LogViewer;
