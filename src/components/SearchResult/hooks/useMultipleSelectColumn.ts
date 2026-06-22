import { useCallback, useEffect, useRef, useState } from 'react';

// 多选列 hook，逻辑与 useMultipleSelect 对齐，仅把"行"换成"列"
const useMultipleSelectColumn = (props: {
  curOperationColIds: Array<string> | null;
  setCurOperationColIds: (colIds: Array<string> | null) => void;
  columnOrder: Array<string>;
  getColumnData: (colIds: Array<string>) => Array<Array<string | null>>;
  setFocusedContent: (content: any[][]) => void;
}) => {
  const { curOperationColIds, setCurOperationColIds, columnOrder, getColumnData, setFocusedContent } = props;
  const isShiftDownRef = useRef<boolean>(false);
  const isCmdDownRef = useRef<boolean>(false);
  const [firstColId, setFirstColId] = useState<string | null>(null);

  useEffect(() => {
    if (!curOperationColIds) {
      setFirstColId(null);
    }
  }, [curOperationColIds]);

  useEffect(() => {
    const resetModifierState = () => {
      isShiftDownRef.current = false;
      isCmdDownRef.current = false;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Shift' || event.shiftKey) {
        isShiftDownRef.current = true;
      }
      if (event.key === 'Meta' || event.key === 'Control' || event.metaKey || event.ctrlKey) {
        isCmdDownRef.current = true;
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Shift' || !event.shiftKey) {
        isShiftDownRef.current = false;
      }
      if (event.key === 'Meta' || event.key === 'Control' || (!event.metaKey && !event.ctrlKey)) {
        isCmdDownRef.current = false;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', resetModifierState);
    document.addEventListener('visibilitychange', resetModifierState);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', resetModifierState);
      document.removeEventListener('visibilitychange', resetModifierState);
    };
  }, []);

  const pushFocused = (colIds: Array<string>) => {
    if (!colIds.length) return;
    setFocusedContent(getColumnData(colIds));
  };

  const multipleSelectColumn = useCallback(
    (newColId: string | null) => {
      if (newColId === null) {
        setCurOperationColIds(null);
        return;
      }

      if (isShiftDownRef.current && firstColId) {
        const firstIdx = columnOrder.indexOf(firstColId);
        const newIdx = columnOrder.indexOf(newColId);
        if (firstIdx < 0 || newIdx < 0) {
          setFirstColId(newColId);
          setCurOperationColIds([newColId]);
          pushFocused([newColId]);
          return;
        }
        const [from, to] = firstIdx < newIdx ? [firstIdx, newIdx] : [newIdx, firstIdx];
        const slice = columnOrder.slice(from, to + 1);
        setCurOperationColIds(slice);
        pushFocused(slice);
        return;
      }

      if (isCmdDownRef.current) {
        if (curOperationColIds) {
          if (curOperationColIds.includes(newColId)) {
            const next = curOperationColIds.filter((c) => c !== newColId);
            setCurOperationColIds(next.length ? next : null);
            if (next.length) pushFocused(next);
            return;
          }
          const next = [...curOperationColIds, newColId];
          setCurOperationColIds(next);
          pushFocused(next);
          return;
        }
        setCurOperationColIds([newColId]);
        pushFocused([newColId]);
        return;
      }

      setFirstColId(newColId);
      setCurOperationColIds([newColId]);
      pushFocused([newColId]);
    },
    [firstColId, curOperationColIds, columnOrder, getColumnData],
  );

  return {
    multipleSelectColumn,
  };
};

export default useMultipleSelectColumn;
