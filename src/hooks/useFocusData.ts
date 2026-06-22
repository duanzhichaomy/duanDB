import { useEffect } from 'react';
import { useCommonStore } from '@/store/common';
import { copy } from '@/utils'
import { setFocusedContent } from '@/store/common/copyFocusedContent';

const serializeFocusedContent = (focusedContent: any[][] | any[] | string) => {
  if (!Array.isArray(focusedContent)) {
    return String(focusedContent);
  }

  if (!Array.isArray(focusedContent[0])) {
    return focusedContent.map((item) => item ?? '').join('\t');
  }

  return (focusedContent as any[][])
    .map((row) => row.map((item) => item ?? '').join('\t'))
    .join('\n');
};

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return !!target.closest('input, textarea, [contenteditable="true"], [data-shortcut-recording-input]');
};

// 如果用户点击的不是可复制的元素，就清空选中的内容
function useCopyFocusData() {
  const { focusedContent } = useCommonStore((state) => {
    return {
      focusedContent: state.focusedContent
    }
  });
  
  // 注册系统 copy 事件复制 focusedContent，避免抢占输入框/编辑器的原生复制。
  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      if (!focusedContent || isEditableTarget(e.target)) return;
      const text = serializeFocusedContent(focusedContent);
      e.preventDefault();
      e.stopPropagation();

      if (e.clipboardData) {
        e.clipboardData.setData('text/plain', text);
        return;
      }

      copy(text);
    };
    document.addEventListener('copy', handleCopy);
    return () => {
      document.removeEventListener('copy', handleCopy);
    };
  }, [focusedContent]);

  useEffect(() => {
    const handleClick = (event) => {
      const targetElement = event.target  as Element;
      if (!targetElement.closest('[data-duandb-general-can-copy-element]')) {
        setFocusedContent(null)
      }
    };
    document.addEventListener('click', handleClick);
    document.addEventListener('contextmenu', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('contextmenu', handleClick);
    };
  }, [focusedContent]);
}

export default useCopyFocusData;
