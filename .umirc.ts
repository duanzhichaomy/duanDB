import { defineConfig } from 'umi';
import { extractYarnConfig, transitionTimezoneTimestamp } from './src/utils/webpack';
import pkg from './package.json';

const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

const yarn_config = extractYarnConfig(process.argv);

const chainWebpack = (config: any, { webpack }: any) => {
  config.plugin('monaco-editor').use(MonacoWebpackPlugin, [
    {
      languages: ['mysql', 'pgsql', 'sql'],
    },
  ]);
};

export default defineConfig({
  title: 'DuanDB',
  base: '/',
  publicPath: '/',
  hash: true,
  routes: [
    {
      path: '/',
      component: '@/layouts/GlobalLayout',
      routes: [
        {
          path: '/demo',
          component: '@/pages/demo',
        },
        {
          path: '/connections',
          component: 'main',
        },
        {
          path: '/workspace',
          component: 'main',
        },
        {
          path: '/',
          component: 'main',
        },
      ],
    },
  ],

  npmClient: 'pnpm',
  // 这些包要么是 Tauri 注入的运行时（不能被 MFSU 拦截），要么是大型纯前端库
  // 直接走 webpack 打包，避免 Module Federation 找不到模块的报错
  mfsu: {
    exclude: ['@tauri-apps/plugin-dialog', '@tauri-apps/api', 'xlsx'],
  },
  dva: {},
  plugins: ['@umijs/plugins/dist/dva'],
  chainWebpack,
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:10821',
      changeOrigin: true,
    },
  },
  targets: {
    chrome: 80,
  },
  links: [{ rel: 'icon', type: 'image/ico', sizes: '32x32', href: '/static/front/logo.ico' }],
  headScripts: [
    { src: '/monaco-nls-zh-hans.js', async: false },
    `if (localStorage.getItem('app-local-storage-versions') !== 'v4') {
      localStorage.clear();
      localStorage.setItem('app-local-storage-versions', 'v4');
    }`,
  ],
  favicons: ['logo.ico'],
  define: {
    __ENV__: process.env.UMI_ENV || 'desktop',
    __BUILD_TIME__: transitionTimezoneTimestamp(new Date().getTime()),
    __APP_VERSION__: yarn_config.app_version || pkg.version,
    __APP_PORT__: yarn_config.app_port,
  },
  esbuildMinifyIIFE: true,
});
