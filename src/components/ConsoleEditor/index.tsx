import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useImperativeHandle,
  ForwardedRef,
  forwardRef,
  createContext,
} from 'react';
import { Modal, Input } from 'antd';
import MonacoEditor, { IEditorOptions, IExportRefFunction, IRangeType } from '../MonacoEditor';
import { v4 as uuidv4 } from 'uuid';
import { IBoundInfo } from '@/typings';
import OperationLine from './components/OperationLine';
import SelectBoundInfo from './components/SelectBoundInfo';
import i18n from '@/i18n';
import styles from './index.less';

// ----- hooks -----
import { useSaveEditorData } from './hooks/useSaveEditorData';

// ----- function -----
import { handelCreateConsole } from '@/pages/main/workspace/functions/shortcutKeyCreateConsole';

export type IAppendValue = {
  text: any;
  range?: IRangeType;
};

interface IProps {
  /** 调用来源 */
  source?: 'workspace';
  isActive: boolean;
  /** 添加或修改的内容 */
  appendValue?: IAppendValue;
  defaultValue?: string;
  /** 是否开启AI输入 */
  hasAiChat?: boolean;
  /** 是否可以开启SQL转到自然语言的相关ai操作 */
  hasAi2Lang?: boolean;
  /** 是否有 */
  hasSaveBtn?: boolean;
  value?: string;
  boundInfo: IBoundInfo;
  setBoundInfo: (params: IBoundInfo) => void;
  editorOptions?: IEditorOptions;
  onExecuteSQL: (sql: string) => void;
}

export interface IConsoleRef {
  editorRef: IExportRefFunction | undefined;
}

interface IIntelligentEditorContext {
  isActive: boolean;
  tableNameList: string[];
  setTableNameList: (tables: string[]) => void;
  selectedTables: string[];
  setSelectedTables: (tables: string[]) => void;
}

export const IntelligentEditorContext = createContext<IIntelligentEditorContext>({} as any);

function ConsoleEditor(props: IProps, ref: ForwardedRef<IConsoleRef>) {
  const {
    boundInfo,
    setBoundInfo,
    appendValue,
    hasSaveBtn = true,
    source,
    defaultValue,
    isActive,
  } = props;
  const uid = useMemo(() => uuidv4(), []);
  const editorRef = useRef<IExportRefFunction>();
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [tableNameList, setTableNameList] = useState<string[]>([]);

  const {
    saveConsole,
    saveNameModalOpen,
    saveName,
    setSaveName,
    handleSaveNameConfirm,
    handleSaveNameCancel,
  } = useSaveEditorData({
    editorRef,
    isActive,
    boundInfo: props.boundInfo,
    source,
    defaultValue,
  });

  useEffect(() => {
    if (appendValue) {
      editorRef?.current?.setValue(appendValue.text, appendValue.range);
    }
  }, [appendValue]);

  useImperativeHandle(
    ref,
    () => ({
      editorRef: editorRef?.current,
    }),
    [editorRef?.current],
  );

  const executeSQL = (sql?: string) => {
    const sqlContent = sql || editorRef?.current?.getCurrentSelectContent() || editorRef?.current?.getAllContent();

    if (!sqlContent) {
      return;
    }
    props.onExecuteSQL && props.onExecuteSQL(sqlContent);
  };

  // 注册快捷键
  const registerShortcutKey = (editor, monaco) => {
    // 保存
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      const value = editor?.getValue();
      saveConsole(value || '');
    });

    // 执行
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyR, () => {
      const value = editorRef.current?.getCurrentSelectContent();
      executeSQL(value);
    });

    // 新建console
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyL, () => {
      handelCreateConsole();
    });
  };

  return (
    <IntelligentEditorContext.Provider
      value={{
        isActive,
        tableNameList,
        setTableNameList,
        selectedTables,
        setSelectedTables,
      }}
    >
      <div className={styles.console} ref={ref as any}>
        <div className={styles.topToolbar}>
          <OperationLine
            saveConsole={saveConsole}
            executeSQL={executeSQL}
            editorRef={editorRef}
            hasSaveBtn={hasSaveBtn}
            boundInfo={boundInfo}
          />
          <SelectBoundInfo setBoundInfo={setBoundInfo} boundInfo={boundInfo} />
        </div>
        <MonacoEditor
          id={uid}
          defaultValue={defaultValue}
          ref={editorRef as any}
          className={styles.consoleEditor}
          options={props.editorOptions}
          shortcutKey={registerShortcutKey}
          isActive={isActive}
        />
        <Modal
          title={i18n('common.tips.saveName')}
          open={saveNameModalOpen}
          onOk={handleSaveNameConfirm}
          onCancel={handleSaveNameCancel}
          destroyOnClose
        >
          <Input
            placeholder={i18n('common.tips.saveNamePlaceholder')}
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onPressEnter={handleSaveNameConfirm}
            autoFocus
          />
        </Modal>
      </div>
    </IntelligentEditorContext.Provider>
  );
}

export default forwardRef(ConsoleEditor);
