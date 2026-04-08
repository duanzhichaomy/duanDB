import React, { useEffect, useMemo, useState } from 'react';
import { Tooltip } from 'antd';
import classnames from 'classnames';

import Iconfont from '@/components/Iconfont';
import BrandLogo from '@/components/BrandLogo';

import i18n from '@/i18n';
import { INavItem } from '@/typings/main';

// ----- hooks -----
import getConnectionEnvList from './functions/getConnection';

// ----- store -----
import { useMainStore, setMainPageActiveTab } from '@/pages/main/store/main';
import { getConnectionList } from '@/pages/main/store/connection';
import { setAppTitleBarRightComponent } from '@/store/common/appTitleBarConfig';
import { useWorkspaceStore } from '@/pages/main/workspace/store';
import { setShowLeftSaveList } from '@/pages/main/workspace/store/common';
import { useShortcutKeyStore, defaultBindings } from '@/store/shortcutKey';
import { setActiveConsoleId, setWorkspaceTabList, createConsole } from '@/pages/main/workspace/store/console';
import { setCurrentWorkspaceExtend } from '@/pages/main/workspace/store/common';
import { useTreeStore } from '@/blocks/Tree/treeStore';
import historyService from '@/service/history';
import indexedDB from '@/indexedDB';

// ----- component -----
import CustomLayout from '@/components/CustomLayout';

// ----- block -----
import Workspace from './workspace';
import Connection from './connection';
import Setting from '@/blocks/Setting';
import LogViewer from '@/blocks/LogViewer';

import styles from './index.less';
import { useUpdateEffect } from '@/hooks';

const initNavConfig: INavItem[] = [
  {
    key: 'workspace',
    icon: '\ue669',
    iconFontSize: 16,
    isLoad: false,
    component: <Workspace />,
    name: i18n('workspace.title'),
  },
];

