import React, { memo, useEffect, useRef, useState } from 'react';
import { Tooltip } from 'antd';
import { message } from '@/utils/globalMessage';
import classnames from 'classnames';
import i18n from '@/i18n';
import { copy } from '@/utils';
import styles from './index.less';

interface IProps {
  className?: string;
  description?: string;
  duration?: number;
  dataLength?: number;
  sql?: string;
}

export default memo<IProps>((props) => {
  const { className, description, duration, dataLength, sql } = props;
  const barRef = useRef<HTMLDivElement>(null);
  const [tooltipMaxWidth, setTooltipMaxWidth] = useState<number>(480);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const update = () => {
      // 取状态栏宽度的一半作为 tooltip 最大宽度；超出才折行
      setTooltipMaxWidth(Math.max(240, Math.floor(el.clientWidth / 2)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleCopySql = () => {
    if (!sql) return;
    copy(sql);
    message.success(i18n('common.button.copySuccessfully'));
  };

  return (
    <div ref={barRef} className={classnames(styles.statusBar, className)}>
      <span>{`【${i18n('common.text.result')}】${description}.`}</span>
      <span>{`【${i18n('common.text.timeConsuming')}】${duration}ms.`}</span>
      {!!dataLength && <span>{`【${i18n('common.text.searchRow')}】${dataLength} ${i18n('common.text.row')}.`}</span>}
      {sql && (
        <Tooltip
          title={sql}
          placement="topRight"
          overlayStyle={{ maxWidth: tooltipMaxWidth }}
          overlayInnerStyle={{ maxWidth: tooltipMaxWidth, wordBreak: 'break-all', whiteSpace: 'normal' }}
        >
          <span className={styles.sqlSegment} onClick={handleCopySql}>
            {`【SQL】${sql}`}
          </span>
        </Tooltip>
      )}
    </div>
  );
});
