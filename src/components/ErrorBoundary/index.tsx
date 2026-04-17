import React from 'react';
import { Button } from 'antd';
import { message } from '@/utils/globalMessage';
import { copy } from '@/utils';
import { addLog, formatLogsForCopy, useLogStore, type ILogEntry } from '@/store/log';
import styles from './index.less';

interface IState {
  hasError: boolean;
  error: Error | null;
  // 通过手动计数强制刷新，用于在兜底页面里订阅后续新增日志
  tick: number;
}

class ErrorBoundary extends React.Component<React.PropsWithChildren, IState> {
  state: IState = { hasError: false, error: null, tick: 0 };
  private unsubscribe: (() => void) | null = null;
  private listRef = React.createRef<HTMLDivElement>();

  static getDerivedStateFromError(error: Error): Partial<IState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const stackPart = error.stack || '';
    const compPart = info.componentStack ? `\nComponent stack:${info.componentStack}` : '';
    addLog('error', `${error.message}\n${stackPart}${compPart}`, 'uncaught');
    // 订阅 log store，兜底页面仍能看到后续新增日志
    this.unsubscribe = useLogStore.subscribe(() => {
      this.setState((s) => ({ tick: s.tick + 1 }));
    });
  }

  componentDidUpdate() {
    if (this.state.hasError && this.listRef.current) {
      this.listRef.current.scrollTop = this.listRef.current.scrollHeight;
    }
  }

  componentWillUnmount() {
    this.unsubscribe?.();
  }

  handleReload = () => {
    window.location.reload();
  };

  handleCopyLogs = async () => {
    const logs = useLogStore.getState().logs;
    const text = formatLogsForCopy(logs) || '(无日志)';
    await copy(text);
    message.success('已复制全部日志');
  };

  renderEntry = (entry: ILogEntry) => {
    const time = new Date(entry.timestamp).toLocaleTimeString('zh-CN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    return (
      <div key={entry.id} className={`${styles.logEntry} ${styles[`level-${entry.level}`] || ''}`}>
        <span className={styles.time}>{time}</span>
        <span className={styles.level}>{entry.level.toUpperCase()}</span>
        <span className={styles.source}>[{entry.source}]</span>
        <span className={styles.message}>{entry.message}</span>
      </div>
    );
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    const logs = useLogStore.getState().logs;
    return (
      <div className={styles.fallback}>
        <div className={styles.header}>
          <div className={styles.title}>应用发生错误</div>
          <div className={styles.errorMsg}>{this.state.error?.message || '未知错误'}</div>
          <div className={styles.actions}>
            <Button onClick={this.handleCopyLogs}>复制全部日志</Button>
            <Button type="primary" onClick={this.handleReload}>
              重新加载
            </Button>
          </div>
        </div>
        <div className={styles.logList} ref={this.listRef}>
          {logs.length === 0 ? <div className={styles.empty}>暂无日志</div> : logs.map(this.renderEntry)}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
