import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Drawer, Tooltip, Select, Button } from 'antd';
import { message } from '@/utils/globalMessage';
import classnames from 'classnames';
import Iconfont from '@/components/Iconfont';
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
  const [filterLevel, setFilterLevel] = useState<LogLevel | 'all'>('all');
  const listRef = useRef<HTMLDivElement>(null);

  const filteredLogs = useMemo(() => {
    if (filterLevel === 'all') return logs;
    return logs.filter((l) => l.level === filterLevel);
  }, [logs, filterLevel]);

  // 自动滚动到底部
  useEffect(() => {
    if (isOpen && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [filteredLogs.length, isOpen]);

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

  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

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
        title="应用日志"
        placement="bottom"
        size="large"
        open={isOpen}
        onClose={() => setLogOpen(false)}
        styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column' } }}
        extra={
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
        }
      >
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
      </Drawer>
    </>
  );
}

export default LogViewer;
