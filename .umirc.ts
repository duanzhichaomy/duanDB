import { defineConfig } from 'umi';
import { extractYarnConfig, transitionTimezoneTimestamp } from './src/utils/webpack';

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
          path: '/login',
          component: '@/pages/login',
        },
        {
          path: '/demo',
          component: '@/pages/demo',
        },
        {
          path: '/connections',
          component: 'main',
        },
        {
          path: '/dashboard',
          component: 'main',
        },
        {
          path: '/team',
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
  dva: {},
  plugins: ['@umijs/plugins/dist/dva'],
  chainWebpack,
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:10821',
      changeOrigin: true,
    },
    '/client/remaininguses/': {
      target: 'http://127.0.0.1:1889',
      changeOrigin: true,
    },
  },
  targets: {
    chrome: 80,
  },
  links: [{ rel: 'icon', type: 'image/ico', sizes: '32x32', href: '/static/front/logo.ico' }],
  headScripts: [
    `if (localStorage.getItem('app-local-storage-versions') !== 'v4') {
      localStorage.clear();
      localStorage.setItem('app-local-storage-versions', 'v4');
    }`,
  ],
  favicons: ['logo.ico'],
  define: {
    __ENV__: process.env.UMI_ENV || 'desktop',
    __BUILD_TIME__: transitionTimezoneTimestamp(new Date().getTime()),
    __APP_VERSION__: yarn_config.app_version || '0.1.0',
    __APP_PORT__: yarn_config.app_port,
  },
  esbuildMinifyIIFE: true,
});
