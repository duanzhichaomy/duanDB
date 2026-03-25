/**
 * Tauri 桥接层 - 替代原 Electron API
 * 在非 Tauri 环境下（如浏览器）所有方法安全降级为空操作
 */

let tauriWindow: any = null;
let tauriProcess: any = null;

// 动态导入 Tauri API，避免在浏览器环境报错
const initTauri = async () => {
  try {
    if (window.__TAURI_INTERNALS__) {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      tauriWindow = getCurrentWindow();
      tauriProcess = await import('@tauri-apps/api/core');
    }
  } catch (e) {
    console.log('Not running in Tauri environment');
  }
};

initTauri();

export const isTauri = (): boolean => {
  return !!window.__TAURI_INTERNALS__;
};

export const getPlatform = () => {
  const platform = navigator.platform.toLowerCase();
  return {
    isMac: platform.includes('mac'),
    isWindows: platform.includes('win'),
    isLinux: platform.includes('linux'),
  };
};

export const minimizeWindow = async () => {
  await tauriWindow?.minimize();
};

export const toggleMaximize = async () => {
  await tauriWindow?.toggleMaximize();
};

export const isMaximized = async (): Promise<boolean> => {
  return (await tauriWindow?.isMaximized()) ?? false;
};

export const closeWindow = async () => {
  await tauriWindow?.close();
};

export const quitApp = async () => {
  try {
    // Tauri v2: process API 通过 @tauri-apps/plugin-process 提供
    // 这里使用 core invoke 直接调用退出
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('plugin:process|exit', { code: 0 });
  } catch {
    window.close();
  }
};
