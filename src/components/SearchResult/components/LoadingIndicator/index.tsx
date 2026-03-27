import React, { memo, useEffect, useRef, useState } from 'react';
import { Spin, Button } from 'antd';
import i18n from '@/i18n';
import styles from './index.less';

interface IProps {
  onStop?: () => void;
  rowCount?: number;
}

export default memo<IProps>(({ onStop, rowCount }) => {
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef(Date.now());
  const rafRef = useRef<number>();

  useEffect(() => {
    startTimeRef.current = Date.now();
    const tick = () => {
      setElapsed((Date.now() - startTimeRef.current) / 1000);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className={styles.loadingIndicator}>
      <div className={styles.card}>
        <div className={styles.header}>
          <Spin size="small" />
          <span className={styles.title}>
            {i18n('common.text.fetching')} ({elapsed.toFixed(2)}s)
          </span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>{i18n('common.text.fetchedRows')}</span>
          <span className={styles.rowValue}>{rowCount ?? '—'}</span>
          <Button size="small" onClick={onStop}>
            {i18n('common.button.stop')}
          </Button>
        </div>
      </div>
    </div>
  );
});
