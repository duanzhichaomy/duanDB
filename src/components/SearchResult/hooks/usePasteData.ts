import { RefObject, useEffect } from 'react';
import { clipboardToArray, readClipboardText } from '@/utils';

interface IUsePasteDataRelyData {
  isActive?: boolean;
  tableBoxRef: RefObject<HTMLElement>;
  curOperationRowNo: Array<string> | null;
  curOperationCellRange: { colId: string; rowIds: string[] } | null;
  editingCell;
  updateTableData;
}

// 处理粘贴的数据 hooks
const usePasteData = (props: IUsePasteDataRelyData) => {
  const { isActive, tableBoxRef, curOperationRowNo, curOperationCellRange, editingCell, updateTableData } = props;

  // 读取剪切板数据，更新表格数据
  useEffect(() => {
    const hasPasteTarget =
      !!curOperationCellRange?.rowIds.length || !!curOperationRowNo || !!(editingCell && editingCell[2] === false);
    if (!isActive || !hasPasteTarget) return;

    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      return !!target.closest('input, textarea, [contenteditable="true"], [data-shortcut-recording-input]');
    };

    const isTableEventTarget = (event: Event) => {
      const tableBox = tableBoxRef.current;
      if (!tableBox) return false;
      const target = event.target as Node | null;
      const activeElement = document.activeElement;
      return !!((target && tableBox.contains(target)) || (activeElement && tableBox.contains(activeElement)));
    };

    const shouldHandlePaste = (event: Event) => {
      if (!isTableEventTarget(event)) return false;
      if (isEditableTarget(event.target)) return false;
      return true;
    };

    const updateByClipboard = () => {
      if (curOperationCellRange?.rowIds.length) {
        readClipboardText()
          .then((text) => {
            const array2D = clipboardToArray(text.replace(/\r/g, ''));
            const pastedValues = array2D.map((row) => row[0] ?? null);
            const values =
              array2D.length === 1 && array2D[0]?.length === 1
                ? curOperationCellRange.rowIds.map(() => pastedValues[0])
                : pastedValues.slice(0, curOperationCellRange.rowIds.length);
            updateTableData('setCells', {
              colId: curOperationCellRange.colId,
              rowIds: curOperationCellRange.rowIds,
              values,
            });
          })
          .catch((err) => {
            console.error('Failed to read clipboard contents: ', err);
          });
        return;
      }
      if (curOperationRowNo) {
        readClipboardText()
          .then((text) => {
            const array2D = clipboardToArray(text);
            updateTableData('setRow', array2D[0]);
          })
          .catch((err) => {
            console.error('Failed to read clipboard contents: ', err);
          });
      }
      if (editingCell && editingCell[2] === false) {
        readClipboardText()
          .then((text) => {
            updateTableData('setCell', text);
          })
          .catch((err) => {
            console.error('Failed to read clipboard contents: ', err);
          });
      }
    };

    const handlePaste = (event: ClipboardEvent) => {
      if (!shouldHandlePaste(event)) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      updateByClipboard();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'KeyV' || !(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
      if (!shouldHandlePaste(event)) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      updateByClipboard();
    };

    const handleBeforeInput = (event: InputEvent) => {
      if (event.inputType !== 'insertFromPaste' || !shouldHandlePaste(event)) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      updateByClipboard();
    };

    window.addEventListener('beforeinput', handleBeforeInput, true);
    window.addEventListener('paste', handlePaste, true);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('beforeinput', handleBeforeInput, true);
      window.removeEventListener('paste', handlePaste, true);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isActive, tableBoxRef, curOperationRowNo, curOperationCellRange, editingCell, updateTableData]);
};

export default usePasteData;
