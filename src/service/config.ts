import createRequest from './base';

export interface ILatestVersion {
  /** 桌面 */
  desktop: boolean;
  /** 新版本 */
  version: string;
  /** 热更新包地址 */
  hotUpgradeUrl: null | string;
  /** 手动更新还是自动更新 */
  type: 'manual' | 'auto';
  /** 是否需要更新 */
  needUpdate?: boolean;
  /** 下载地址 */
  downloadLink?: null | string;
  /** 更新日志 */
  updateLog?: null | string;
}

// 检测更新获取最新的版本信息
const getLatestVersion = createRequest<{ currentVersion: string }, ILatestVersion>('/api/system/get_latest_version', {
  method: 'get',
});

// 下载并安装更新
const updateDesktopVersion = createRequest<any, boolean>('/api/system/update_desktop_version', {
  method: 'post',
});

// 检查更新是否成功（Tauri 模式下更新为同步操作，直接返回 true）
const isUpdateSuccess = (_params: { version: string }): Promise<boolean> => {
  return Promise.resolve(true);
};

export default {
  getLatestVersion,
  updateDesktopVersion,
  isUpdateSuccess,
};
