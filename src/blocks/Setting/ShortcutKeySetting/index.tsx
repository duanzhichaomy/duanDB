import React, { useState, useCallback } from 'react';
import { Tooltip } from 'antd';
import Iconfont from '@/components/Iconfont';
import styles from './index.less';
import {
  useShortcutKeyStore,
  defaultBindings,
  resetBinding,
  clearBinding,
  updateBinding,
  IShortcutBinding,
} from '@/store/shortcutKey';

const isMac = navigator.platform.toLowerCase().includes('mac');

/** 将键盘事件转换为快捷键绑定 */
function eventToBinding(e: React.KeyboardEvent): Partial<IShortcutBinding> | null {
  // 只按了修饰键，忽略
  if (['Meta', 'Control', 'Alt', 'Shift'].includes(e.key)) {
    return null;
  }

  const modifiers: string[] = [];
  if (e.metaKey) modifiers.push('metaKey');
  if (e.ctrlKey) modifiers.push('ctrlKey');
  if (e.altKey) modifiers.push('altKey');
  if (e.shiftKey) modifiers.push('shiftKey');

  // 至少需要一个修饰键
  if (modifiers.length === 0) return null;

  const code = e.code;

  // 构建显示文本
  const parts: string[] = [];
  if (e.metaKey) parts.push(isMac ? '⌘' : 'Win');
  if (e.ctrlKey) parts.push('Ctrl');
  if (e.altKey) parts.push(isMac ? '⌥' : 'Alt');
  if (e.shiftKey) parts.push('⇧');

  // 获取按键名称
  let keyName = '';
  if (code.startsWith('Key')) {
    keyName = code.replace('Key', '');
  } else if (code.startsWith('Digit')) {
    keyName = code.replace('Digit', '');
  } else if (code.startsWith('Arrow')) {
    keyName = code.replace('Arrow', '');
  } else {
    keyName = e.key.toUpperCase();
  }
  parts.push(keyName);

  return {
    modifiers,
    code,
    displayText: parts.join('+'),
  };
}

const shortcutKeys = ['switchToWorkspace', 'closeCurrentTab', 'newConsole', 'openInfoPanel'];

export default function ShortcutKeySetting() {
  const bindings = useShortcutKeyStore((state) => state.bindings);
  const [recordingKey, setRecordingKey] = useState<string | null>(null);

  const handleKeyDown = useCallback(
    (key: string, e: React.KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const result = eventToBinding(e);
      if (result) {
        updateBinding(key, result);
        setRecordingKey(null);
      }
    },
    [],
  );

  return (
    <div className={styles.shortcutKeyList}>
      {shortcutKeys.map((key) => {
        const binding = bindings[key] || defaultBindings[key];
        const isRecording = recordingKey === key;

        return (
          <div key={key} className={styles.shortcutItem}>
            <span className={styles.shortcutLabel}>{binding.label}</span>
            <div className={styles.shortcutRight}>
              <input
                className={`${styles.shortcutInput} ${isRecording ? styles.recording : ''}`}
                value={isRecording ? '请按下快捷键...' : binding.displayText || '未设置'}
                readOnly
                onFocus={() => setRecordingKey(key)}
                onBlur={() => setRecordingKey(null)}
                onKeyDown={(e) => handleKeyDown(key, e)}
              />
              <Tooltip title="重置">
                <span className={styles.actionBtn} onClick={() => resetBinding(key)}>
                  <Iconfont code="&#xe668;" size={14} />
                </span>
              </Tooltip>
              <Tooltip title="清除">
                <span className={styles.actionBtn} onClick={() => clearBinding(key)}>
                  <Iconfont code="&#xe672;" size={14} />
                </span>
              </Tooltip>
            </div>
          </div>
        );
      })}
    </div>
  );
}
