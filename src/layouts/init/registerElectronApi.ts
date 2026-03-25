// Tauri 环境初始化（替代原 Electron API 注册）
const registerTauriApi = () => {
  // Electron 的 registerAppMenu / setBaseURL / setForceQuitCode 在 Tauri 中不需要
  // Tauri 使用原生菜单系统，通过 src-tauri 配置
};

export default registerTauriApi;
