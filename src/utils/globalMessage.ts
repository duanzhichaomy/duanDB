import { message as antdStaticMessage } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';

// 默认使用 antd 静态 message，App 组件挂载后替换为 context-aware 版本
let _instance: MessageInstance = antdStaticMessage as any;

export function initMessageInstance(instance: MessageInstance) {
  _instance = instance;
}

// Proxy 优先从 context-aware 实例取方法，静态方法（如 useMessage、config）回退到 antd 原始对象
export const message = new Proxy({} as typeof antdStaticMessage, {
  get(_, key: string) {
    const instanceVal = (_instance as any)[key];
    if (instanceVal !== undefined) return instanceVal;
    return (antdStaticMessage as any)[key];
  },
});
