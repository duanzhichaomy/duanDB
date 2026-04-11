import React, { useEffect, useState } from 'react';
import cs from 'classnames';
import { InputNumber, Select } from 'antd';
import { IResultConfig } from '@/typings';
import _ from 'lodash';
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import styles from './index.less';

interface IProps {
  onPageSizeChange?: (pageSize: number) => void;
  onPageNoChange?: (pageNo: number) => void;
  onClickTotalBtn?: () => Promise<number | undefined>;
  paginationConfig: IResultConfig;
}
type IIconType = 'pre' | 'next' | 'first' | 'last';
export default function Pagination(props: IProps) {
  const { onPageNoChange, onPageSizeChange, paginationConfig } = props;
  const [inputValue, setInputValue] = useState<number | null>(1);
  const [lastLoading, setLastLoading] = useState(false);

  useEffect(() => {
    setInputValue(paginationConfig?.pageNo ?? 1);
  }, [paginationConfig?.pageNo]);

  const onInputNumberChange = (value: number | null) => {
    setInputValue(value);
  };

  const onInputNumberBlur = () => {
    if (_.isNumber(inputValue)) {
      onPageNoChange && onPageNoChange(inputValue);
    } else {
      setInputValue(1);
      onPageNoChange && onPageNoChange(1);
    }
  };

  const handleClickIcon = async (type: IIconType) => {
    if (!onPageNoChange || !paginationConfig) return;
    if (handleIsDisabled(type)) return;
    switch (type) {
      case 'first':
        onPageNoChange(1);
        break;
      case 'last':
        if (!props.onClickTotalBtn) return;
        setLastLoading(true);
        try {
          const total = await props.onClickTotalBtn();
          const { pageSize } = paginationConfig || {};
          if (_.isNumber(total) && _.isNumber(pageSize)) {
            onPageNoChange(Math.ceil(total / pageSize));
          }
        } finally {
          setLastLoading(false);
        }
        break;
      case 'pre':
        onPageNoChange(paginationConfig?.pageNo - 1);
        break;
      case 'next':
        onPageNoChange(paginationConfig?.pageNo + 1);
        break;
      default:
        break;
    }
  };

  const handleIsDisabled = (type: IIconType) => {
    if (!paginationConfig) {
      return false;
    }
    if (type === 'first' || type === 'pre') {
      return paginationConfig?.pageNo === 1;
    }

    const isNumber = _.isNumber(paginationConfig.total);
    const totalShow = paginationConfig.pageNo * paginationConfig.pageSize;
    if (type === 'next' || type === 'last') {
      if (isNumber) {
        return totalShow > (paginationConfig.total as number);
      }
      return !paginationConfig?.hasNextPage;
    }

    return true;
  };

  // 计算总数显示
  const totalDisplay = (() => {
    const { total } = paginationConfig;
    if (total === 0 || total === undefined || total === null) return null;
    return String(total);
  })();

  return (
    <div className={styles.paginationWrapper}>
      <div className={styles.navGroup}>
        <span
          className={cs(styles.navBtn, { [styles.navBtnDisabled]: handleIsDisabled('first') })}
          onClick={() => handleClickIcon('first')}
        >
          <ChevronsLeft size={14} strokeWidth={1.5} />
        </span>
        <span
          className={cs(styles.navBtn, { [styles.navBtnDisabled]: handleIsDisabled('pre') })}
          onClick={() => handleClickIcon('pre')}
        >
          <ChevronLeft size={14} strokeWidth={1.5} />
        </span>
        <InputNumber
          className={styles.pageInput}
          size="small"
          min={1}
          value={inputValue}
          controls={false}
          onPressEnter={onInputNumberBlur}
          onBlur={onInputNumberBlur}
          onChange={onInputNumberChange}
        />
        <span
          className={cs(styles.navBtn, { [styles.navBtnDisabled]: handleIsDisabled('next') })}
          onClick={() => handleClickIcon('next')}
        >
          <ChevronRight size={14} strokeWidth={1.5} />
        </span>
        <span
          className={cs(styles.navBtn, { [styles.navBtnDisabled]: lastLoading || handleIsDisabled('last') })}
          onClick={() => handleClickIcon('last')}
        >
          <ChevronsRight size={14} strokeWidth={1.5} />
        </span>
      </div>

      <div className={styles.sizeGroup}>
        <Select
          className={styles.sizeSelect}
          popupMatchSelectWidth={false}
          size="small"
          variant="borderless"
          value={paginationConfig?.pageSize ?? 200}
          onChange={onPageSizeChange}
          options={[
            { label: '10', value: 10 },
            { label: '50', value: 50 },
            { label: '100', value: 100 },
            { label: '200', value: 200 },
            { label: '500', value: 500 },
            { label: '1000', value: 1000 },
          ]}
        />
        {totalDisplay && <span className={styles.totalLabel}>{totalDisplay} rows</span>}
      </div>
    </div>
  );
}
