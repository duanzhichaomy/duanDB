import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Dropdown, Tooltip } from 'antd';
import classnames from 'classnames';

import Iconfont from '@/components/Iconfont';
import BrandLogo from '@/components/BrandLogo';

import i18n from '@/i18n';
import { userLogout } from '@/service/user';
import { INavItem } from '@/typings/main';
import { IRole } from '@/typings/user';

// ----- hooks -----
import getConnectionEnvList from './functions/getConnection';

// ----- store -----
import { useMainStore, setMainPageActiveTab } from '@/pages/main/store/main';
import { getConnectionList } from '@/pages/main/store/connection';
import { useUserStore, setCurUser } from '@/store/user';
import { setAppTitleBarRightComponent } from '@/store/common/appTitleBarConfig';
import { useWorkspaceStore } from '@/pages/main/workspace/store';
import { setShowLeftSaveList } from '@/pages/main/workspace/store/common';

// ----- component -----
import CustomLayout from '@/components/CustomLayout';

// ----- block -----
import Workspace from './workspace';
import Connection from './connection';
import Setting from '@/blocks/Setting';

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
  const navigate = useNavigate();
  const { userInfo } = useUserStore((state) => {
    return {
      userInfo: state.curUser,
    };
  });
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

  useEffect(() => {
    handleInitPage();
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

  const handleInitPage = async () => {
    const cloneNavConfig = [...navConfig];
    if (userInfo) {
    }
    setNavConfig([...cloneNavConfig]);
  };

  const switchingNav = (key: string) => {
    setActiveNavKey(key);
    setMainPageActiveTab(key);
  };

  const handleLogout = () => {
    userLogout().then(() => {
      setCurUser(undefined);
      navigate('/login');
    });
  };

  const renderUser = () => {
    return (
      <Dropdown
        menu={{
          items: [
            {
              key: '1',
              label: (
                <div className={styles.userDropdown} onClick={handleLogout}>
                  <Iconfont code="&#xe6b2;" />
                  {i18n('login.text.logout')}
                </div>
              ),
            },
          ],
        }}
        placement="bottomRight"
        trigger={['click']}
      >
        <div className={styles.userBox}>
          <Iconfont code="&#xe64c;" className={styles.questionIcon} />
        </div>
      </Dropdown>
    );
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
          {/* <Tooltip placement="right" title="个人中心">
            {userInfo?.roleCode !== IRole.DESKTOP ? renderUser() : null}
          </Tooltip> */}
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
