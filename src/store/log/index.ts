import { createWithEqualityFn } from 'zustand/traditional';
import { devtools } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';

export type LogLevel = 'log' | 'info' | 'warn' | 'error';

export interface ILogEntry {
  id: number;
  level: LogLevel;
  timestamp: number;
  message: string;
  // 来源：console 拦截、未捕获异常、Promise rejection、网络错误
  source: 'console' | 'uncaught' | 'unhandledrejection' | 'network';
}

export interface ILogState {
  logs: ILogEntry[];
  unreadCount: number;
  isOpen: boolean;
}

let _nextId = 1;

const useLogStore = createWithEqualityFn<ILogState>()(
  devtools(
    () => ({
      logs: [] as ILogEntry[],
      unreadCount: 0,
      isOpen: false,
    }),
    { name: 'logStore' },
  ),
  shallow,
);

// 最大保留条数
const MAX_LOGS = 500;

/**
 * 添加一条日志
 */
export function addLog(level: LogLevel, message: string, source: ILogEntry['source'] = 'console') {
  const entry: ILogEntry = {
    id: _nextId++,
    level,
    timestamp: Date.now(),
    message,
    source,
  };
  const state = useLogStore.getState();
  const logs = [...state.logs, entry].slice(-MAX_LOGS);
  const unreadCount = state.isOpen ? 0 : state.unreadCount + 1;
  useLogStore.setState({ logs, unreadCount });
}

/**
 * 清空日志
 */
export function clearLogs() {
  useLogStore.setState({ logs: [], unreadCount: 0 });
}

/**
 * 打开/关闭日志面板
 */
export function setLogOpen(open: boolean) {
  useLogStore.setState({ isOpen: open, unreadCount: open ? 0 : useLogStore.getState().unreadCount });
}

/**
 * 格式化日志为可复制的文本
 */
export function formatLogsForCopy(logs: ILogEntry[]): string {
  return logs
    .map((log) => {
      const time = new Date(log.timestamp).toLocaleString('zh-CN', { hour12: false });
      return `[${time}] [${log.level.toUpperCase()}] [${log.source}] ${log.message}`;
    })
    .join('\n');
}

// ---- 初始化：拦截 console 和全局错误 ----

let _initialized = false;

export function initLogInterceptor() {
  if (_initialized) return;
  _initialized = true;

  // 拦截 console 方法
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };

  const formatArgs = (args: any[]): string => {
    return args
      .map((arg) => {
        if (arg instanceof Error) return `${arg.message}\n${arg.stack || ''}`;
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      })
      .join(' ');
  };

  (['log', 'info', 'warn', 'error'] as const).forEach((level) => {
    console[level] = (...args: any[]) => {
      // 调用原始方法，保证浏览器 DevTools 正常输出
      originalConsole[level](...args);
      // 延迟写入 store，避免在 React 渲染期间触发状态更新
      queueMicrotask(() => {
        addLog(level === 'info' ? 'info' : level, formatArgs(args), 'console');
      });
    };
  });

  // 捕获未处理的 JavaScript 异常
  window.addEventListener('error', (event) => {
    const msg = event.error
      ? `${event.error.message}\n${event.error.stack || ''}`
      : `${event.message} (${event.filename}:${event.lineno}:${event.colno})`;
    addLog('error', msg, 'uncaught');
  });

  // 捕获未处理的 Promise rejection
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason instanceof Error ? `${reason.message}\n${reason.stack || ''}` : String(reason);
    addLog('error', `Unhandled Promise Rejection: ${msg}`, 'unhandledrejection');
    // 阻止开发模式下的 React 错误覆盖层弹出
    event.preventDefault();
  });
}

export { useLogStore };
