import { UseBoundStoreWithEqualityFn, createWithEqualityFn } from 'zustand/traditional';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import { StoreApi } from 'zustand';

export interface IShortcutBinding {
  /** 快捷键标识 */
  key: string;
  /** 显示名称 */
  label: string;
  /** 修饰键 */
  modifiers: string[];
  /** 按键 */
  code: string;
  /** 显示用的快捷键文本 */
  displayText: string;
}

export interface IShortcutKeyState {
  bindings: Record<string, IShortcutBinding>;
}

const isMac = navigator.platform.toLowerCase().includes('mac');
const modKey = isMac ? '⌘' : 'Ctrl';

export const defaultBindings: Record<string, IShortcutBinding> = {
  switchToWorkspace: {
    key: 'switchToWorkspace',
    label: '切换到工作区',
    modifiers: [isMac ? 'metaKey' : 'ctrlKey'],
    code: 'Digit1',
    displayText: `${modKey}+1`,
  },
  closeCurrentTab: {
    key: 'closeCurrentTab',
    label: '关闭当前会话',
    modifiers: [isMac ? 'metaKey' : 'ctrlKey'],
    code: 'KeyW',
    displayText: `${modKey}+W`,
  },
  newConsole: {
    key: 'newConsole',
    label: '新建会话',
    modifiers: [isMac ? 'metaKey' : 'ctrlKey'],
    code: 'KeyT',
    displayText: `${modKey}+T`,
  },
};

const initState: IShortcutKeyState = {
  bindings: { ...defaultBindings },
};

export const useShortcutKeyStore: UseBoundStoreWithEqualityFn<StoreApi<IShortcutKeyState>> =
  createWithEqualityFn(
    devtools(
      persist(() => initState, {
        name: 'shortcut-key-settings',
        storage: createJSONStorage(() => localStorage),
      }),
    ),
    shallow,
  );

export const updateBinding = (key: string, binding: Partial<IShortcutBinding>) => {
  const current = useShortcutKeyStore.getState().bindings;
  useShortcutKeyStore.setState({
    bindings: {
      ...current,
      [key]: { ...current[key], ...binding },
    },
  });
};

export const resetBinding = (key: string) => {
  const current = useShortcutKeyStore.getState().bindings;
  useShortcutKeyStore.setState({
    bindings: {
      ...current,
      [key]: { ...defaultBindings[key] },
    },
  });
};

export const clearBinding = (key: string) => {
  const current = useShortcutKeyStore.getState().bindings;
  useShortcutKeyStore.setState({
    bindings: {
      ...current,
      [key]: { ...current[key], modifiers: [], code: '', displayText: '' },
    },
  });
};
