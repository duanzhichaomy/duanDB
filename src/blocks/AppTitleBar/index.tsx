import React, { memo, useState, useMemo, useEffect } from 'react';
import styles from './index.less';
import classnames from 'classnames';
import { useCommonStore } from '@/store/common';
import Iconfont from '@/components/Iconfont';
import BrandLogo from '@/components/BrandLogo';
import { getPlatform, minimizeWindow, toggleMaximize, closeWindow, isMaximized as checkMaximized } from '@/utils/tauri';

interface IProps {
  className?: string;
}

export default memo<IProps>((props) => {
  const { className } = props;
  const [maximized, setMaximized] = useState(false);

  const { appTitleBarRightComponent } = useCommonStore((state) => {
    return {
      appTitleBarRightComponent: state.appTitleBarRightComponent,
    };
  });

  const isMac = useMemo(() => {
    return getPlatform().isMac;
  }, []);

  useEffect(() => {
    checkMaximized().then(setMaximized);
  }, []);

  const handleDoubleClick = async () => {
    await toggleMaximize();
    setMaximized(!maximized);
  };

  const handelMinimizeWindow = (e) => {
    e.stopPropagation();
    minimizeWindow();
  };

  const handelMaximize = async (e) => {
    e.stopPropagation();
    await toggleMaximize();
    setMaximized(!maximized);
  };

  const handelCloseWindow = (e) => {
    e.stopPropagation();
    closeWindow();
  };

  return (
    <div className={classnames(styles.appTitleBar, className)} onDoubleClick={handleDoubleClick}>
      <div className={styles.appTitleBarGlobal}>
        <div className={classnames(styles.leftSlot)}>
          <BrandLogo size={20} className={styles.brandLogo} />
        </div>
        <div className={styles.appName}>DuanDB</div>
        <div className={styles.rightSlot}>{appTitleBarRightComponent}</div>
      </div>
      {!isMac && (
        <div className={styles.windowsCloseBar}>
          <div className={styles.windowsCloseBarItem} onClick={handelMinimizeWindow}>
            <Iconfont size={13} code="&#xe671;" />
          </div>
          <div className={styles.windowsCloseBarItem} onClick={handelMaximize}>
            {maximized ? <Iconfont size={13} code="&#xe66e;" /> : <Iconfont size={12} code="&#xe66b;" />}
          </div>
          <div className={styles.windowsCloseBarItem} onClick={handelCloseWindow}>
            <Iconfont size={12} code="&#xe66f;" />
          </div>
        </div>
      )}
    </div>
  );
});