function MainPage() {
  const showLeftSaveList = useWorkspaceStore((state) => state.showLeftSaveList);
  const [navConfig, setNavConfig] = useState<INavItem[]>(initNavConfig);
  const mainPageActiveTab = useMainStore((state) => state.mainPageActiveTab);
  const [activeNavKey, setActiveNavKey] = useState<string>(
    __ENV__ === 'desktop' ? mainPageActiveTab : window.location.pathname.split('/')[1] || mainPageActiveTab,
  );

  const isMac = useMemo(() => {
    return navigator.platform.toLowerCase().includes('mac');
  }, []);

  // 当页面在workspace时，显示自定义布局
  useEffect(() => {
    if (mainPageActiveTab === 'workspace') {
      setAppTitleBarRightComponent(<CustomLayout />);
    } else {
      setAppTitleBarRightComponent(false);
    }
    return () => {
      setAppTitleBarRightComponent(false);
    };
  }, [mainPageActiveTab]);

  // 全局快捷键
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const bindings = useShortcutKeyStore.getState().bindings;

      // 检查是否匹配某个快捷键
      const matchBinding = (key: string) => {
        const b = bindings[key] || defaultBindings[key];
        if (!b || !b.code) return false;
        const modMatch = b.modifiers.every((m: string) => (e as any)[m]);
        // 确保没有额外的修饰键
        const allMods = ['metaKey', 'ctrlKey', 'altKey', 'shiftKey'];
        const extraMod = allMods.some((m) => (e as any)[m] && !b.modifiers.includes(m));
        return modMatch && !extraMod && e.code === b.code;
      };

      if (matchBinding('closeCurrentTab')) {
        e.preventDefault();
        e.stopPropagation();
        const { activeConsoleId: activeId, workspaceTabList: tabList } = useWorkspaceStore.getState();
        if (tabList && tabList.length > 0 && activeId != null) {
          const idx = tabList.findIndex((t) => t.id === activeId);
          const tab = tabList.find((t) => t.id === activeId);
          if (tab) {
            // 关闭当前tab
            const newList = tabList.filter((t) => t.id !== activeId);
            setWorkspaceTabList(newList);
            // 只有数字ID的tab才需要更新后端状态
            if (typeof activeId === 'number') {
              historyService.updateSavedConsole({ id: activeId, tabOpened: 'n' }).then(() => {
                indexedDB.deleteData('duandb', 'workspaceConsoleDDL', activeId);
              });
            }
            // 激活相邻tab
            if (newList.length > 0) {
              const newIdx = Math.min(idx, newList.length - 1);
              setActiveConsoleId(newList[newIdx].id);
            } else {
              setActiveConsoleId(null);
            }
          }
        }
        return;
      }

      if (matchBinding('newConsole')) {
        e.preventDefault();
        e.stopPropagation();
        const conn = useWorkspaceStore.getState().currentConnectionDetails;
        if (conn) {
          const { databaseName, schemaName } = useTreeStore.getState().focusTreeNode || {};
          createConsole({
            dataSourceId: conn.id,
            dataSourceName: conn.alias,
            databaseType: conn.type,
            databaseName,
            schemaName,
          });
        }
        return;
      }

      if (matchBinding('switchToWorkspace')) {
        e.preventDefault();
        e.stopPropagation();
        setMainPageActiveTab('workspace');
        return;
      }

      if (matchBinding('openInfoPanel')) {
        e.preventDefault();
        e.stopPropagation();
        const current = useWorkspaceStore.getState().currentWorkspaceExtend;
        setCurrentWorkspaceExtend(current === 'info' ? null : 'info');
        return;
      }
    };

    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, []);

  useEffect(() => {
    getConnectionList();
    getConnectionEnvList();
  }, []);

  useUpdateEffect(() => {
    switchingNav(mainPageActiveTab);
  }, [mainPageActiveTab]);

  // 切换tab
  useEffect(() => {
    // 获取当前地址栏的tab
    const activeIndex = navConfig.findIndex((t) => `${t.key}` === activeNavKey);
    if (activeIndex > -1) {
      navConfig[activeIndex].isLoad = true;
      setNavConfig([...navConfig]);
      if (__ENV__ !== 'desktop') {
        const href = window.location.origin + '/' + activeNavKey;
        window.history.pushState({}, '', href);
      }
    }
  }, [activeNavKey]);

  const switchingNav = (key: string) => {
    setActiveNavKey(key);
    setMainPageActiveTab(key);
  };

  return (
    <div className={styles.page}>
      <div className={styles.layoutLeft}>
        {isMac === void 0 && <BrandLogo size={38} className={styles.brandLogo} />}
        <ul className={styles.navList}>
          {navConfig.map((item) => {
            return (
              <Tooltip key={item.key} placement="right" title={item.name}>
                <li
                  className={classnames({
                    [styles.activeNav]: item.key == activeNavKey && !showLeftSaveList,
                  })}
                  onClick={() => {
                    switchingNav(item.key);
                    setShowLeftSaveList(false);
                  }}
                >
                  <Iconfont size={item.iconFontSize} className={styles.icon} code={item.icon} />
                </li>
              </Tooltip>
            );
          })}
          {activeNavKey === 'workspace' && (
            <Tooltip placement="right" title={i18n('workspace.title.savedConsole')}>
              <li
                className={classnames({ [styles.activeNav]: showLeftSaveList })}
                onClick={() => setShowLeftSaveList(true)}
              >
                <svg className={styles.icon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <line x1="8" y1="16" x2="8" y2="12" />
                  <line x1="12" y1="16" x2="12" y2="8" />
                  <line x1="16" y1="16" x2="16" y2="10" />
                </svg>
              </li>
            </Tooltip>
          )}
        </ul>
        <div className={styles.footer}>
          <LogViewer className={styles.setIcon} />
          <Setting className={styles.setIcon} />
        </div>
      </div>
      <div className={styles.layoutRight}>
        {navConfig.map((item) => {
          return (
            <div key={item.key} className={styles.componentBox} hidden={activeNavKey !== item.key}>
              {item.isLoad ? item.component : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MainPage;
