import React, { memo, useCallback, useMemo, ForwardedRef, forwardRef, useImperativeHandle, useRef } from 'react';
import styles from './index.less';
import classnames from 'classnames';
import MonacoEditor, { IExportRefFunction } from '@/components/MonacoEditor';
import { v4 as uuid } from 'uuid';

interface IProps {
  className?: string;
  handelEnter?: (value: string) => void;
  focusChange?: (isActive: boolean) => void;
  ref: any; // ref不是写在这里吧？？？
}

export interface ISingleFileMonacoEditorRefFunction {
  getAllContent?: () => string;
  setValue?: (text: string) => void;
}

const options = {
  lineNumbers: false,
  renderLineHighlight: 'none',
  scrollBeyondLastLine: false,
  wordWrap: 'off',
  minimap: {
    enabled: false,
  },
  // 不显示滚动条
  scrollbar: {
    vertical: 'hidden',
    horizontal: 'hidden',
  },
  overviewRulerBorder: false,
  glyphMargin: false,
  folding: false,
  lineDecorationsWidth: 0, // 行号宽度
  lineNumbersMinChars: 0, // 行号最小宽度
};

const SingleFileMonacoEditor = memo<IProps>(
  forwardRef((props, ref: ForwardedRef<ISingleFileMonacoEditorRefFunction>) => {
    const { className, handelEnter, focusChange } = props;
    const editorRef = useRef<any>(null);
    const monacoEditorRef = useRef<IExportRefFunction>(null);

    const editorId = useMemo(() => {
      return uuid();
    }, []);

    // 用 Monaco 自身的 addCommand 拦截 Enter，避免插入换行
    const registerShortcutKey = useCallback((_editor, _monaco) => {
      editorRef.current = _editor;

      // 补全建议可见时，Enter 选中当前建议
      _editor.addAction({
        id: 'singleFileAcceptSuggestion',
        label: 'Accept Suggestion',
        keybindings: [_monaco.KeyCode.Enter],
        precondition: 'suggestWidgetVisible',
        run: (ed: any) => {
          ed.trigger('keyboard', 'acceptSelectedSuggestion', {});
        },
      });

      // 补全建议不可见时，Enter 触发原有逻辑
      _editor.addAction({
        id: 'singleFileEnter',
        label: 'Confirm Enter',
        keybindings: [_monaco.KeyCode.Enter],
        precondition: '!suggestWidgetVisible',
        run: () => {
          const value = monacoEditorRef.current?.getAllContent().trim() || '';
          handelEnter?.(value);
        },
      });
    }, [handelEnter]);

    const getAllContent = () => {
      return monacoEditorRef.current?.getAllContent() || '';
    };

    const setValue = (text: string) => {
      monacoEditorRef.current?.setValue(text, 'reset');
    };

    useImperativeHandle(ref, () => ({
      getAllContent,
      setValue,
    }));

    return (
      <div ref={ref as any} className={classnames(styles.singleFileMonacoEditor, className)}>
        <MonacoEditor
          ref={monacoEditorRef}
          id={editorId}
          options={options as any}
          shortcutKey={registerShortcutKey}
          focusChange={focusChange}
        />
      </div>
    );
  }),
);

export default SingleFileMonacoEditor;
