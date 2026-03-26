import React, { useEffect, useState } from 'react';
import cs from 'classnames';
import { InputNumber, Select } from 'antd';
import { IResultConfig } from '@/typings';
import _ from 'lodash';
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

  return (
    <div className={styles.paginationWrapper}>
      <span
        className={cs(styles['item-icon'], {
          [styles['item-icon-disabled']]: handleIsDisabled('first'),
        })}
        onClick={() => handleClickIcon('first')}
      >
        «
      </span>
      <span
        className={cs(styles['item-icon'], {
          [styles['item-icon-disabled']]: handleIsDisabled('pre'),
        })}
        onClick={() => handleClickIcon('pre')}
      >
        ‹
      </span>
      <InputNumber
        className={styles['input-number']}
        size="small"
        min={1}
        value={inputValue}
        controls={false}
        onPressEnter={onInputNumberBlur}
        onBlur={onInputNumberBlur}
        onChange={onInputNumberChange}
      />
      <span
        className={cs(styles['item-icon'], {
          [styles['item-icon-disabled']]: handleIsDisabled('next'),
        })}
        onClick={() => handleClickIcon('next')}
      >
        ›
      </span>
      <span
        className={cs(styles['item-icon'], {
          [styles['item-icon-disabled']]: lastLoading || handleIsDisabled('last'),
        })}
        onClick={() => handleClickIcon('last')}
      >
        »
      </span>

      <Select
        popupMatchSelectWidth={false}
        size="small"
        value={paginationConfig?.pageSize ?? 200}
        onChange={onPageSizeChange}
        options={[
          { label: 10, value: 10 },
          { label: 50, value: 50 },
          { label: 100, value: 100 },
          { label: 200, value: 200 },
          { label: 500, value: 500 },
          { label: 1000, value: 1000 },
        ]}
      />
    </div>
  );
}
