import { useEffect, useState } from 'react';
import { clipboardToArray } from '@/utils';

interface IUsePasteDataRelyData {
  curOperationRowNo: Array<string> | null;
  curOperationCellRange: { colId: string; rowIds: string[] } | null;
  editingCell;
  updateTableData;
}

// 处理粘贴的数据 hooks
const usePasteData = (props: IUsePasteDataRelyData) => {
  const { curOperationRowNo, curOperationCellRange, editingCell, updateTableData } = props;
  const [canPaste, setCanPaste] = useState<boolean>(false);

  // 判断当前是否可以粘贴
  useEffect(() => {
    const handleClick = (event) => {
      const targetElement = event.target as Element;
      if (targetElement.closest('[data-duandb-edit-table-data-can-paste]')) {
        setCanPaste(true);
      } else {
        setCanPaste(false);
      }
    };
    document.addEventListener('click', handleClick);
    document.addEventListener('contextmenu', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('contextmenu', handleClick);
    };
  }, []);

  // 读取剪切板数据，更新表格数据
  useEffect(() => {
    const handleCopy = () => {
      if (curOperationCellRange?.rowIds.length) {
        navigator.clipboard
          .readText()
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
        navigator.clipboard
          .readText()
          .then((text) => {
            const array2D = clipboardToArray(text);
            updateTableData('setRow', array2D[0]);
          })
          .catch((err) => {
            console.error('Failed to read clipboard contents: ', err);
          });
      }
      if (editingCell && editingCell[2] === false) {
        navigator.clipboard
          .readText()
          .then((text) => {
            updateTableData('setCell', text);
          })
          .catch((err) => {
            console.error('Failed to read clipboard contents: ', err);
          });
      }
    };
    if (canPaste) {
      document.addEventListener('paste', handleCopy);
    } else {
      document.removeEventListener('paste', handleCopy);
    }
    return () => {
      document.removeEventListener('paste', handleCopy);
    };
  }, [curOperationRowNo, curOperationCellRange, editingCell, canPaste]);
};

export default usePasteData;
