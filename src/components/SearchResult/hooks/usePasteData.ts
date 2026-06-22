import { useEffect } from 'react';
import { clipboardToArray, readClipboardText } from '@/utils';

interface IUsePasteDataRelyData {
  curOperationRowNo: Array<string> | null;
  curOperationCellRange: { colId: string; rowIds: string[] } | null;
  editingCell;
  updateTableData;
}

// 处理粘贴的数据 hooks
const usePasteData = (props: IUsePasteDataRelyData) => {
  const { curOperationRowNo, curOperationCellRange, editingCell, updateTableData } = props;

  // 读取剪切板数据，更新表格数据
  useEffect(() => {
    const hasPasteTarget =
      !!curOperationCellRange?.rowIds.length || !!curOperationRowNo || !!(editingCell && editingCell[2] === false);

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
      if (!hasPasteTarget) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      updateByClipboard();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'KeyV' || !(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
      if (!hasPasteTarget) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      updateByClipboard();
    };

    const handleBeforeInput = (event: InputEvent) => {
      if (!hasPasteTarget || event.inputType !== 'insertFromPaste') return;
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
  }, [curOperationRowNo, curOperationCellRange, editingCell, updateTableData]);
};

export default usePasteData;
